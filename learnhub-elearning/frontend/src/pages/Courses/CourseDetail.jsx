import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, BookOpen, Users, Globe, BarChart3,
  Play, FileText, CheckCircle, Lock, Star,
  Clock, LogOut, MessageSquare, Pencil, Layers,
  Calendar, Timer, ClipboardList, ChevronLeft, ChevronRight, X, Trash2, Shield, ShieldAlert, Key
} from 'lucide-react';
import api from '../../utils/api.js';
import { getTestStatus, formatCountdownTo } from '../../utils/helpers.js';
import useAuth from '../../hooks/useAuth.js';
import ReportModal from '../../components/modals/ReportModal.jsx';

const TABS = ['Overview', 'Sessions', 'Tests', 'Reviews'];

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.roles?.includes('student');
  const heroRef = useRef(null);
  const contentRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(new Set());
  const [showReportModal, setShowReportModal] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [courseTests, setCourseTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Student management
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [removingStudent, setRemovingStudent] = useState(null);
  const [blockingStudent, setBlockingStudent] = useState(null);

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData, sessions: sessionData, enrollment: enrollmentData } = res.data;
      const data = courseData || res.data;
      setCourse(data);
      setSessions(sessionData || data.sessions || []);
      setReviews(data.reviews || []);
      setEnrollment(enrollmentData || res.data.enrollment || (data.isEnrolled ? data : null));
      setProgress(enrollmentData?.progress || data.progress || 0);
      const completed = (enrollmentData?.completedSessions || data.completedSessions || []).map((s) =>
        typeof s === 'string' ? s : s._id
      );
      setCompletedSessions(new Set(completed));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && course) {
      if (heroRef.current) {
        gsap.fromTo(heroRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
      }
      if (contentRef.current) {
        gsap.fromTo(contentRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.2, ease: 'power3.out' });
      }
    }
  }, [loading, course]);

  const isAdmin = user?.roles?.includes('admin');
  const isEnrolled = !!(enrollment || course?.isEnrolled);
  const isBlocked = !!(enrollment?.isBlocked || course?.isBlocked) && !isAdmin;
  const isCreator = user && course && (
    course.instructor?._id === user._id ||
    course.instructor === user._id
  );
  const hasAccess = isEnrolled || isCreator || isAdmin;

  // Fetch course tests when Tests tab is active
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (activeTab === 'Tests') {
      const interval = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Tests' && id) {
      const fetchTests = async () => {
        setTestsLoading(true);
        try {
          const res = await api.get(`/api/courses/${id}/tests`);
          setCourseTests(res.data || []);
        } catch (err) { /* silent */ }
        finally { setTestsLoading(false); }
      };
      fetchTests();
    }
  }, [activeTab, id]);

  // Test schedule helpers
  const getHighlightedDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const highlighted = new Set();
    courseTests.forEach(test => {
      const windows = [...(test.settings?.scheduleWindows || [])];
      if (test.settings?.scheduledStartTime && test.settings?.scheduledEndTime) {
        windows.push({ startTime: test.settings.scheduledStartTime, endTime: test.settings.scheduledEndTime });
      }
      windows.forEach(w => {
        const start = new Date(w.startTime);
        const end = new Date(w.endTime);
        const cursor = new Date(Math.max(start.getTime(), new Date(year, month, 1).getTime()));
        const lastDay = new Date(Math.min(end.getTime(), new Date(year, month + 1, 0, 23, 59, 59).getTime()));
        while (cursor <= lastDay) {
          highlighted.add(cursor.getDate());
          cursor.setDate(cursor.getDate() + 1);
        }
      });
    });
    return highlighted;
  };

  const handleEnroll = async () => {
    if (!user) return navigate('/login');
    if (!isStudent) {
      setError('Only students can enroll in courses. Please contact support if you believe this is an error.');
      return;
    }
    if (course.price > 0) return navigate(`/checkout/${course._id}`);
    try {
      setEnrolling(true);
      await api.post('/api/courses/enroll', { courseId: course._id });
      // Refresh course data to show enrolled state
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData, sessions: sessionData, enrollment: enrollmentData } = res.data;
      const refreshed = courseData || res.data;
      setCourse(refreshed);
      if (sessionData) setSessions(sessionData);
      setEnrollment(enrollmentData || (refreshed.isEnrolled ? refreshed : null));
      setProgress(enrollmentData?.progress || refreshed.progress || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!confirm('Are you sure you want to leave this course?')) return;
    try {
      await api.delete(`/api/courses/enroll/${course._id}`);
      setEnrollment(null);
      setProgress(0);
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData, sessions: sessionData } = res.data;
      const refreshed = courseData || res.data;
      setCourse(refreshed);
      if (sessionData) setSessions(sessionData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unenroll');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      const res = await api.post(`/api/courses/${id}/reviews`, { rating: reviewRating, comment: reviewComment });
      setReviews(res.data.reviews || []);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const res = await api.get(`/api/courses/${id}/students`);
      setStudents(res.data.students || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) return;
    setRemovingStudent(enrollmentId);
    try {
      await api.delete(`/api/courses/${id}/students/${enrollmentId}`);
      setStudents(students.filter(s => s.enrollmentId !== enrollmentId));
      // Update course to reflect new enrollment count
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData } = res.data;
      setCourse(courseData || res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove student');
    } finally {
      setRemovingStudent(null);
    }
  };

  const handleToggleBlock = async (enrollmentId) => {
    setBlockingStudent(enrollmentId);
    try {
      const res = await api.post(`/api/courses/${id}/students/${enrollmentId}/toggle-block`);
      setStudents(students.map(s => 
        s.enrollmentId === enrollmentId ? { ...s, isBlocked: res.data.isBlocked } : s
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle block status');
    } finally {
      setBlockingStudent(null);
    }
  };

  const openStudentsModal = async () => {
    setShowStudentsModal(true);
    await fetchStudents();
  };

  // Find the best session to "continue" with
  const getContinueSessionId = () => {
    if (!sessions || sessions.length === 0) return null;

    // 1. Find the first session that is neither completed nor locked
    const nextAvailable = sessions.find(s => !completedSessions.has(s._id) && !s.isLocked);
    if (nextAvailable) return nextAvailable._id;

    // 2. If all incomplete sessions are locked, find the last session they COMPLETED 
    // (likely where the unpassed test is)
    const lastCompleted = [...sessions].reverse().find(s => completedSessions.has(s._id));
    if (lastCompleted) return lastCompleted._id;

    // 3. Fallback to the very first session
    return sessions[0]._id;
  };

  const continueSessionId = getContinueSessionId();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-400/10 rounded-2xl border-2 border-red-400/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-txt mb-2">Course Not Found</h3>
          <p className="text-txt-muted mb-4">{error}</p>
          <button onClick={() => navigate('/courses')} className="btn-secondary">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <div ref={heroRef} className="relative border-b border-bdr" style={{ backgroundColor: 'var(--surface-card)' }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-txt-muted hover:text-yellow-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </button>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex items-center gap-3 mb-4">
                <span className="badge badge-accent">{course.level || 'Beginner'}</span>
                {(course.categories || []).map((cat, i) => (
                  <span key={i} className="badge badge-blue">{cat}</span>
                ))}
                {course.type === 'classroom' && (
                  <span className="badge bg-yellow-400/10 text-yellow-400 border-yellow-400/30 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Classroom
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>{course.title}</h1>
              <p className="text-lg mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                {course.description?.substring(0, 200)}
                {(course.description?.length || 0) > 200 ? '...' : ''}
              </p>

              {/* Instructor */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-sm font-bold border border-yellow-400/20">
                  {(course.instructor?.firstName || 'I')[0]}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {course.instructor?.firstName
                      ? `${course.instructor.firstName} ${course.instructor.lastName || ''}`
                      : course.instructorName || 'Instructor'}
                  </p>
                  <p className="text-sm text-txt-muted">Instructor</p>
                </div>
              </div>
            </div>

            {/* Enroll Card */}
            <div className="w-full lg:w-80 card p-6">
              <div className="text-3xl font-black mb-4 text-center">
                {course.price === 0 ? (
                  <span className="text-green-400">Free</span>
                ) : (
                  <span className="text-yellow-400">${course.price}</span>
                )}
              </div>

              {isCreator ? (
                <>
                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                      Your Course
                    </span>
                  </div>
                  <Link to={`/courses/${id}/edit`}>
                    <button className="btn-primary w-full py-3 text-base mb-3">
                      <span className="flex items-center justify-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Edit Course
                      </span>
                    </button>
                  </Link>
                  <button
                    className="btn-secondary w-full py-2.5 text-sm mb-3"
                    onClick={() => navigate(`/courses/${id}/edit`)}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Layers className="w-4 h-4" />
                      Manage Sessions
                    </span>
                  </button>
                  <button
                    className="btn-secondary w-full py-2.5 text-sm"
                    onClick={openStudentsModal}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4" />
                      Manage Students ({course.enrollmentCount || 0})
                    </span>
                  </button>
                </>
              ) : isEnrolled ? (
                <>
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-txt-secondary">Progress</span>
                      <span className="text-yellow-400 font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-bdr">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-yellow-400 to-yellow-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={
                      !isStudent || !continueSessionId
                        ? '#'
                        : `/courses/${id}/sessions/${continueSessionId}`
                    }
                    className={!isStudent || !continueSessionId ? 'cursor-not-allowed opacity-50' : ''}
                    onClick={(e) => (!isStudent || !continueSessionId) && e.preventDefault()}
                  >
                    <button 
                      className="btn-primary w-full py-3 text-base mb-3"
                      disabled={!isStudent || isBlocked}
                      title={!isStudent ? 'Only students can continue learning' : isBlocked ? 'Your access is restricted' : ''}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Play className="w-4 h-4" />
                        {enrollment?.status === 'completed' ? 'Review Course' : 'Continue Learning'}
                      </span>
                    </button>
                  </Link>
                  {!isStudent && (
                    <p className="text-[10px] text-center text-red-400 mb-3 font-semibold">
                      Only students can access course content
                    </p>
                  )}
                  {isBlocked && (
                    <p className="text-[10px] text-center text-red-400 mb-3 font-semibold">
                      Your access to this course has been restricted by the instructor.
                    </p>
                  )}
                  {enrollment?.status === 'completed' ? (
                    <div className="p-4 bg-green-400/10 border-2 border-green-400/30 rounded-xl mb-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-400 font-bold mb-1">
                        <CheckCircle className="w-5 h-5" />
                        Course Completed
                      </div>
                      <p className="text-[10px] text-txt-muted italic">
                        You've finished this course! It will stay in your history permanently.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={handleUnenroll}
                        className="btn-danger w-full py-2.5 text-sm"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <LogOut className="w-4 h-4" />
                          Leave Course
                        </span>
                      </button>
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="w-full py-2 text-xs font-bold text-txt-muted hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Report this Course
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {course.type === 'classroom' ? (
                    <div className="p-4 bg-surface rounded-xl border-2 border-dashed border-bdr text-center">
                      <Key className="w-8 h-8 text-txt-muted mx-auto mb-2" />
                      <p className="text-sm font-bold text-txt">Private Classroom</p>
                      <p className="text-xs text-txt-muted mt-1">This class is only accessible via a join code.</p>
                      <button 
                        onClick={() => navigate('/courses')}
                        className="btn-secondary w-full mt-4 py-2 text-xs"
                      >
                        Back to Courses
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={`btn-primary w-full py-3 text-base ${!isStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleEnroll}
                        disabled={enrolling || (user && !isStudent)}
                      >
                        {enrolling ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Enrolling...
                          </span>
                        ) : course.price > 0 ? (
                          `Enroll for $${course.price}`
                        ) : (
                          'Enroll Now - Free'
                        )}
                      </button>
                      {user && !isStudent && (
                        <p className="text-[10px] text-center text-red-400 font-semibold">
                          Only users with the Student role can enroll in courses
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {isCreator && course.type === 'classroom' && course.classCode && (
                <div className="mt-4 p-4 bg-yellow-400/5 rounded-xl border-2 border-yellow-400/20">
                  <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest mb-1">Classroom Code</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-yellow-400 tracking-widest">{course.classCode}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(course.classCode);
                        // showToast is not defined here, but maybe it has a similar mechanism or I can just use alert
                        alert('Code copied to clipboard!');
                      }}
                      className="p-2 rounded-lg hover:bg-yellow-400/10 text-yellow-400 transition-colors"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-bdr space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted flex items-center gap-2"><BookOpen className="w-4 h-4" /> Sessions</span>
                  <span className="font-semibold text-txt">{sessions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Level</span>
                  <span className="font-semibold text-txt">{course.level || 'Beginner'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted flex items-center gap-2"><Globe className="w-4 h-4" /> Language</span>
                  <span className="font-semibold text-txt">{course.language || 'English'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted flex items-center gap-2"><Users className="w-4 h-4" /> Students</span>
                  <span className="font-semibold text-txt">{course.enrollmentCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-bdr">
            <div className="py-5 text-center">
              <p className="text-2xl font-black text-txt">{course.enrollmentCount || 0}</p>
              <p className="text-sm text-txt-muted">Students</p>
            </div>
            <div className="py-5 text-center">
              <p className="text-2xl font-black text-txt">{sessions.length}</p>
              <p className="text-sm text-txt-muted">Sessions</p>
            </div>
            <div className="py-5 text-center">
              <p className="text-2xl font-black text-yellow-400">{course.level || 'Beginner'}</p>
              <p className="text-sm text-txt-muted">Level</p>
            </div>
            <div className="py-5 text-center">
              <p className="text-2xl font-black text-txt">{course.language || 'English'}</p>
              <p className="text-sm text-txt-muted">Language</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-1 mb-8 border-b border-bdr">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === tab
                  ? 'text-yellow-400'
                  : 'text-txt-muted hover:text-txt-secondary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <div className="animate-fadeIn">
            <div className="card p-8 mb-6">
              <h2 className="text-2xl font-black text-txt mb-4">About this course</h2>
              <p className="text-txt-secondary leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>

            {course.learningPoints && course.learningPoints.length > 0 && (
              <div className="card p-8">
                <h2 className="text-2xl font-black text-txt mb-6">What you'll learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.learningPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-txt-secondary">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'Sessions' && (
          <div className="animate-fadeIn">
            <div className="card overflow-hidden">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-txt-muted">
                  No sessions available yet.
                </div>
              ) : (
                <div className="divide-y divide-bdr">
                  {sessions
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((session, index) => {
                      const isCompleted = completedSessions.has(session._id);
                      const isLocked = (!isEnrolled && !isCreator) || (isEnrolled && isBlocked) || session.isLocked;
                      return (
                        <div
                          key={session._id}
                          className={`flex items-center gap-4 p-5 transition-colors ${
                            isLocked ? 'opacity-50' : 'hover:bg-surface-input'
                          }`}
                        >
                          {/* Number / Status */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 ${
                              isCompleted
                                ? 'bg-green-400/10 text-green-400 border-green-400/30'
                                : 'bg-surface text-txt-muted border-bdr'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-txt truncate">
                              {session.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              {session.duration && (
                                <span className="text-xs text-txt-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {session.duration}
                                </span>
                              )}
                              {session.videoUrl && (
                                <span className="text-xs text-txt-muted flex items-center gap-1">
                                  <Play className="w-3 h-3" /> Video
                                </span>
                              )}
                              {session.pdfUrl && (
                                <span className="text-xs text-txt-muted flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> PDF
                                </span>
                              )}
                              {session.testId && (
                                <span className="text-xs text-blue-400 font-bold flex items-center gap-1 bg-blue-400/10 px-1.5 py-0.5 rounded">
                                  <ClipboardList className="w-3 h-3" /> Test Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lock or Play */}
                          {isLocked ? (
                            <Lock className="w-5 h-5 text-txt-muted flex-shrink-0" />
                          ) : (
                            <Link
                              to={`/courses/${id}/sessions/${session._id}`}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 text-sm font-semibold flex-shrink-0 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              {isAdmin ? 'Review Session' : 'Play'}
                            </Link>
                          )}
                        </div>
                      );
                    })}

                  {/* Integrated Final Exam Item */}
                  {course.finalTestId && (
                    (() => {
                      const allSessionsCompleted = sessions.length > 0 && sessions.every(s => completedSessions.has(s._id));
                      const isExamLocked = (!isEnrolled && !isCreator) || isBlocked || !allSessionsCompleted;
                      
                      return (
                        <div
                          className={`flex items-center gap-4 p-5 transition-colors border-t-2 border-pink-500/10 bg-pink-500/5 ${
                            isExamLocked ? 'opacity-50' : 'hover:bg-pink-500/10'
                          }`}
                        >
                          {/* Shield / Status Icon */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 ${
                              enrollment?.status === 'completed'
                                ? 'bg-green-400/10 text-green-400 border-green-400/30'
                                : 'bg-pink-500/10 text-pink-500 border-pink-500/30'
                            }`}
                          >
                            {enrollment?.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Shield className="w-5 h-5" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-txt truncate">Final Assessment</h4>
                              <span className="px-1.5 py-0.5 rounded bg-pink-500 text-white text-[9px] font-black uppercase tracking-tighter">
                                Secure
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-txt-muted flex items-center gap-1">
                                <Timer className="w-3 h-3 text-pink-500/50" /> Final Course Exam
                              </span>
                              {!allSessionsCompleted && isEnrolled && !isCreator && (
                                <span className="text-[10px] text-pink-500 font-bold uppercase flex items-center gap-1 bg-pink-500/10 px-1.5 py-0.5 rounded">
                                  <Lock className="w-2.5 h-2.5" /> Complete all sessions to unlock
                                </span>
                              )}
                              {allSessionsCompleted && enrollment?.status !== 'completed' && (
                                <span className="text-xs text-pink-500/70 font-bold flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Proctoring Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lock or Take Exam */}
                          {isExamLocked ? (
                            <Lock className="w-5 h-5 text-txt-muted flex-shrink-0" />
                          ) : enrollment?.status === 'completed' ? (
                            <div className="px-4 py-2 rounded-xl bg-green-400/10 text-green-400 text-xs font-black uppercase tracking-widest border border-green-400/20">
                              Passed
                            </div>
                          ) : (
                            <Link
                              to={`/tests/${course.finalTestId?._id || course.finalTestId}/take`}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-500 text-white hover:bg-pink-600 text-sm font-black shadow-[0_4px_0_0_#db2777] active:shadow-none active:translate-y-1 transition-all flex-shrink-0"
                            >
                              Start Exam
                            </Link>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'Tests' && (
          <div className="animate-fadeIn space-y-6">
            {/* Calendar */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-txt flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  Test Schedule
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-txt min-w-[120px] text-center">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {(() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const offset = firstDay === 0 ? 6 : firstDay - 1;
                const highlighted = getHighlightedDays();
                const today = new Date();
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
                return (
                  <div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-txt-muted py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: offset }, (_, i) => (
                        <div key={`empty-${i}`} className="h-10" />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isHighlighted = highlighted.has(day);
                        const isToday = isCurrentMonth && today.getDate() === day;
                        return (
                          <div key={day} className={`h-10 flex items-center justify-center rounded-lg text-sm relative transition-colors ${
                            isHighlighted
                              ? 'bg-yellow-400/15 text-yellow-400 font-bold border border-yellow-400/30'
                              : isToday
                              ? 'bg-surface-hover text-txt font-semibold'
                              : 'text-txt-muted'
                          }`}>
                            {day}
                            {isHighlighted && (
                              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-bdr text-xs text-txt-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-yellow-400/15 border border-yellow-400/30" />
                  Test available
                </span>
              </div>
            </div>

            {/* Test Cards */}
            {testsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
              </div>
            ) : courseTests.length === 0 ? (
              <div className="card p-8 text-center">
                <ClipboardList className="w-12 h-12 text-txt-muted mx-auto mb-3" />
                <h3 className="text-lg font-bold text-txt mb-1">No Tests Yet</h3>
                <p className="text-txt-muted text-sm">
                  {isCreator ? 'Add tests from the Edit Course page.' : 'The instructor hasn\'t added any tests yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {courseTests.map(test => {
                  const { status: testStatus, scheduledStart, scheduledEnd } = getTestStatus(test);
                  return (
                    <div key={test._id} className="card p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-txt truncate">{test.title}</h4>
                            {testStatus === 'open' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-400/10 text-green-400 border border-green-400/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Open
                              </span>
                            )}
                            {testStatus === 'upcoming' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-400/10 text-blue-400 border border-blue-400/20">
                                <Timer className="w-3 h-3" />
                                Upcoming
                              </span>
                            )}
                            {testStatus === 'closed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-400/10 text-red-400 border border-red-400/20">
                                <Lock className="w-3 h-3" />
                                Closed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-txt-muted">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {test.settings?.duration || 30} min</span>
                            <span>{test.questions?.length || 0} questions</span>
                            {testStatus === 'upcoming' && scheduledStart && (
                              <span className="text-blue-400 font-semibold">Opens in {formatCountdownTo(scheduledStart)}</span>
                            )}
                            {testStatus === 'open' && scheduledEnd && (
                              <span className="text-green-400 font-semibold">Closes in {formatCountdownTo(scheduledEnd)}</span>
                            )}
                          </div>
                        </div>
                        {testStatus === 'open' && (isEnrolled || isCreator) && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => (isStudent && !isBlocked) ? navigate(`/tests/${test._id}/take`) : null}
                              disabled={!isStudent || isBlocked}
                              className={`btn-primary text-sm px-4 py-2 flex-shrink-0 ${(!isStudent || isBlocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              Take Test
                            </button>
                            {!isStudent && (
                              <span className="text-[10px] text-red-400 font-semibold">Students only</span>
                            )}
                            {isBlocked && (
                              <span className="text-[10px] text-red-400 font-semibold">Access Restricted</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'Reviews' && (
          <div className="animate-fadeIn">
            {/* Review Form - only for enrolled users who are not blocked */}
            {isEnrolled && !isBlocked && (
              <form onSubmit={handleReviewSubmit} className="card p-6 mb-6">
                <h3 className="text-lg font-bold text-txt mb-4">Write a Review</h3>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }, (_, j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setReviewRating(j + 1)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-6 h-6 ${j < reviewRating ? 'text-yellow-400 fill-current' : 'text-txt-muted'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-txt-muted">{reviewRating}/5</span>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this course..."
                  rows={3}
                  maxLength={1000}
                  className="input-field resize-none mb-4"
                />
                <button type="submit" disabled={reviewSubmitting} className="btn-primary">
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {reviews.length === 0 && !isEnrolled ? (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-surface rounded-2xl border-2 border-bdr flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-txt-muted" />
                </div>
                <h3 className="text-lg font-bold text-txt mb-2">No reviews yet</h3>
                <p className="text-txt-muted">Enroll to be the first to review this course.</p>
              </div>
            ) : reviews.length === 0 ? null : (
              <div className="space-y-4">
                {reviews.map((review, i) => (
                  <div key={review._id || i} className="card p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-sm font-bold text-yellow-400 flex-shrink-0 border border-yellow-400/20">
                        {(review.user?.firstName || 'U')[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-txt">
                            {review.user?.firstName
                              ? `${review.user.firstName} ${review.user.lastName || ''}`
                              : 'Anonymous'}
                          </h4>
                          {/* Star rating */}
                          {review.rating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, j) => (
                                <Star
                                  key={j}
                                  className={`w-4 h-4 ${
                                    j < review.rating ? 'text-yellow-400 fill-current' : 'text-txt-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-txt-secondary text-sm">{review.comment || review.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage Students Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl border border-bdr max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-surface-card border-b border-bdr p-6">
              <h2 className="text-xl font-bold text-txt flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enrolled Students ({students.length})
              </h2>
              <button
                onClick={() => setShowStudentsModal(false)}
                className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-[2px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <p className="text-txt-muted text-center py-8">No students enrolled yet</p>
              ) : (
                <div className="space-y-2">
                  {students.map(student => (
                    <div key={student.enrollmentId} className="flex items-center justify-between bg-surface p-4 rounded-lg border border-bdr hover:border-yellow-400/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 font-bold border border-yellow-400/20">
                            {student.firstName?.[0] || 'S'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-txt truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-txt-muted truncate">{student.email}</p>
                          <div className="flex gap-3 mt-1 text-xs text-txt-muted">
                            <span>Progress: {student.progress}%</span>
                            <span>Sessions: {student.completedSessions}</span>
                            {student.certificateEarned && (
                              <span className="text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleBlock(student.enrollmentId)}
                          disabled={blockingStudent === student.enrollmentId}
                          className={`p-2 rounded-lg transition-colors ${
                            student.isBlocked 
                              ? 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20' 
                              : 'text-txt-muted hover:bg-surface-hover'
                          }`}
                          title={student.isBlocked ? 'Unblock student' : 'Block student'}
                        >
                          {blockingStudent === student.enrollmentId ? (
                            <div className="w-4 h-4 border-2 border-txt-muted/30 border-t-txt-muted rounded-full animate-spin" />
                          ) : (
                            <Lock className={`w-4 h-4 ${student.isBlocked ? 'fill-current' : ''}`} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveStudent(student.enrollmentId)}
                          disabled={removingStudent === student.enrollmentId}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition-colors"
                          title="Remove student"
                        >
                          {removingStudent === student.enrollmentId ? (
                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="course" 
        contentId={id}
        reportedUser={course.instructor?._id || course.instructor}
        contentSnapshot={`Course: ${course.title}`}
      />
    </div>
  );
};

export default CourseDetail;
