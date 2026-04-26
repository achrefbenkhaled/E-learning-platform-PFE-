import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth.js';
import { LoadingSpinner } from './components/LoadingSpinner.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/common/Layout.jsx';

// Auth pages
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

// Main pages
import Dashboard from './pages/Dashboard.jsx';

// Course pages
import CourseBrowser from './pages/Courses/CourseBrowser.jsx';
import CourseDetail from './pages/Courses/CourseDetail.jsx';
import CreateCourse from './pages/Courses/CreateCourse.jsx';
import SessionPlayer from './pages/Courses/SessionPlayer.jsx';
import MyCourses from './pages/Courses/MyCourses.jsx';
import EditCourse from './pages/Courses/EditCourse.jsx';

// Community pages
import Feed from './pages/Community/Feed.jsx';
import PostDetail from './pages/Community/PostDetail.jsx';

// Chat
import ChatRoom from './pages/Chat/ChatRoom.jsx';

// Test pages
import TestBrowser from './pages/Tests/TestBrowser.jsx';
import CreateTest from './pages/Tests/CreateTest.jsx';
import TakeTest from './pages/Tests/TakeTest.jsx';
import TestResults from './pages/Tests/TestResults.jsx';
import TestParticipants from './pages/Tests/TestParticipants.jsx';

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import UserManagement from './pages/Admin/UserManagement.jsx';
import ContentModeration from './pages/Admin/ContentModeration.jsx';
import CourseManagement from './pages/Admin/CourseManagement.jsx';
import TestManagement from './pages/Admin/TestManagement.jsx';
import InstructorRequests from './pages/Admin/InstructorRequests.jsx';

// Settings
import Profile from './pages/Settings/Profile.jsx';

// Checkout
import Checkout from './pages/Checkout.jsx';

// Landing
import LandingPage from './pages/LandingPage.jsx';

// User Profile
import UserProfile from './pages/UserProfile.jsx';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen bg-surface flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.roles?.includes('admin') && requiredRole && requiredRole !== 'admin') {
    return <Navigate to="/admin" />;
  }

  if (requiredRole && !user?.roles?.includes(requiredRole)) {
    return <Navigate to={user?.roles?.includes('admin') ? "/admin" : "/dashboard"} />;
  }

  return children;
};

const AppLayout = ({ children, activePage }) => {
  const { user } = useAuth();

  // Pages allowed for admin to view (as requested: Chat and Community)
  const allowedForAdmin = ['community', 'chat'].includes(activePage);

  if (user?.roles?.includes('admin') && !allowedForAdmin) {
    return <Navigate to="/admin" />;
  }

  return (
    <ProtectedRoute>
      <Layout activePage={activePage}>{children}</Layout>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <Router>
          <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<AppLayout activePage="dashboard"><Dashboard /></AppLayout>} />

          {/* Courses */}
          <Route path="/courses" element={<AppLayout activePage="courses"><CourseBrowser /></AppLayout>} />
          <Route path="/courses/create" element={
            <ProtectedRoute requiredRole="instructor">
              <Layout activePage="courses"><CreateCourse /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/courses/my" element={<AppLayout activePage="my-courses"><MyCourses /></AppLayout>} />
          <Route path="/courses/:id/edit" element={
            <ProtectedRoute requiredRole="instructor">
              <Layout activePage="courses"><EditCourse /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/courses/:id" element={<AppLayout activePage="courses"><CourseDetail /></AppLayout>} />
          <Route path="/courses/:courseId/sessions/:sessionId" element={
            <ProtectedRoute><SessionPlayer /></ProtectedRoute>
          } />

          {/* Checkout */}
          <Route path="/checkout/:courseId" element={
            <ProtectedRoute><Checkout /></ProtectedRoute>
          } />

          {/* Community */}
          <Route path="/community" element={<AppLayout activePage="community"><Feed /></AppLayout>} />
          <Route path="/community/:postId" element={<AppLayout activePage="community"><PostDetail /></AppLayout>} />

          {/* Chat */}
          <Route path="/chat" element={<AppLayout activePage="chat"><ChatRoom /></AppLayout>} />

          {/* Tests */}
          <Route path="/tests" element={<AppLayout activePage="tests"><TestBrowser /></AppLayout>} />
          <Route path="/tests/create" element={
            <ProtectedRoute requiredRole="instructor">
              <Layout activePage="tests"><CreateTest /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/tests/:testId/participants" element={<AppLayout activePage="tests"><TestParticipants /></AppLayout>} />
          <Route path="/tests/:testId/take" element={
            <ProtectedRoute><TakeTest /></ProtectedRoute>
          } />
          <Route path="/tests/results/:attemptId" element={<AppLayout activePage="tests"><TestResults /></AppLayout>} />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><UserManagement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/courses" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><CourseManagement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/tests" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><TestManagement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/moderation" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><ContentModeration /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/instructor-requests" element={
            <ProtectedRoute requiredRole="admin">
              <Layout activePage="admin"><InstructorRequests /></Layout>
            </ProtectedRoute>
          } />

          {/* Settings */}
          <Route path="/settings" element={<AppLayout activePage="settings"><Profile /></AppLayout>} />

          {/* User Profile */}
          <Route path="/users/:userId" element={<AppLayout activePage="community"><UserProfile /></AppLayout>} />

          {/* Landing / Default */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
