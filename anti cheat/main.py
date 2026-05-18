import json
import os
import threading
import time

import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response, jsonify
from ultralytics import YOLO

HOST = os.getenv("PROCTOR_HOST", "127.0.0.1")
PORT = int(os.getenv("PROCTOR_PORT", "5050"))
summary_path = os.getenv("PROCTOR_SUMMARY_PATH", "").strip()
stop_file = os.getenv("PROCTOR_STOP_FILE", "").strip()
frame_path = os.getenv("PROCTOR_FRAME_PATH", "").strip()

# Global state
state_lock = threading.Lock()
latest_jpeg = None
last_error = None
running = True
initialized = False

away_count = 0
phone_detected_count = 0
unauthorized_person_detected_count = 0
no_person_detected_count = 0
total_frames = 0
calibrated_pitch = 0
calibrated_yaw = 0
start_session_time = None
current_session = None

# Model placeholders (initialized in thread)
mp_face_mesh = None
mp_face_detection = None
yolo_model = None

model_points = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0),
    ],
    dtype=np.float64,
)
MAX_YAW_OFFSET = 110 * 1.35
MAX_PITCH_OFFSET = 140 * 1.35

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


def estimate_head_pose(landmarks, width, height):
    image_points = np.array(
        [
            (landmarks[1].x * width, landmarks[1].y * height),
            (landmarks[152].x * width, landmarks[152].y * height),
            (landmarks[33].x * width, landmarks[33].y * height),
            (landmarks[263].x * width, landmarks[263].y * height),
            (landmarks[61].x * width, landmarks[61].y * height),
            (landmarks[291].x * width, landmarks[291].y * height),
        ],
        dtype=np.float64,
    )
    focal_length = width
    camera_matrix = np.array(
        [[focal_length, 0, width / 2], [0, focal_length, height / 2], [0, 0, 1]],
        dtype=np.float64,
    )
    success, rotation_vector, _ = cv2.solvePnP(
        model_points, image_points, camera_matrix, np.zeros((4, 1))
    )
    if not success:
        return None
    rmat, _ = cv2.Rodrigues(rotation_vector)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
    return angles


def is_looking_away(pitch, yaw):
    return abs(pitch - calibrated_pitch) > MAX_PITCH_OFFSET or abs(yaw - calibrated_yaw) > MAX_YAW_OFFSET


def open_camera_with_fallback():
    # Try common indices with CAP_DSHOW for faster startup on Windows
    for idx in [0, 1, 2]:
        cam = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cam.isOpened():
            cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cam.set(cv2.CAP_PROP_FPS, 30)
            print(f"[CAMERA] Opened index {idx} (DSHOW)")
            return cam
        cam.release()
    # Fallback to default
    for idx in [0, 1]:
        cam = cv2.VideoCapture(idx)
        if cam.isOpened():
            print(f"[CAMERA] Opened index {idx} (Default)")
            return cam
        cam.release()
    return None


def write_summary(duration_sec):
    safe_total_frames = max(1, total_frames)
    away_pct = (away_count / safe_total_frames) * 100
    phone_pct = (phone_detected_count / safe_total_frames) * 100
    unauth_pct = (unauthorized_person_detected_count / safe_total_frames) * 100
    no_person_pct = (no_person_detected_count / safe_total_frames) * 100

    if summary_path:
        try:
            with open(summary_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "duration_seconds": duration_sec,
                        "session_code": current_session,
                        "total_frames": total_frames,
                        "looking_away_percent": away_pct,
                        "phone_detection_percent": phone_pct,
                        "unauthorized_person_percent": unauth_pct,
                        "no_person_percent": no_person_pct,
                        "away_count": away_count,
                        "phone_detected_count": phone_detected_count,
                        "unauthorized_person_detected_count": unauthorized_person_detected_count,
                        "no_person_detected_count": no_person_detected_count,
                        "error": last_error,
                    },
                    f,
                )
        except Exception:
            pass


def monitor_loop():
    global latest_jpeg, last_error, running, initialized
    global away_count, phone_detected_count, unauthorized_person_detected_count, no_person_detected_count
    global total_frames, calibrated_pitch, calibrated_yaw, start_session_time
    global mp_face_mesh, mp_face_detection, yolo_model

    print("[SYSTEM] Initializing Models...")
    try:
        mp_face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)
        mp_face_detection = mp.solutions.face_detection.FaceDetection()
        yolo_model = YOLO("yolov8n.pt")
        initialized = True
        print("[SYSTEM] Models loaded successfully.")
    except Exception as e:
        last_error = f"Model initialization failed: {str(e)}"
        print(f"[ERROR] {last_error}")
        running = False
        return

    cap = open_camera_with_fallback()
    if cap is None or not cap.isOpened():
        last_error = "Camera not found. Check permissions or connection."
        print(f"[ERROR] {last_error}")
        running = False
        return

    # Calibration
    calibration_frames = []
    calib_start = time.time()
    while time.time() - calib_start < 2 and running:
        ret, frame = cap.read()
        if not ret: continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = mp_face_mesh.process(rgb)
        if res.multi_face_landmarks:
            lm = res.multi_face_landmarks[0].landmark
            angles = estimate_head_pose(lm, frame.shape[1], frame.shape[0])
            if angles: calibration_frames.append((angles[0], angles[1]))

    if calibration_frames:
        calibrated_pitch = np.mean([p[0] for p in calibration_frames])
        calibrated_yaw = np.mean([p[1] for p in calibration_frames])

    start_session_time = time.time()
    frame_idx = 0
    
    # YOLO only every N frames to save CPU
    YOLO_SKIP = 10 
    phone_detected_this_cycle = False

    while running and cap.isOpened():
        if stop_file and os.path.exists(stop_file): break
        
        ret, frame = cap.read()
        if not ret: continue
        
        frame_idx += 1
        total_frames += 1
        
        # Optimization: Resize for processing
        h, w = frame.shape[:2]
        small_frame = cv2.resize(frame, (320, 240))
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # 1. Face/Mesh detection (every frame is fine for Mediapipe)
        mesh_res = mp_face_mesh.process(rgb_small)
        det_res = mp_face_detection.process(rgb_small)
        
        has_face = bool(det_res.detections)
        
        # Pose analysis
        if mesh_res.multi_face_landmarks:
            lm = mesh_res.multi_face_landmarks[0].landmark
            angles = estimate_head_pose(lm, 320, 240)
            if angles and is_looking_away(angles[0], angles[1]):
                away_count += 1
                cv2.putText(frame, "LOOKING AWAY!", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Multiple people / No person
        if det_res.detections and len(det_res.detections) > 1:
            unauthorized_person_detected_count += 1
            cv2.putText(frame, "MULTIPLE PEOPLE!", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        elif not has_face:
            no_person_detected_count += 1
            cv2.putText(frame, "NO FACE DETECTED!", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)

        # 2. YOLO Object Detection (Heavy - Skip Frames)
        if frame_idx % YOLO_SKIP == 0:
            phone_detected_this_cycle = False
            yolo_results = yolo_model(small_frame, stream=True, verbose=False)
            for result in yolo_results:
                for box in result.boxes:
                    cls = result.names[int(box.cls[0])]
                    if cls in ["cell phone", "book"]:
                        phone_detected_this_cycle = True
                        break
        
        if phone_detected_this_cycle:
            phone_detected_count += 1
            cv2.putText(frame, "PHONE DETECTED!", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Encoding for live view
        ok, jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if ok:
            data = jpg.tobytes()
            with state_lock:
                latest_jpeg = data
            if frame_path and frame_idx % 5 == 0: # Save to file less frequently
                try:
                    with open(frame_path, "wb") as f: f.write(data)
                except: pass

    cap.release()
    write_summary(int(time.time() - start_session_time) if start_session_time else 0)
    running = False


@app.get("/status")
def status():
    return jsonify({"status": "ACTIVE", "running": running, "initialized": initialized})


@app.post("/start-session")
def start_session():
    global current_session
    try:
        from flask import request
        data = request.json
        current_session = data.get("session_code")
        return jsonify({"ok": True, "session": current_session})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.get("/stats")
def stats():
    safe_total_frames = max(1, total_frames)
    return jsonify({
        "running": running,
        "initialized": initialized,
        "error": last_error,
        "duration": int(time.time() - start_session_time) if start_session_time else 0,
        "looking_away_pct": (away_count / safe_total_frames) * 100,
        "phone_detected_pct": (phone_detected_count / safe_total_frames) * 100,
        "unauthorized_pct": (unauthorized_person_detected_count / safe_total_frames) * 100,
        "no_person_pct": (no_person_detected_count / safe_total_frames) * 100,
    })


def frame_generator():
    while True:
        with state_lock:
            frame = latest_jpeg
        if frame is None:
            time.sleep(0.1)
            continue
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"


@app.get("/video_feed")
def video_feed():
    return Response(frame_generator(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.get("/")
def index():
    return "Proctor Active"


if __name__ == "__main__":
    t = threading.Thread(target=monitor_loop, daemon=True)
    t.start()
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
