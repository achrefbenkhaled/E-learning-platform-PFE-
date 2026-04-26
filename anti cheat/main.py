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

mp_face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)
mp_face_detection = mp.solutions.face_detection.FaceDetection()
yolo_model = YOLO("yolov8n.pt")

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

state_lock = threading.Lock()
latest_jpeg = None
last_error = None
running = True

away_count = 0
phone_detected_count = 0
unauthorized_person_detected_count = 0
no_person_detected_count = 0
total_frames = 0
calibrated_pitch = 0
calibrated_yaw = 0
start_session_time = None
current_session = None  # Stores the active session code

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


def detect_multiple_faces(detections):
    return len(detections) > 1


def open_camera_with_fallback():
    for idx in [0, 1, 2]:
        cam = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cam.isOpened():
            print(f"[CAMERA] Opened camera index {idx} with CAP_DSHOW")
            return cam
        cam.release()
    for idx in [0, 1, 2]:
        cam = cv2.VideoCapture(idx)
        if cam.isOpened():
            print(f"[CAMERA] Opened camera index {idx} with default backend")
            return cam
        cam.release()
    return None


def write_summary(duration_sec):
    safe_total_frames = max(1, total_frames)
    away_pct = away_count / safe_total_frames * 100
    phone_pct = phone_detected_count / safe_total_frames * 100
    unauth_pct = unauthorized_person_detected_count / safe_total_frames * 100
    no_person_pct = no_person_detected_count / safe_total_frames * 100

    print("\n=== SESSION SUMMARY ===")
    print(f"Total Duration: {duration_sec} seconds")
    print(f"Looking Away: {away_pct:.2f}%")
    print(f"Phone Detection: {phone_pct:.2f}%")
    print(f"Unauthorized Person Detection: {unauth_pct:.2f}%")
    print(f"No Person Detection: {no_person_pct:.2f}%")
    print(f"Looking Away Count: {away_count}")
    print(f"Phone Detection Count: {phone_detected_count}")
    print(f"Multiple Person Count: {unauthorized_person_detected_count}")
    print(f"No Person Count: {no_person_detected_count}")

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
    global latest_jpeg, last_error, running
    global away_count, phone_detected_count, unauthorized_person_detected_count, no_person_detected_count
    global total_frames, calibrated_pitch, calibrated_yaw, start_session_time

    cap = open_camera_with_fallback()
    if cap is None or not cap.isOpened():
        last_error = "Camera not found. Check camera permissions, close apps using camera, and ensure webcam is connected."
        print(f"[ERROR] {last_error}")
        write_summary(0)
        running = False
        return

    calibration_frames = []
    calib_start = time.time()
    while time.time() - calib_start < 3 and running:
        ret, frame = cap.read()
        if not ret:
            continue
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mesh = mp_face_mesh.process(rgb)
        if mesh.multi_face_landmarks:
            lm = mesh.multi_face_landmarks[0].landmark
            angles = estimate_head_pose(lm, w, h)
            if angles:
                pitch, yaw, _ = angles
                calibration_frames.append((pitch, yaw))

    if calibration_frames:
        calibrated_pitch = np.mean([p[0] for p in calibration_frames])
        calibrated_yaw = np.mean([p[1] for p in calibration_frames])

    start_session_time = time.time()
    while running and cap.isOpened():
        if stop_file and os.path.exists(stop_file):
            break
        ret, frame = cap.read()
        if not ret:
            continue

        total_frames += 1
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mesh = mp_face_mesh.process(rgb)
        face_detection = mp_face_detection.process(rgb)
        phone_detected = False
        has_face = bool(face_detection.detections)

        if mesh.multi_face_landmarks:
            lm = mesh.multi_face_landmarks[0].landmark
            angles = estimate_head_pose(lm, w, h)
            if angles:
                pitch, yaw, _ = angles
                if is_looking_away(pitch, yaw):
                    away_count += 1
                    cv2.putText(frame, "LOOKING AWAY!", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        if face_detection.detections and detect_multiple_faces(face_detection.detections):
            unauthorized_person_detected_count += 1
            cv2.putText(frame, "MULTIPLE PEOPLE DETECTED!", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        elif not has_face:
            no_person_detected_count += 1
            cv2.putText(frame, "NO PERSON DETECTED!", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 165, 255), 2)

        yolo_results = yolo_model(frame, stream=True, verbose=False)
        for result in yolo_results:
            for box in result.boxes:
                cls = result.names[int(box.cls[0])]
                if cls in ["cell phone", "book"]:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    phone_detected = cls == "cell phone"

        if phone_detected:
            phone_detected_count += 1
            cv2.putText(frame, "PHONE DETECTED!", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        cv2.putText(frame, "Keep your face centered and avoid looking away.", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        ok, jpg = cv2.imencode(".jpg", frame)
        if ok:
            data = jpg.tobytes()
            with state_lock:
                latest_jpeg = data
            if frame_path:
                try:
                    with open(frame_path, "wb") as f:
                        f.write(data)
                except Exception:
                    pass

    cap.release()
    duration = int(time.time() - start_session_time) if start_session_time else 0
    write_summary(duration)
    running = False


@app.get("/")
def index():
    return "<h2>Proctor Web App</h2><p>Live stream: <a href='/video_feed'>/video_feed</a></p><p>Stats JSON: <a href='/stats'>/stats</a></p>"


@app.get("/status")
def status():
    """Web app checks this to see if the desktop proctor is running."""
    return jsonify({"status": "ACTIVE", "running": running})


@app.post("/start-session")
def start_session():
    """Web app sends the session code here when the exam starts."""
    global current_session
    try:
        from flask import request
        data = request.json
        current_session = data.get("session_code")
        print(f"[SESSION] Started session: {current_session}")
        return jsonify({"ok": True, "session": current_session})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.get("/verify")
def verify():
    """Verify if the proctoring is still healthy and the session matches."""
    safe_total_frames = max(1, total_frames)
    return jsonify({
        "active": running and (last_error is None),
        "session_code": current_session,
        "violations": {
            "away": away_count / safe_total_frames > 0.15,
            "phone": phone_detected_count > 0,
            "multiple_people": unauthorized_person_detected_count > 0
        }
    })


@app.get("/stats")
def stats():
    safe_total_frames = max(1, total_frames)
    return jsonify(
        {
            "running": running,
            "error": last_error,
            "duration_seconds": int(time.time() - start_session_time) if start_session_time else 0,
            "total_frames": total_frames,
            "looking_away_percent": away_count / safe_total_frames * 100,
            "phone_detection_percent": phone_detected_count / safe_total_frames * 100,
            "unauthorized_person_percent": unauthorized_person_detected_count / safe_total_frames * 100,
            "no_person_percent": no_person_detected_count / safe_total_frames * 100,
            "away_count": away_count,
            "phone_detected_count": phone_detected_count,
            "unauthorized_person_detected_count": unauthorized_person_detected_count,
            "no_person_detected_count": no_person_detected_count,
        }
    )


def frame_generator():
    while True:
        with state_lock:
            frame = latest_jpeg
        if frame is None:
            time.sleep(0.05)
            continue
        yield b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"


@app.get("/video_feed")
def video_feed():
    return Response(frame_generator(), mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    t = threading.Thread(target=monitor_loop, daemon=True)
    t.start()
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
