# Phase 1: Core Auth - Setup & Testing Guide

## What Was Built

✅ **Backend (Phase 1 complete)**
- Express server with CORS + Socket.io setup
- MongoDB connection with Mongoose
- User model with password hashing
- JWT auth (access + refresh tokens)
- Auth endpoints: register, login, logout, refresh, get-me
- Auth middleware for protected routes

✅ **Frontend (Phase 1 complete)**
- React + Vite + Tailwind CSS setup
- Zustand auth store (global state)
- Auth context with token management
- Axios instance with auto token refresh
- Login page with form validation
- Register page with form validation
- Protected route component
- Basic Dashboard page
- Button, Input, LoadingSpinner components

## Installation & Running

### Backend
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173` (auto-opens)

## MongoDB Setup (Choose One)

### Option 1: Local MongoDB
```bash
# Install MongoDB Community Edition
# https://docs.mongodb.com/manual/installation/

# On Windows:
# Download from https://www.mongodb.com/try/download/community
# Run installer, start MongoDB service

# Test connection in browser:
# mongodb://localhost:27017/e-learning
```

### Option 2: MongoDB Atlas (Cloud)
```bash
# Go to https://www.mongodb.com/cloud/atlas
# Create free account
# Create cluster
# Get connection string
# Add to backend/.env:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/e-learning?retryWrites=true&w=majority
```

## Testing Auth Flow

1. **Start both servers** (backend + frontend)
2. **Visit** http://localhost:5173
3. **Click "Sign up"** and create account:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Password: password123
4. **Auto-redirects** to dashboard on success
5. **Click logout** and login with same credentials
6. **Refresh page** - should stay logged in (token persistence)
7. **Open DevTools** → Application → Local Storage → see `accessToken` and `refreshToken`

## Key Endpoints to Test

### Using curl or Postman:

**Register:**
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User"
}
```

**Login:**
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Get Current User (requires token):**
```bash
GET http://localhost:5000/api/auth/me
Authorization: Bearer <access_token>
```

**Refresh Token:**
```bash
POST http://localhost:5000/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

## Common Issues & Fixes

### "MongoDB connection failed"
- Check MongoDB is running
- Check MONGODB_URI in .env is correct
- Check network access (if using Atlas)

### "CORS error"
- Make sure backend is running on port 5000
- Check CORS_ORIGIN in backend/.env matches frontend URL

### "Token not being stored"
- Check localStorage is enabled in browser
- Open DevTools → Application to verify tokens

### "Refresh loop"
- This is normal if refresh token expires - user needs to login again

## File Overview

### Backend
- `server.js` - Main Express app
- `config/db.js` - MongoDB connection
- `config/jwt.js` - JWT functions
- `models/User.js` - User schema
- `controllers/authController.js` - Auth logic
- `routes/auth.js` - Auth endpoints
- `middleware/auth.js` - Auth middleware

### Frontend
- `App.jsx` - Main routing
- `main.jsx` - React entry point
- `pages/Login.jsx` - Login form
- `pages/Register.jsx` - Register form
- `pages/Dashboard.jsx` - Dashboard
- `context/authStore.js` - Auth state (Zustand)
- `hooks/useAuth.js` - Auth hook
- `utils/api.js` - Axios instance
- `components/Button.jsx` - Button component
- `components/Input.jsx` - Input component
- `components/LoadingSpinner.jsx` - Loading spinner

## Next Steps (Phase 2)

After testing auth, move to Phase 2:
1. Create Course model
2. Create Session model
3. Build course CRUD endpoints
4. Create course listing page
5. Build course detail page
6. Implement enrollment

See `ARCHITECTURE.md` for complete Phase 2 specs.

## Tips

- Keep both server consoles open for error messages
- Use browser DevTools Network tab to debug API calls
- Check backend logs for MongoDB/JWT errors
- Test with multiple browsers to verify session handling
