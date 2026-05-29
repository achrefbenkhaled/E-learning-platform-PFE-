import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth.js';
import { LoadingSpinner } from './components/LoadingSpinner.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/common/Layout.jsx';
import useAuthStore from './context/authStore.js';
import { useEffect, lazy, Suspense } from 'react';

// Lazy-loaded pages for code splitting (reduces initial bundle size)
const Login = lazy(() => import('./pages/Login.jsx').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register.jsx').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const CourseBrowser = lazy(() => import('./pages/Courses/CourseBrowser.jsx'));
const CourseDetail = lazy(() => import('./pages/Courses/CourseDetail.jsx'));
const CreateCourse = lazy(() => import('./pages/Courses/CreateCourse.jsx'));
const SessionPlayer = lazy(() => import('./pages/Courses/SessionPlayer.jsx'));
const MyCourses = lazy(() => import('./pages/Courses/MyCourses.jsx'));
const EditCourse = lazy(() => import('./pages/Courses/EditCourse.jsx'));
const Feed = lazy(() => import('./pages/Community/Feed.jsx'));
const PostDetail = lazy(() => import('./pages/Community/PostDetail.jsx'));
const ChatRoom = lazy(() => import('./pages/Chat/ChatRoom.jsx'));
const TestBrowser = lazy(() => import('./pages/Tests/TestBrowser.jsx'));
const CreateTest = lazy(() => import('./pages/Tests/CreateTest.jsx'));
const TakeTest = lazy(() => import('./pages/Tests/TakeTest.jsx'));
const TestResults = lazy(() => import('./pages/Tests/TestResults.jsx'));
const TestParticipants = lazy(() => import('./pages/Tests/TestParticipants.jsx'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard.jsx'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement.jsx'));
const ContentModeration = lazy(() => import('./pages/Admin/ContentModeration.jsx'));
const CourseManagement = lazy(() => import('./pages/Admin/CourseManagement.jsx'));
const TestManagement = lazy(() => import('./pages/Admin/TestManagement.jsx'));
const InstructorRequests = lazy(() => import('./pages/Admin/InstructorRequests.jsx'));
const Profile = lazy(() => import('./pages/Settings/Profile.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));

// Page loading fallback
const PageLoader = () => (
  <div className="h-screen bg-surface flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const hasUrlTokens = params.get('accessToken') && params.get('refreshToken');

  if (isLoading || (hasUrlTokens && !isAuthenticated)) {
    return (
      <div className="h-screen bg-surface flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated && !hasUrlTokens) {
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

  // Pages allowed for admin to view (as requested: Chat, Community, and Settings)
  const allowedForAdmin = ['community', 'chat', 'settings'].includes(activePage);

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
  // Global SSO Token Sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAccessToken = params.get('accessToken');
    const urlRefreshToken = params.get('refreshToken');

    if (urlAccessToken && urlRefreshToken) {
      localStorage.setItem('accessToken', urlAccessToken);
      localStorage.setItem('refreshToken', urlRefreshToken);
      useAuthStore.setState({ 
        accessToken: urlAccessToken, 
        refreshToken: urlRefreshToken 
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <SocketProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<AppLayout activePage="dashboard"><Dashboard /></AppLayout>} />

          {/* Courses */}
          <Route path="/courses" element={<AppLayout activePage="courses"><CourseBrowser /></AppLayout>} />
          <Route path="/courses/create" element={
            <ProtectedRoute requiredRole="instructor">
              <Layout activePage="courses"><CreateCourse /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/courses/my" element={<AppLayout activePage="courses"><MyCourses /></AppLayout>} />
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
          <Route path="/tests/:testId/edit" element={
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
          <Route path="/profile/:userId" element={<AppLayout activePage="community"><UserProfile /></AppLayout>} />

          {/* Landing / Default */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
          </Suspense>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
