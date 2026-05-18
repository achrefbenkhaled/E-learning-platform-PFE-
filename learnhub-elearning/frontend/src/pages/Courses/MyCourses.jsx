import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  BookOpen, Plus, Users, Layers, Pencil, Trash2, GraduationCap, Rocket
} from 'lucide-react';
import api from '../../utils/api.js';
import useAuth from '../../hooks/useAuth.js';
import CourseCard from '../../components/course/CourseCard.jsx';

const TABS = ['Enrolled Courses', 'Created Courses'];

const MyCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const gridRef = useRef(null);

  const [activeTab, setActiveTab] = useState('Enrolled Courses');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);
  const [loadingCreated, setLoadingCreated] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchEnrolled = useCallback(async () => {
    setLoadingEnrolled(true);
    try {
      const res = await api.get('/api/courses/enrolled/list');
      setEnrolledCourses(res.data.courses || res.data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || 'Failed to load enrolled courses');
      }
    } finally {
      setLoadingEnrolled(false);
    }
  }, []);

  const fetchCreated = useCallback(async () => {
    setLoadingCreated(true);
    try {
      const res = await api.get('/api/courses/my-courses/list');
      setCreatedCourses(res.data.courses || res.data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || 'Failed to load your courses');
      }
    } finally {
      setLoadingCreated(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrolled();
    fetchCreated();
  }, [fetchEnrolled, fetchCreated]);

  // GSAP stagger on cards
  const isLoading = activeTab === 'Enrolled Courses' ? loadingEnrolled : loadingCreated;
  const courses = activeTab === 'Enrolled Courses' ? enrolledCourses : createdCourses;

  useEffect(() => {
    if (!isLoading && courses.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.my-course-card');
      gsap.fromTo(
        cards,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      );
    }
  }, [isLoading, courses, activeTab]);

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    setDeleting(courseId);
    try {
      await api.delete(`/api/courses/${courseId}`);
      setCreatedCourses((prev) => prev.filter((c) => (c._id || c.course?._id) !== courseId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-txt">My Courses</h1>
              <p className="text-txt-muted mt-1">
                Manage your learning journey and course creations
              </p>
            </div>
            {user?.roles?.includes('instructor') && (
              <Link to="/courses/create">
                <button className="btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Course
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <Link to="/courses" className="px-5 py-3 text-sm font-semibold text-txt-muted hover:text-txt-secondary transition-colors">
              Discover Courses
            </Link>
            <span className="px-5 py-3 text-sm font-semibold text-yellow-400 relative cursor-default">
              My Courses
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-bdr">
          {TABS.filter(tab => 
            (tab === 'Enrolled Courses' && user?.roles?.includes('student')) || 
            (tab === 'Created Courses' && user?.roles?.includes('instructor'))
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
                activeTab === tab
                  ? 'text-yellow-400'
                  : 'text-txt-muted hover:text-txt-secondary'
              }`}
            >
              {tab === 'Enrolled Courses' ? <GraduationCap className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-surface-card rounded-2xl border-2 border-bdr flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-txt-muted" />
            </div>
            <h3 className="text-xl font-bold text-txt mb-2">
              {activeTab === 'Enrolled Courses'
                ? "You haven't enrolled in any courses yet"
                : "You haven't created any courses yet"}
            </h3>
            <p className="text-txt-muted mb-6">
              {activeTab === 'Enrolled Courses'
                ? 'Browse our catalog to find courses that interest you.'
                : 'Share your expertise by creating your first course.'}
            </p>
            {activeTab === 'Enrolled Courses' ? (
              <Link to="/courses">
                <button className="btn-primary">Browse Courses</button>
              </Link>
            ) : (
              <Link to="/courses/create">
                <button className="btn-primary">Create Your First Course</button>
              </Link>
            )}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((item) => {
              const course = item.course || item;
              const courseProgress = item.progress || 0;
              const courseId = course._id;

              return (
                <div key={courseId} className="my-course-card opacity-0">
                  <div className="card overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="relative h-40 bg-surface border-b border-bdr overflow-hidden flex items-center justify-center">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <BookOpen className="w-10 h-10 text-txt-muted" />
                      )}
                      <span
                        className={`absolute top-3 right-3 px-3 py-1 rounded-lg text-xs font-bold border-2 ${
                          course.price === 0
                            ? 'bg-green-400/10 text-green-400 border-green-400/30'
                            : 'bg-yellow-400 text-black border-black'
                        }`}
                      >
                        {course.price === 0 ? 'Free' : `$${course.price}`}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-accent">{course.level || 'Beginner'}</span>
                      </div>

                      <Link to={`/courses/${courseId}`}>
                        <h3 className="text-lg font-bold text-txt mb-1 hover:text-yellow-400 transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                      </Link>
                      <p className="text-txt-muted text-sm mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      {/* Enrolled tab: progress bar + continue */}
                      {activeTab === 'Enrolled Courses' && (
                        <>
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="text-txt-muted">Progress</span>
                              <span className="font-bold text-yellow-400">{Math.round(courseProgress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-bdr">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  courseProgress >= 100
                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                    : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                }`}
                                style={{ width: `${courseProgress}%` }}
                              />
                            </div>
                          </div>
                          <div className="pt-4 border-t border-bdr">
                            <Link to={`/courses/${courseId}`}>
                              <button className="btn-primary w-full">
                                {courseProgress >= 100 ? 'Review Course' : 'Continue Learning'}
                              </button>
                            </Link>
                          </div>
                        </>
                      )}

                      {/* Created tab: stats + edit/delete */}
                      {activeTab === 'Created Courses' && (
                        <>
                          <div className="flex items-center gap-4 text-sm text-txt-muted mb-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{course.enrollmentCount || 0} students</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />
                              <span>{course.totalSessions || course.sessions?.length || 0} sessions</span>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-bdr flex items-center gap-3">
                            <Link to={`/courses/${courseId}/edit`} className="flex-1">
                              <button className="btn-secondary w-full">
                                <span className="flex items-center justify-center gap-1.5">
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </span>
                              </button>
                            </Link>
                            <button
                              className="btn-danger flex-1"
                              onClick={() => handleDelete(courseId)}
                              disabled={deleting === courseId}
                            >
                              {deleting === courseId ? (
                                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mx-auto" />
                              ) : (
                                <span className="flex items-center justify-center gap-1.5">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </span>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
