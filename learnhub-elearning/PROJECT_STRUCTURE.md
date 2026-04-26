# Project Structure Overview

```
e-learning-platform/
│
├── backend/                          # Express + MongoDB server
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── jwt.js                   # Token utilities
│   ├── models/
│   │   └── User.js                  # User schema (bcrypt password)
│   ├── routes/
│   │   └── auth.js                  # Auth endpoints
│   ├── controllers/
│   │   └── authController.js        # Auth business logic
│   ├── middleware/
│   │   └── auth.js                  # JWT verification
│   ├── sockets/                      # (Empty, for Phase 5+)
│   ├── utils/                        # (Empty, for future helpers)
│   ├── package.json                  # Dependencies
│   ├── .env                          # Environment variables
│   └── server.js                     # Express server entry
│
├── frontend/                         # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Login form page
│   │   │   ├── Register.jsx         # Register form page
│   │   │   └── Dashboard.jsx        # Main dashboard
│   │   ├── components/
│   │   │   ├── Button.jsx           # Reusable button
│   │   │   ├── Input.jsx            # Reusable input field
│   │   │   └── LoadingSpinner.jsx   # Loading indicator
│   │   ├── context/
│   │   │   └── authStore.js         # Zustand auth state
│   │   ├── hooks/
│   │   │   └── useAuth.js           # Auth hook
│   │   ├── utils/
│   │   │   └── api.js               # Axios instance
│   │   ├── styles/
│   │   │   └── globals.css          # Tailwind + custom CSS
│   │   ├── App.jsx                  # Main app component + routing
│   │   └── main.jsx                 # React entry point
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Dependencies
│   ├── .env                          # Frontend config
│   ├── vite.config.js               # Vite bundler config
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── postcss.config.js            # PostCSS config
│
├── ARCHITECTURE.md                   # Complete system design (7 sections)
├── README.md                         # Project overview & quick start
├── PHASE1_SETUP.md                   # Setup & testing guide
├── PHASE1_COMPLETE.md                # Phase 1 summary (this phase)
├── .gitignore                        # Git ignore rules
├── setup.sh                          # Quick setup script
└── (this file)
```

## File Statistics

```
Backend:
  ├── 7 core files (~400 lines)
  ├── 6 dependencies (express, mongoose, jwt, bcrypt, etc.)
  └── Ready for MongoDB & Socket.io

Frontend:
  ├── 18+ files (~600 lines)
  ├── 7 dependencies (react, vite, tailwind, zustand, axios, etc.)
  └── Fully styled with Tailwind CSS

Documentation:
  ├── 4 markdown files
  ├── ~2000 lines of docs
  └── Complete roadmap + guides
```

## Technology Stack by Layer

### Backend
```
HTTP Server
    ↓
Express.js ← Middleware (CORS, JSON)
    ↓
Routes (API endpoints)
    ↓
Controllers (business logic)
    ↓
Models (Mongoose schemas)
    ↓
MongoDB (data storage)
```

### Frontend
```
Browser
    ↓
Vite (dev server)
    ↓
React (components)
    ↓
Zustand (state)
    ↓
Axios (HTTP client)
    ↓
Tailwind (styling)
```

### Authentication Flow
```
User Input
    ↓
Login Page (React)
    ↓
API Call (Axios)
    ↓
Backend Auth Route
    ↓
JWT Generation
    ↓
Token Response
    ↓
localStorage (React)
    ↓
Protected Routes
```

## API Endpoints (Phase 1)

```
Authentication:
  POST   /api/auth/register      → Create account
  POST   /api/auth/login         → Get tokens
  GET    /api/auth/me            → Get current user
  POST   /api/auth/refresh       → Refresh token
  POST   /api/auth/logout        → Clear session

Headers:
  Authorization: Bearer <access_token>
```

## Key Components & Hooks

```
Pages:
  ├── Login          (form, validation, error handling)
  ├── Register       (form, validation, error handling)
  └── Dashboard      (user greeting, logout)

Components:
  ├── Button         (primary, secondary, danger, ghost)
  ├── Input          (text, email, password + error)
  └── LoadingSpinner (sm, md, lg sizes)

Hooks:
  └── useAuth        (user, token, loading, methods)

Context:
  └── authStore      (Zustand - register, login, logout, etc.)
```

## State Flow (Zustand)

```
authStore {
  user            → null | {id, email, firstName, lastName, ...}
  accessToken     → null | "jwt.token.here"
  refreshToken    → null | "jwt.refresh.token.here"
  isLoading       → boolean
  error           → null | "error message"

  Methods:
    register()    → POST /auth/register
    login()       → POST /auth/login
    logout()      → Clear tokens & user
    getCurrentUser() → GET /auth/me
}
```

## Data Models (Phase 1)

```
User {
  _id              ObjectId
  email            String (unique)
  passwordHash     String (bcrypted)
  firstName        String
  lastName         String
  avatar           String (URL)
  bio              String
  roles            ['student', 'instructor', 'admin']
  isVerified       Boolean
  isActive         Boolean
  lastLogin        Date
  settings         {...}
  createdAt        Date
  updatedAt        Date
}
```

## What's Ready for Phases 2-8

```
Phase 2: Courses
  ├── Models: Course, Session, Enrollment
  ├── CRUD endpoints for courses
  └── Course listing & detail pages

Phase 3: Dashboard
  ├── User profile page
  ├── Progress tracking
  └── Course list with progress

Phase 4: Community
  ├── Models: CommunityPost, Comment
  ├── Post CRUD endpoints
  └── Community feed page

Phase 5: Chat
  ├── ChatMessage model
  ├── Socket.io events
  └── Chat panel component

Phase 6: Tests
  ├── Models: Test, TestAttempt
  ├── Test room with timer sync
  └── Results & grading

Phase 7: Admin
  ├── Admin-only routes & middleware
  ├── User management page
  └── Content moderation page

Phase 8: Polish
  ├── Animations (session transitions, etc.)
  ├── Dark mode
  └── Final responsive checks
```

## Important Notes

1. **Ports**: Backend (5000) + Frontend (5173) + MongoDB (27017)
2. **Tokens**: Access (15m) + Refresh (7d) - auto-refresh on 401
3. **CORS**: Configured for localhost (change for production)
4. **Database**: Ready for MongoDB (local or Atlas)
5. **Socket.io**: Already initialized, ready for real-time features
6. **Styling**: All Tailwind, no CSS-in-JS needed
7. **Error Handling**: Basic but functional, can be enhanced

---

**Next: Setup MongoDB, then test auth flow in PHASE1_SETUP.md**
