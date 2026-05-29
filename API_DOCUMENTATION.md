# LearnHub Platform — API Reference

Complete list of HTTP APIs and real-time events used in this project.

| Service | Base URL (dev) | Role |
|---------|----------------|------|
| **Main backend** | `http://localhost:5000` | E-learning: auth, courses, tests, chat, admin |
| **Anti-cheat helper** | `http://localhost:3001` | Desktop session, exam handoff, proctor reports |
| **AI proctor** | `http://localhost:5050` | Local webcam AI (Python Flask) |
| **Frontend** | `http://localhost:5173` | React (Vite) |
| **Socket.IO** | Same host as main backend (`:5000`) | Chat, test timer sync, notifications |

---

## Authentication

Most main-backend routes require a JWT in the header:

```http
Authorization: Bearer <accessToken>
```

| Endpoint | Auth |
|----------|------|
| `POST /api/auth/login`, `register`, `refresh` | No |
| `GET /api/auth/me` | Yes |
| Student-only routes | Role `student` |
| Instructor routes | Role `instructor` or `admin` |
| Admin routes | Role `admin` |

**Refresh flow:** `POST /api/auth/refresh` with `{ refreshToken }` → new `accessToken` + `refreshToken`.

---

# 1. Main Backend (`:5000`)

## 1.1 Health & static

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Server health check. Returns `{ status: "OK" }`. |
| `GET` | `/uploads/*` | No | Static files (avatars, course images, documents). |

---

## 1.2 Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | No | Create account. Body: `email`, `password`, `firstName`, `lastName`, optional `role: "instructor"` (+ files for instructor request). Returns user + tokens. |
| `POST` | `/login` | No | Login with `email`, `password`. Returns user + tokens. |
| `POST` | `/google-login` | No | Sign in / register with Google ID token. |
| `POST` | `/logout` | No | Client-side logout helper (clears session server-side if implemented). |
| `POST` | `/refresh` | No | Refresh JWT using `refreshToken`. |
| `GET` | `/me` | Yes | Current user profile. |
| `POST` | `/forgot-password` | No | Send password reset email. Body: `{ email }`. |
| `POST` | `/reset-password` | No | Reset password with token from email. |

---

## 1.3 Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/search?q=` | Yes | Search users (e.g. for chat). |
| `GET` | `/:id` | Optional | User profile by ID. |
| `GET` | `/:id/profile` | Optional | Public profile view. |
| `PUT` | `/:id` | Yes | Update own profile (name, bio, avatar, etc.). |
| `PUT` | `/:id/password` | Yes | Change password (`currentPassword`, `newPassword`). |
| `POST` | `/verify-face` | Yes | Save face photo for anti-cheat. Body: `{ faceData }` (base64 image). Sets `isFaceVerified`. **Required before anti-cheat tests.** |

---

## 1.4 Courses — `/api/courses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | List published courses (`?limit`, filters). |
| `GET` | `/my-courses/list` | Yes | Courses created by instructor. |
| `GET` | `/enrolled/list` | Yes | Courses the student is enrolled in. |
| `GET` | `/:id` | Optional | Course detail (modules, sessions, etc.). |
| `GET` | `/:courseId/tests` | Optional | Tests linked to a course. |
| `GET` | `/:courseId/students` | Yes | Enrolled students (instructor). |
| `POST` | `/` | Instructor | Create course. |
| `PUT` | `/:id` | Instructor | Update course. |
| `DELETE` | `/:id` | Instructor | Delete course. |
| `POST` | `/enroll` | Student | Enroll in free course. Body: `{ courseId }`. |
| `POST` | `/checkout` | Student | Paid enrollment. |
| `POST` | `/join-class` | Student | Join with class code. |
| `DELETE` | `/enroll/:courseId` | Student | Unenroll. |
| `GET` | `/:courseId/progress` | Student | Student progress in course. |
| `POST` | `/:id/reviews` | Yes | Add course review (`rating`, `comment`). |
| `POST` | `/:courseId/sessions` | Instructor | Create lesson/session. |
| `PUT` | `/:courseId/sessions/:sessionId` | Instructor | Update session. |
| `DELETE` | `/:courseId/sessions/:sessionId` | Instructor | Delete session. |
| `POST` | `/:courseId/sessions/:sessionId/complete` | Student | Mark session completed. |
| `POST` | `/:courseId/students/:enrollmentId/toggle-block` | Instructor | Block/unblock student from course. |
| `DELETE` | `/:courseId/students/:enrollmentId` | Instructor | Remove student from course. |

---

## 1.5 Tests — `/api/tests`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | List published tests. |
| `GET` | `/my` | Yes | Tests created by current instructor. |
| `GET` | `/my-attempts` | Yes | Student's past attempts. |
| `GET` | `/:testId` | No | Test info for taking/preview (title, settings, `requireAntiCheat`, schedule). |
| `GET` | `/:testId/attempts` | Yes | All attempts for a test (instructor — participants view). |
| `GET` | `/attempts/:attemptId` | Yes | Single attempt results (score, answers, proctoring data). |
| `POST` | `/` | Instructor | Create test. |
| `PUT` | `/:testId` | Instructor | Update test. |
| `DELETE` | `/:testId` | Instructor | Delete test. |
| `POST` | `/generate` | Instructor | AI-generate questions. |
| `POST` | `/start` | Student | **Start exam.** Body: `{ testId, resume?: boolean }`. Creates `TestAttempt`, returns `attemptId`, `questions`, `reference_face`, `duration`. Anti-cheat: one attempt, face verification required. |
| `POST` | `/submit-answer` | Student | Save one answer during test (optional incremental save). |
| `POST` | `/submit-test` | Student | **Submit exam.** Body: `{ attemptId, testId, answers[], autoSubmit? }`. Grades and sets status `submitted`. |
| `POST` | `/update-proctoring` | No* | Save AI proctor metrics on attempt. Body: `{ attemptId, proctoringData }`. Called from frontend after submit. *No JWT in code — use only on trusted local network. |

**`proctoringData` fields (example):** `lookingAwayPercent`, `phoneDetectionPercent`, `unauthorizedPersonPercent`, `noPersonPercent`, `faceVerified`, `faceComparisonError`, counts, etc.

---

## 1.6 Community — `/api/community`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/posts` | No | Feed (`?limit`, pagination). |
| `POST` | `/posts` | Yes | Create post. |
| `GET` | `/posts/:postId` | No | Single post + comments. |
| `PUT` | `/posts/:postId` | Yes | Edit own post. |
| `DELETE` | `/posts/:postId` | Yes | Delete own post. |
| `POST` | `/posts/:postId/like` | Yes | Like/unlike post. |
| `POST` | `/posts/:postId/comments` | Yes | Add comment. |
| `DELETE` | `/posts/:postId/comments/:commentId` | Yes | Delete comment. |

---

## 1.7 Chat — `/api/chat`

REST endpoints for chat history (live messages use Socket.IO).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/rooms` | Yes | List chat rooms for user. |
| `GET` | `/users` | Yes | Users available for DM. |
| `GET` | `/:roomId/messages` | Yes | Message history for a room. |
| `PUT` | `/:roomId/read` | Yes | Mark room messages as read. |

---

## 1.8 Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Yes | List notifications + `unreadCount`. |
| `PUT` | `/:notificationId/read` | Yes | Mark one notification read. |

---

## 1.9 Instructor requests — `/api/instructor-requests`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Student | Apply to become instructor (documents upload). |
| `GET` | `/my` | Yes | Own request status. |
| `GET` | `/admin` | Admin | All pending/approved requests. |
| `PUT` | `/admin/:id` | Admin | Approve or reject request. Body: `{ status }`. |

---

## 1.10 Reports — `/api/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | Yes | Report content/user. |
| `GET` | `/` | Admin | List reports. |
| `PUT` | `/:id` | Admin | Update report status. |

---

## 1.11 Admin — `/api/admin`

All routes require **admin** role.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List users (filters). |
| `PUT` | `/users/:userId` | Update user roles, `isActive`. |
| `DELETE` | `/users/:userId` | Delete user. |
| `GET` | `/courses` | All courses for moderation. |
| `PUT` | `/courses/:courseId/approve` | Approve/reject course. |
| `DELETE` | `/courses/:courseId` | Remove course. |
| `GET` | `/tests` | All tests. |
| `PUT` | `/tests/:testId` | Admin edit test. |
| `DELETE` | `/tests/:testId` | Delete test. |
| `GET` | `/moderation` | Community moderation queue. |
| `DELETE` | `/moderation/posts/:postId` | Remove post. |
| `GET` | `/stats` | Dashboard statistics. |

---

# 2. Anti-Cheat Helper (`:3001`)

Bridge between **WPF desktop app**, **React browser**, and **MongoDB** (same DB as main backend).

## 2.1 Desktop session (WPF ↔ Helper)

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| `POST` | `/api/anticheat/start` | WPF | Student turns protection **ON**. Creates in-memory session → returns `{ ok, token, heartbeatIntervalMs }`. |
| `POST` | `/api/anticheat/heartbeat` | WPF | Keep-alive every ~3s. Body: `{ token, checksPassed, messages? }`. If `checksPassed: false` → violation. Session dies after **20s** without heartbeat. |
| `POST` | `/api/anticheat/stop` | React / WPF | End session. Body: `{ token }`. |
| `GET` | `/api/anticheat/status/:token` | React | Is desktop session alive? `{ active, validToken, violation, reasons }`. |
| `GET` | `/api/anticheat/session-token` | React | Get active desktop token (lab / single-PC). `{ ok, enabled, token }`. |

## 2.2 Exam launch handshake (Browser ↔ WPF)

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| `POST` | `/api/anticheat/request-exam-start` | React (normal browser) | User clicks **Go to Secure Page**. Body: `{ token, testId, accessToken, refreshToken }`. Stores one pending launch. Requires valid active token. |
| `GET` | `/api/anticheat/exam-start-pending` | WPF (poll **1s**) | Pick up pending launch. Returns `{ pending, token, testId, accessToken, refreshToken }` then **clears** request. WPF opens WebView2 with exam URL + JWT for SSO. |

## 2.3 Proctor reports (WPF / Python ↔ Helper)

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| `POST` | `/api/proctor/reset` | WPF | Clear last report before new exam. Optional `{ framePath }`. |
| `POST` | `/api/proctor/report` | WPF | After exam: save proctor summary to MongoDB `TestAttempt`. Body: `{ session_code, summary, proctoringData?, stdout?, stderr? }`. |
| `GET` | `/api/proctor/report` | React (optional) | Read last pushed report. |
| `GET` | `/api/proctor/frame` | React (optional) | Last camera frame file from disk. |

## 2.4 Exam API on helper (alternate / embedded exam host)

Duplicate exam routes on helper DB — used if exam runs against `:3001` directly:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/exam/:testId` | No | Public test preview info. |
| `POST` | `/api/exam/:testId/start` | JWT | Start attempt. |
| `POST` | `/api/exam/submit` | JWT | Submit attempt. |
| `GET` | `/api/exam/attempt/:attemptId` | JWT | Get results. |
| `POST` | `/api/auth/refresh` | No | Refresh JWT (helper copy). |

## 2.5 Legacy

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/anti-cheat-status` | `{ enabled: true/false }` — any active session exists. |

---

# 3. AI Proctor — Python Flask (`:5050`)

Runs **locally** on the student's PC. Not exposed to the internet.

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| `GET` | `/` | Any | Simple text: proctor active. |
| `GET` | `/status` | React | `{ status, running, initialized }` — models + camera ready. |
| `POST` | `/start-session` | React | Bind session. Body: `{ session_code, reference_face? }` (base64). Encodes reference face for identity check. |
| `GET` | `/stats` | React | Live/final metrics: `face_verified`, `looking_away_pct`, `phone_detected_pct`, `unauthorized_pct`, `no_person_pct`, counts, `error`. |
| `GET` | `/video_feed` | React | MJPEG live camera stream for UI preview. |

**Environment variables (set by WPF):**

- `PROCTOR_STOP_FILE` — file written to stop the loop  
- `PROCTOR_SUMMARY_PATH` — JSON summary on exit  
- `PROCTOR_FRAME_PATH` — optional JPEG snapshot path  

---

# 4. Socket.IO (Main backend `:5000`)

Connect from frontend: `io(API_BASE_URL)`.

## 4.1 User presence

| Event (client → server) | Description |
|-------------------------|-------------|
| `user:identify` | `{ userId }` — join personal room `user_{id}` |
| `users:get-online` | Request online user list |

| Event (server → client) | Description |
|-------------------------|-------------|
| `users:online` | Array of online user IDs |

## 4.2 Chat

| Client → server | Description |
|-----------------|-------------|
| `chat:join-room` | `{ roomId, userId }` |
| `chat:send-message` | `{ roomId, content, userId }` — room message |
| `chat:send-dm` | `{ toUserId, content, userId }` — direct message |
| `chat:typing` | `{ roomId, userId, userName }` |
| `chat:mark-read` | `{ roomId, userId }` |
| `chat:leave-room` | `{ roomId, userId }` |

| Server → client | Description |
|-----------------|-------------|
| `chat:receive-message` | New message payload |
| `chat:user-typing` | Someone is typing |
| `chat:user-online` / `chat:user-offline` | Presence in room |
| `chat:error` | Send failed |

## 4.3 Tests (during TakeTest)

| Client → server | Description |
|-----------------|-------------|
| `test:join-room` | `{ testId, attemptId, userId }` |
| `test:timer-sync-request` | Request remaining time |
| `test:submit-answer` | Optional live answer sync |
| `test:reconnect` | Resume after disconnect |
| `test:leave-room` | Leave test room |

| Server → client | Description |
|-----------------|-------------|
| `test:timer-sync` | `{ remainingTime, testId }` |
| `test:participant-joined` / `test:participant-left` | Proctoring dashboard |
| `test:reconnect-ack` | Remaining time on reconnect |
| `test:test-ended` | Time expired |
| `test:answer-received` | Ack for answer |

---

# 5. Anti-cheat flow — which API when?

```
1. WPF ON          → POST :3001/api/anticheat/start
2. Browser gate    → GET  :3001/session-token, GET status/:token
3. Secure launch   → POST :3001/request-exam-start
                     GET  :3001/exam-start-pending (WPF, every 1s)
4. Start exam      → POST :5000/api/tests/start
                     WPF  → POST :3001/proctor/reset, start Python
                     FE   → POST :5050/start-session, GET /stats
5. Submit          → POST :5000/submit-test
                     → POST :5000/update-proctoring
                     → POST :3001/anticheat/stop
                     WPF  → POST :3001/proctor/report
```

---

# 6. Common response codes

| Code | Meaning |
|------|---------|
| `200` / `201` | Success |
| `400` | Bad request / validation |
| `401` | Missing or invalid JWT |
| `403` | Forbidden (role, not enrolled, face not verified, anti-cheat inactive) |
| `404` | Resource not found |
| `429` | Rate limit (auth routes stricter) |
| `500` | Server error |

---

*Generated from the LearnHub + Anti-Cheat codebase. Default ports: main `5000`, helper `3001`, proctor `5050`, frontend `5173`.*
