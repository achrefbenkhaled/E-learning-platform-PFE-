# LearnHub - E-Learning Platform MVP

A modern, community-driven e-learning platform built with the MERN stack (MongoDB, Express, React, Node.js). Inspired by Skool.com with a clean, card-based design.

## Features

- **Authentication** - JWT-based login/register with role-based access (student, instructor, admin)
- **Course Management** - Create, browse, enroll, and track progress through video courses
- **Session Player** - Video player with session navigation, progress tracking, and PDF resources
- **Community Feed** - Skool-style posts, comments, likes, and category filters
- **Real-time Chat** - Socket.io powered chat rooms with typing indicators and online presence
- **Online Tests** - Timed tests with synchronized rooms, auto-submit, and reconnection handling
- **Admin Dashboard** - User management, content moderation, and platform analytics
- **Responsive Design** - Mobile-first Tailwind CSS with animations and micro-interactions

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Axios, Socket.io-client |
| **Backend** | Node.js, Express, Socket.io, Mongoose, JWT, bcryptjs |
| **Database** | MongoDB |
| **Real-time** | Socket.io (chat, test rooms, notifications) |

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/learnhub-elearning.git
cd learnhub-elearning
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env    # Edit .env with your MongoDB URI
npm install
npm run seed            # Load demo data (6 users, 6 courses, 20 sessions, tests, posts, chat)
npm run dev             # Starts on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env    # Default: http://localhost:5000
npm install
npm run dev             # Starts on http://localhost:5173
```

### 4. Open in browser
Navigate to `http://localhost:5173`

## Demo Credentials

All users have password: **`password123`**

| Email | Role | Description |
|-------|------|-------------|
| admin@learnhub.com | Admin + Instructor | Full platform access |
| sarah@learnhub.com | Instructor | Course creator (React, UI/UX, Mobile) |
| mike@learnhub.com | Instructor | Course creator (Python, JS patterns) |
| emma@learnhub.com | Student | Enrolled in 3 courses |
| alex@learnhub.com | Student | Enrolled in 3 courses |
| lisa@learnhub.com | Student | Completed React bootcamp |

## API Endpoints

### Auth
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login, returns JWT tokens
POST   /api/auth/logout        Logout
POST   /api/auth/refresh       Refresh access token
GET    /api/auth/me            Get current user
```

### Courses
```
GET    /api/courses             List courses (filter, search, paginate)
GET    /api/courses/:id         Course detail with sessions
POST   /api/courses             Create course (auth)
PUT    /api/courses/:id         Update course (owner)
DELETE /api/courses/:id         Delete course (owner)
POST   /api/courses/enroll      Enroll in course (auth)
GET    /api/courses/enrolled/list    My enrolled courses
GET    /api/courses/my-courses/list  My created courses
```

### Sessions
```
GET    /api/courses/:courseId/sessions           List sessions
POST   /api/courses/:courseId/sessions           Create session
POST   /api/courses/:courseId/sessions/:id/complete   Mark complete
```

### Community
```
GET    /api/community/posts         List posts
POST   /api/community/posts         Create post
POST   /api/community/posts/:id/like    Toggle like
POST   /api/community/posts/:id/comments  Add comment
```

### Tests
```
GET    /api/tests               List tests
POST   /api/tests               Create test
POST   /api/tests/start         Start test attempt
POST   /api/tests/submit-test   Submit final answers
```

### Admin
```
GET    /api/admin/stats          Platform statistics
GET    /api/admin/users          All users
PUT    /api/admin/users/:id      Update user role
DELETE /api/admin/users/:id      Delete user
PUT    /api/admin/courses/:id/approve   Approve/reject course
```

### Chat
```
GET    /api/chat/rooms               User's chat rooms
GET    /api/chat/:roomId/messages    Room message history
```

### Users
```
GET    /api/users/:id           Get profile
PUT    /api/users/:id           Update profile
GET    /api/users/search        Search users
```

## Socket.io Events

### Chat
- `chat:join-room` / `chat:leave-room` - Room management
- `chat:send-message` / `chat:receive-message` - Messaging
- `chat:typing` / `chat:user-typing` - Typing indicators
- `chat:user-online` / `chat:user-offline` - Presence

### Test Rooms
- `test:join-room` / `test:leave-room` - Join test room
- `test:timer-sync` - Server syncs timer every 5s
- `test:submit-answer` / `test:answer-received` - Real-time submission
- `test:test-ended` - Auto-close when time expires
- `test:reconnect` / `test:reconnect-ack` - Reconnection handling

## Project Structure

```
learnhub-elearning/
├── backend/
│   ├── config/          # DB & JWT configuration
│   ├── controllers/     # Route handlers (7 controllers)
│   ├── middleware/       # Auth & role-check middleware
│   ├── models/          # Mongoose schemas (7 models)
│   ├── routes/          # Express routes (8 route files)
│   ├── sockets/         # Socket.io event handlers
│   ├── seed.js          # Demo data script
│   └── server.js        # App entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   │   ├── common/  # Navbar, Sidebar, Layout, Modal, Toast
│   │   │   ├── chat/    # ChatBubble, MessageInput
│   │   │   ├── community/ # PostCard
│   │   │   └── course/  # CourseCard
│   │   ├── context/     # Auth store, Socket context
│   │   ├── hooks/       # useAuth, useTimer
│   │   ├── pages/       # 16 pages across 7 sections
│   │   ├── styles/      # Tailwind + custom animations
│   │   └── utils/       # API client with token refresh
│   ├── tailwind.config.js
│   └── vite.config.js
└── ARCHITECTURE.md      # Full system design document
```

## Development Roadmap

- [x] Phase 1: Authentication System
- [x] Phase 2: Course Management
- [x] Phase 3: Dashboard & Progress Tracking
- [x] Phase 4: Community Features
- [x] Phase 5: Real-time Chat
- [x] Phase 6: Online Tests with Timer Sync
- [x] Phase 7: Admin Dashboard
- [x] Phase 8: Animations & Polish

## Key Design Decisions

- **URLs for media** - No file uploads; videos and PDFs stored as external URLs
- **JWT dual tokens** - Access (15min) + Refresh (7days) for secure auth
- **Socket.io test rooms** - Timer sync every 5s, reconnection recovery, auto-submit
- **Zustand** - Lightweight state management (no Redux overhead)
- **Tailwind CSS** - Utility-first styling with custom animation classes

---

Built for a final year project
