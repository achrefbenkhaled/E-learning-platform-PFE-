# E-Learning Platform MVP - Architecture Guide

## 1. PROJECT STRUCTURE

```
e-learning-platform/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── jwt.js                # JWT configuration
│   │   └── socketio.js           # Socket.io setup
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Course.js             # Course schema
│   │   ├── Session.js            # Session (lesson) schema
│   │   ├── Enrollment.js         # Course enrollment tracking
│   │   ├── Test.js               # Test schema
│   │   ├── TestAttempt.js        # User test attempts
│   │   ├── ChatMessage.js        # Chat messages
│   │   ├── Community.js          # Community posts
│   │   └── Comment.js            # Post comments
│   ├── routes/
│   │   ├── auth.js               # Login, register, logout
│   │   ├── users.js              # Profile, dashboard
│   │   ├── courses.js            # Course CRUD
│   │   ├── sessions.js           # Session CRUD
│   │   ├── enrollments.js        # Enrollment management
│   │   ├── tests.js              # Test CRUD
│   │   ├── attempts.js           # Test attempts
│   │   ├── community.js          # Posts, comments
│   │   └── admin.js              # Admin operations
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── roleCheck.js          # Role-based access
│   │   └── errorHandler.js       # Error handling
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── courseController.js
│   │   ├── testController.js
│   │   ├── communityController.js
│   │   └── adminController.js
│   ├── sockets/
│   │   ├── chatSocket.js         # Chat real-time events
│   │   ├── testSocket.js         # Test room management
│   │   ├── notificationSocket.js # Notifications
│   │   └── locationSocket.js     # Nearby users
│   ├── utils/
│   │   ├── validators.js         # Input validation
│   │   ├── helpers.js            # Utility functions
│   │   └── locationHelper.js     # IP-based location (MVP)
│   ├── .env
│   ├── server.js                 # Express app entry
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Home/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── Feed.jsx
│   │   │   ├── Courses/
│   │   │   │   ├── CourseBrowser.jsx
│   │   │   │   ├── CourseDetail.jsx
│   │   │   │   ├── CoursePay.jsx
│   │   │   │   ├── SessionPlayer.jsx
│   │   │   │   └── CreateCourse.jsx
│   │   │   ├── Community/
│   │   │   │   ├── Feed.jsx
│   │   │   │   ├── Profile.jsx
│   │   │   │   └── NearbyUsers.jsx
│   │   │   ├── Tests/
│   │   │   │   ├── CreateTest.jsx
│   │   │   │   ├── TakeTest.jsx
│   │   │   │   ├── TestResults.jsx
│   │   │   │   └── TestRoom.jsx
│   │   │   ├── Admin/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── UserManagement.jsx
│   │   │   │   ├── ContentModeration.jsx
│   │   │   │   └── PlatformStats.jsx
│   │   │   └── Settings/
│   │   │       ├── Profile.jsx
│   │   │       └── Preferences.jsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── course/
│   │   │   │   ├── CourseCard.jsx
│   │   │   │   ├── SessionList.jsx
│   │   │   │   ├── ProgressBar.jsx
│   │   │   │   └── VideoPlayer.jsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.jsx
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   └── OnlineUsers.jsx
│   │   │   ├── community/
│   │   │   │   ├── Post.jsx
│   │   │   │   ├── PostCard.jsx
│   │   │   │   ├── CommentSection.jsx
│   │   │   │   └── ReactionButtons.jsx
│   │   │   ├── test/
│   │   │   │   ├── QuestionCard.jsx
│   │   │   │   ├── TestTimer.jsx
│   │   │   │   ├── AnswerInput.jsx
│   │   │   │   └── TestResults.jsx
│   │   │   └── admin/
│   │   │       ├── UserTable.jsx
│   │   │       ├── StatsCard.jsx
│   │   │       └── ContentTable.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   ├── useApi.js
│   │   │   ├── useLocalStorage.js
│   │   │   └── useTimer.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SocketContext.jsx
│   │   │   ├── NotificationContext.jsx
│   │   │   └── UIContext.jsx
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   └── tokenStorage.js
│   │   ├── styles/
│   │   │   ├── globals.css       # Tailwind imports + custom
│   │   │   ├── animations.css    # Custom animations
│   │   │   └── colors.css        # Design tokens
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env
│   ├── package.json
│   └── vite.config.js (or next.config.js)
│
└── README.md
```

---

## 2. DATABASE SCHEMA (MongoDB + Mongoose)

### User
```javascript
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  firstName: String,
  lastName: String,
  avatar: String (URL),
  bio: String,
  roles: [String], // ['student', 'admin', 'instructor']
  isVerified: Boolean,
  joinedAt: Date,
  lastLogin: Date,
  settings: {
    emailNotifications: Boolean,
    darkMode: Boolean,
    publicProfile: Boolean
  }
}
```

### Course
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,
  instructor: ObjectId (ref: User),
  thumbnail: String (URL),
  price: Number, // 0 = free
  status: String, // 'draft', 'published', 'archived'
  level: String, // 'beginner', 'intermediate', 'advanced'
  language: String,
  enrollmentCount: Number,
  totalSessions: Number,
  createdAt: Date,
  updatedAt: Date,
}
```

### Session (Lesson)
```javascript
{
  _id: ObjectId,
  courseId: ObjectId (ref: Course),
  title: String,
  description: String,
  videoUrl: String (required),
  pdfUrl: String (optional),
  order: Number,
  duration: Number, // in minutes (optional, inferred from video)
  isPublished: Boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### Enrollment
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  courseId: ObjectId (ref: Course),
  enrollmentDate: Date,
  progress: Number, // 0-100%
  completedSessions: [ObjectId], // Session IDs
  lastAccessedAt: Date,
  status: String, // 'active', 'completed', 'paused'
}
```

### Test
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  courseId: ObjectId (ref: Course, optional),
  createdBy: ObjectId (ref: User),
  questions: [{
    _id: ObjectId,
    type: String, // 'multiple-choice', 'short-answer', 'essay'
    question: String,
    options: [String], // for multiple choice
    correctAnswer: String,
    points: Number
  }],
  settings: {
    duration: Number, // minutes
    passingScore: Number,
    shuffleQuestions: Boolean,
    showResults: Boolean,
    scheduledStartTime: Date (optional),
    scheduledEndTime: Date (optional),
    openToPublic: Boolean
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### TestAttempt
```javascript
{
  _id: ObjectId,
  testId: ObjectId (ref: Test),
  userId: ObjectId (ref: User),
  responses: [{
    questionId: ObjectId,
    answer: String,
    isCorrect: Boolean
  }],
  score: Number,
  totalPoints: Number,
  percentage: Number,
  timeTaken: Number, // seconds
  startedAt: Date,
  submittedAt: Date,
  status: String, // 'in-progress', 'submitted', 'graded'
}
```

### ChatMessage
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  roomId: String, // 'general' or 'direct-userId'
  content: String,
  attachmentUrl: String (optional),
  createdAt: Date,
  readBy: [ObjectId],
}
```

### CommunityPost
```javascript
{
  _id: ObjectId,
  authorId: ObjectId (ref: User),
  title: String,
  content: String,
  category: String, // 'announcement', 'discussion', 'question'
  likes: [ObjectId], // User IDs
  comments: [ObjectId], // Comment IDs
  views: Number,
  isPinned: Boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### Comment
```javascript
{
  _id: ObjectId,
  postId: ObjectId (ref: CommunityPost),
  authorId: ObjectId (ref: User),
  content: String,
  likes: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
}
```

---

## 3. REST API ENDPOINTS

### Authentication
```
POST   /api/auth/register           → Register new user
POST   /api/auth/login              → Login, return JWT
POST   /api/auth/logout             → Logout
POST   /api/auth/refresh            → Refresh token
GET    /api/auth/me                 → Get current user
```

### Users
```
GET    /api/users/:id               → Get user profile
PUT    /api/users/:id               → Update profile
GET    /api/users/:id/dashboard     → User dashboard (enrollments, progress)
GET    /api/users/search            → Search users
GET    /api/users/:id/courses-created → Get courses created by user
GET    /api/users/:id/courses-enrolled → Get courses user enrolled in
```

### Courses
```
GET    /api/courses                 → List all courses (filter, sort, search)
POST   /api/courses                 → Create course (instructor only)
GET    /api/courses/:id             → Get course detail
PUT    /api/courses/:id             → Update course (instructor + auth check)
DELETE /api/courses/:id             → Delete course (instructor + auth check)
POST   /api/courses/:id/enroll      → Enroll in course
GET    /api/courses/:id/progress    → Get user progress in course
```

### Sessions
```
GET    /api/courses/:courseId/sessions         → List sessions
POST   /api/courses/:courseId/sessions         → Create session (instructor)
GET    /api/courses/:courseId/sessions/:id    → Get single session
PUT    /api/courses/:courseId/sessions/:id    → Update session (instructor)
DELETE /api/courses/:courseId/sessions/:id    → Delete session (instructor)
POST   /api/courses/:courseId/sessions/:id/complete → Mark session as completed
```

### Tests
```
GET    /api/tests                   → List all tests
POST   /api/tests                   → Create test
GET    /api/tests/:id               → Get test details
PUT    /api/tests/:id               → Update test
DELETE /api/tests/:id               → Delete test
GET    /api/tests/:id/questions     → Get test questions
POST   /api/tests/:id/submit        → Submit test answer (via socket mostly)
```

### Test Attempts
```
POST   /api/attempts                → Start test attempt
GET    /api/attempts/:id            → Get attempt details
GET    /api/attempts/test/:testId   → Get all attempts for a test
GET    /api/users/:userId/attempts  → Get user's test attempts
PUT    /api/attempts/:id/submit     → Submit final answers
```

### Community
```
GET    /api/community/posts         → List posts (filter by category)
POST   /api/community/posts         → Create post
GET    /api/community/posts/:id     → Get post with comments
PUT    /api/community/posts/:id     → Update post (author only)
DELETE /api/community/posts/:id     → Delete post (author + admin)
POST   /api/community/posts/:id/like → Like post
POST   /api/community/posts/:id/comments → Add comment
PUT    /api/community/comments/:id  → Update comment
DELETE /api/community/comments/:id  → Delete comment
```

### Admin
```
GET    /api/admin/users             → List all users
PUT    /api/admin/users/:id         → Edit user (role, status)
DELETE /api/admin/users/:id         → Delete user
GET    /api/admin/courses           → List all courses
PUT    /api/admin/courses/:id       → Moderate course (approve, flag)
DELETE /api/admin/courses/:id       → Remove course
GET    /api/admin/reports           → Platform stats, activity
GET    /api/admin/moderation        → Flagged content
```

---

## 4. SOCKET.IO EVENT DESIGN

### Chat Events
```javascript
// Client → Server
emit('chat:send-message', { roomId, content, attachmentUrl })
emit('chat:typing', { roomId })
emit('chat:join-room', { roomId })
emit('chat:leave-room', { roomId })

// Server → Client
on('chat:receive-message', { senderId, content, timestamp, roomId })
on('chat:user-typing', { userId, roomId })
on('chat:user-online', { userId, status })
on('chat:message-read', { messageId })
```

### Test Room Events
```javascript
// Client → Server
emit('test:join-room', { testId, userId })
emit('test:ready', { testId })
emit('test:submit-answer', { testId, questionId, answer })
emit('test:request-sync', { testId })
emit('test:leave-room', { testId })

// Server → Client
on('test:room-created', { testId, participants: [] })
on('test:test-started', { startTime, duration })
on('test:timer-sync', { timeRemaining, serverTime })
on('test:answer-received', { questionId, ack })
on('test:test-ended', { testId, results })
on('test:participant-joined', { userId, count })
on('test:participant-left', { userId, count })
on('test:user-reconnected', { userId })

// Reconnection handling
emit('test:reconnect', { testId, userId, sessionId })
on('test:reconnect-ack', { savedProgress, timeRemaining })
```

### Notification Events
```javascript
// Server → Client
on('notification:course-updated', { courseId, title })
on('notification:new-post', { postId, authorName, title })
on('notification:comment-on-post', { postId, commenterName })
on('notification:test-scheduled', { testId, startTime })
```

### Location Events (MVP - IP-based)
```javascript
// Client → Server
emit('location:update', { ipAddress }) // automatic via middleware
emit('location:request-nearby', {})

// Server → Client
on('location:nearby-users', [{ userId, name, avatar, distance: 'nearby' }])
```

---

## 5. KEY PAGES AND COMPONENTS

### Pages (Top-level)

1. **Authentication Pages**
   - Login
   - Register
   - Forgot Password (simple version)

2. **Home/Dashboard Pages**
   - Student Dashboard (my courses, recent activity, progress)
   - Community Feed
   - Instructor Dashboard (course stats, student progress)

3. **Course Pages**
   - Course Browser (filters: category, price, level)
   - Course Detail (overview, sessions list, instructor info, reviews)
   - Session Player (video player, PDF viewer, session nav, chat)
   - Create/Edit Course (form, session management)
   - My Courses (progress, certificates)

4. **Test Pages**
   - Create Test (question builder)
   - Take Test (test room with timer, questions)
   - Test Results (score, answers review)
   - My Tests (history, scores)

5. **Community Pages**
   - Community Feed (posts, discussions, filters)
   - Create Post (rich editor)
   - Post Detail (comments, reactions)
   - Nearby Users (basic location feature)
   - Direct Messages

6. **Admin Pages**
   - Admin Dashboard (stats, quick actions)
   - User Management (list, edit roles, deactivate)
   - Content Moderation (approve/reject posts, courses)
   - Platform Analytics

7. **Settings**
   - Profile Management
   - Preferences
   - Privacy Settings

### Key Components

**Common:**
- Navbar (logo, search, notifications, user menu)
- Sidebar (nav menu, collapsible)
- Card (flexible card component)
- Button (variants: primary, secondary, ghost, danger)
- Modal
- Toast/Alert
- LoadingSpinner

**Course-specific:**
- CourseCard (preview, progress, enroll button)
- SessionList (expandable, linked)
- ProgressBar (visual progress)
- VideoPlayer (embed from URL)
- SessionSidebar (course structure)

**Chat:**
- ChatPanel (sidebar or modal)
- ChatMessage (message bubble)
- MessageInput (text + attachment)
- OnlineUsersList

**Community:**
- PostCard (title, excerpt, author, reactions)
- CommentSection (nested comments)
- ReactionButtons (like, comment, share)
- PostForm (rich editor)

**Test:**
- QuestionCard (question, options/inputs)
- TestTimer (countdown, color change)
- AnswerReview (show correct vs chosen)

**Admin:**
- UserTable (sortable, filterable)
- StatsCard (key metrics)
- ChartWidget (simple chart)

---

## 6. TAILWIND DESIGN DIRECTION

### Design Philosophy
- **Clean, minimal, premium** — lots of whitespace, soft shadows
- **Community-first** — feed-like, social features prominent
- **Card-based** — rounded corners (12px-16px), subtle borders, soft shadows
- **Generous spacing** — use Tailwind spacing scale (gap-4, p-6, etc.)
- **Strong typography** — clear hierarchy with size and weight

### Color Palette (Tailwind Extended)
```css
Primary:     #3B82F6 (blue-500) — CTAs, highlights
Secondary:   #8B5CF6 (violet-500) — accent elements
Success:     #10B981 (emerald-500) — positive actions
Danger:      #EF4444 (red-500) — destructive actions
Neutral:     #F3F4F6 (gray-100) background, #1F2937 text
```

### Component Guidelines

**Cards:**
```tailwind
bg-white rounded-lg shadow-sm border border-gray-100 p-6
hover:shadow-md transition-shadow duration-300
```

**Buttons:**
```tailwind
# Primary
px-4 py-2 rounded-lg bg-blue-500 text-white font-medium
hover:bg-blue-600 transition-colors disabled:opacity-50

# Secondary
px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium
hover:bg-gray-200 transition-colors

# Ghost
px-4 py-2 text-blue-500 hover:bg-blue-50
```

**Inputs:**
```tailwind
w-full px-4 py-2 rounded-lg border border-gray-300
focus:border-blue-500 focus:ring-2 focus:ring-blue-100
placeholder-gray-500 transition-colors
```

**Typography:**
```tailwind
# Heading 1 (page title)
text-3xl font-bold text-gray-900

# Heading 2 (section)
text-2xl font-semibold text-gray-900

# Body
text-base text-gray-700 leading-relaxed

# Caption
text-sm text-gray-500
```

**Spacing Scale:**
- Padding: p-4, p-6, p-8 (consistent rhythm)
- Gaps: gap-4, gap-6, gap-8 (between items)
- Margins: space-y-*, space-x-*

### Pages Layout Pattern
```
Navbar (fixed top, h-16)
├─ Sidebar (if needed, w-64, sticky)
└─ Main Content (pl-64 or full width)
   ├─ Page Header
   └─ Content Grid (flex/grid, gap-6)
```

### Animation & Transitions
- Page transitions: fade-in-up (simple CSS)
- Hover states: shadow increase, color shift
- Session transitions: "rolling board" animation (3D CSS transform, subtle)
- Chat messages: slide-in from bottom
- Modals: fade background + scale content
- Loading: pulsing skeleton or spinner

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Setup & Core Auth (Days 1-2)
- [ ] Initialize backend (Node, Express, MongoDB)
- [ ] Initialize frontend (React, Tailwind, Vite)
- [ ] Create User model
- [ ] Build login/register endpoints
- [ ] Create Auth context + hooks
- [ ] Build Login/Register pages
- [ ] Implement JWT token storage

### Phase 2: Course Management (Days 3-4)
- [ ] Create Course, Session, Enrollment models
- [ ] Build course CRUD endpoints (instructor)
- [ ] Create course list/detail pages
- [ ] Build enroll endpoint + flow
- [ ] Create session player component
- [ ] Implement progress tracking

### Phase 3: User Dashboard & Profile (Day 5)
- [ ] Build user dashboard page
- [ ] Show enrolled courses + progress
- [ ] Create profile page
- [ ] Build instructor course management UI
- [ ] Add course creation form

### Phase 4: Community Features (Days 6-7)
- [ ] Create CommunityPost, Comment models
- [ ] Build community feed endpoints
- [ ] Create like/comment functionality
- [ ] Build community feed page + components
- [ ] Add post creation modal
- [ ] Implement basic location detection (IP)

### Phase 5: Real-time Chat (Days 8-9)
- [ ] Set up Socket.io on backend
- [ ] Create ChatMessage model
- [ ] Implement chat events (send, receive, typing)
- [ ] Create ChatPanel component
- [ ] Build message history fetch
- [ ] Add online user tracking

### Phase 6: Online Tests (Days 10-12)
- [ ] Create Test, TestAttempt models
- [ ] Build test creation form
- [ ] Implement test CRUD endpoints
- [ ] Build TestRoom with Socket.io
- [ ] Create timer sync logic
- [ ] Implement reconnection handling
- [ ] Build test taking page + submission
- [ ] Add results/review page

### Phase 7: Admin Dashboard (Days 13-14)
- [ ] Create admin-only endpoints
- [ ] Build user management page
- [ ] Add content moderation page
- [ ] Create analytics/stats page
- [ ] Implement role-based access checks

### Phase 8: Polish & Animations (Days 15-16)
- [ ] Add session transition animations
- [ ] Implement toast notifications
- [ ] Add loading states
- [ ] Mobile responsiveness check
- [ ] Dark mode toggle (if time)
- [ ] Test edge cases
- [ ] Final UI polish

---

## Key Features Summary

| Feature | Priority | Status |
|---------|----------|--------|
| Auth (JWT) | P0 | In Phase 1 |
| Course Management | P0 | In Phase 2 |
| Session Player | P0 | In Phase 2 |
| Enrollment & Progress | P0 | In Phase 3 |
| Dashboard | P0 | In Phase 3 |
| Community Posts | P1 | In Phase 4 |
| Real-time Chat | P1 | In Phase 5 |
| Online Tests | P1 | In Phase 6 |
| Admin Panel | P2 | In Phase 7 |
| Nearby Users | P2 | In Phase 4 |
| Animations | P2 | In Phase 8 |

---

## Tech Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Axios, Socket.io-client, Zustand (state) |
| **Backend** | Node.js, Express, Socket.io, Mongoose, JWT, bcrypt |
| **Database** | MongoDB (Atlas or local) |
| **Real-time** | Socket.io (chat, tests, notifications) |
| **Auth** | JWT (access + refresh tokens) |
| **Hosting** | Vercel (frontend), Render/Railway (backend) |

---

## Edge Cases & Handling

### Tests
- User refreshes → Reconnect via socket, fetch saved state
- User joins late → Deny join if test already started
- Timer sync → Server emits time every 5s, client adjusts
- Network disconnect → Buffer submissions, resync on reconnect
- Multiple tabs → Last tab wins, clear others

### Chat
- Offline messages → Queue locally, send when online
- Connection drop → Reconnect auto-handled by Socket.io
- User deleted → Mark messages as deleted but preserve history

### Courses
- Video/PDF unavailable → Show error + fallback message
- Concurrent edits → Last write wins (simple approach)
- Enrollment after deletion → Check course exists before accessing

---

## File Size & Performance Targets

- Frontend bundle: < 500KB (gzip)
- First paint: < 2s
- API response: < 200ms avg
- Chat latency: < 100ms
- Test timer accuracy: ±1s

---

Now we're ready for code generation!
