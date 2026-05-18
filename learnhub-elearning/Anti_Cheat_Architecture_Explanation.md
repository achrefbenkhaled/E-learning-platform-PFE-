# Anti-Cheat Architecture & Workflow Explanation

The Anti-Cheat system is a complex, multi-component architecture designed to create an inescapable, securely monitored exam environment. It acts as a bridge between the web platform and the user's local operating system.

Here is a full breakdown of how the components connect and what every major file does.

---

## 1. The Components

The system relies on four main pieces working together:
1. **The Standard Web App (React + Main Node.js Backend)**
2. **The Helper Backend (`express-backend`)**
3. **The Secure Desktop Client (`wpf-app`)**
4. **The AI Camera Proctor (`main.py`)**

---

## 2. The Step-by-Step Connection Workflow

1. **The Desktop Launcher:** The student opens the WPF Desktop application (`MainWindow.xaml`) and toggles "Enable Anti-Cheat". 
2. **Session Creation:** The WPF app contacts the local Helper Backend (`express-backend/server.js` -> `/api/anticheat/start`) to generate a unique, secure session token. It also starts the Python AI camera script.
3. **The Web Browser Request:** The student goes to their normal web browser (Chrome/Edge) and navigates to the course test.
4. **The Bridge:** The React frontend detects this is an anti-cheat exam. It pings the local Helper Backend (`/api/anticheat/session-token`) to check if the WPF app is running.
5. **The Handshake:** The student clicks "Start Exam" in the browser. The browser sends a signal containing the `testId` and their authentication tokens to the Helper Backend (`/api/anticheat/request-exam-start`).
6. **The Lockdown:** The WPF app, which is constantly polling the Helper Backend, sees this request. It immediately launches the `ExamHostWindow.xaml` in full-screen mode, completely locking down the computer.
7. **The Secure Exam:** Inside the locked window, a WebView opens the test page, injecting the authentication tokens so the student doesn't have to log in again.
8. **Continuous Monitoring:** As the student takes the test, the Python script watches them via webcam, and the WPF app constantly sends "heartbeats" to the backend to confirm the computer is still locked.

---

## 3. Detailed File Breakdown

### A. The WPF Desktop App (`anti cheat/wpf-app/`)
This is the C# Windows application responsible for locking down the OS.
* **`MainWindow.xaml` / `MainViewModel.cs`**: The UI the user sees first. It handles starting the Python script, toggling the anti-cheat status, polling the helper backend for exam start requests, and managing the overall state.
* **`ExamHostWindow.xaml` / `ExamHostWindow.xaml.cs`**: The most critical security file. When the exam starts, this window opens full-screen. 
    * **OS Lockdown**: It uses low-level Windows API hooks (`SetWindowsHookEx`) to block keys like `Alt+Tab`, `Windows Key`, `Ctrl+Esc`, etc.
    * **Registry Edits**: It temporarily modifies the Windows Registry to disable the Task Manager and hide the "Log Off" screen.
    * **WebView2**: It embeds a secure Edge browser inside the window that navigates to the exam URL without an address bar.
    * **Camera Display**: It connects to the Python script's local video feed to show the user their own camera feed.

### B. The AI Proctor (`anti cheat/main.py`)
This Python script is silently launched by the WPF app in the background.
* **OpenCV & YOLOv8**: It accesses the webcam and uses a neural network (`yolov8n.pt`) to analyze the video frames in real-time.
* **Violation Detection**: It actively looks for specific objects (like "cell phone") and counts the number of "persons" in the frame. If it detects multiple people, no people, or a phone, it flags a violation.
* **Local Video Server**: It hosts a tiny local server on port 5050 (`http://127.0.0.1:5050/video_feed`) so the WPF app can display the camera feed.

### C. The Helper Backend (`anti cheat/express-backend/`)
Because a standard web browser (Chrome) cannot directly talk to a desktop app (WPF) due to security sandboxing, this local Node.js server acts as the middleman.
* **`server.js`**: Connects directly to the *same MongoDB database* as your main web application.
    * **Session Management**: Tracks the unique token for the active anti-cheat session (`/api/anticheat/start`, `/api/anticheat/heartbeat`).
    * **The Bridge API**: Receives the "Start Exam" request from the web browser and holds it until the WPF app asks for it (`/api/anticheat/exam-start-pending`).
    * **Exam API Replica**: Because the WPF `ExamHostWindow` is isolated, this helper backend actually handles the exam submission (`/api/exam/submit`), directly saving the score to the database and attaching any AI proctoring reports (like phone detection events) directly to the `TestAttempt`.

### D. The React Web App (`learnhub-elearning/frontend/`)
* **`SessionPlayer.jsx` / `TestPlayer.jsx`**: When rendering a test, it checks `test.settings.requireAntiCheat`. If true, it refuses to show the "Start" button unless it gets a successful ping from `http://localhost:3001` (the Helper Backend). Once clicked, it passes its JWT tokens to the backend, waiting for the WPF app to securely take over.
