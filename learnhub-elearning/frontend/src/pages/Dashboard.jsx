import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { BookOpen, TrendingUp, Award, PlusCircle, Search, MessageSquare, ClipboardCheck, ArrowRight, Users, Zap } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import api from '../utils/api.js';
import InstructorRequestModal from '../components/InstructorRequestModal.jsx';
import { UserCheck } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instructorRequest, setInstructorRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [enrolledRes, createdRes, postsRes] = await Promise.allSettled([
          api.get('/api/courses/enrolled/list'),
          api.get('/api/courses/my-courses/list'),
          api.get('/api/community/posts?limit=5'),
        ]);

        if (enrolledRes.status === 'fulfilled') setEnrolledCourses(enrolledRes.value.data);
        if (createdRes.status === 'fulfilled') setCreatedCourses(createdRes.value.data);
        if (postsRes.status === 'fulfilled') setRecentPosts(postsRes.value.data.posts || []);

        // Fetch instructor request status if student
        if (user?.roles?.includes('student') && !user?.roles?.includes('instructor')) {
          const { data } = await api.get('/api/instructor-requests/my');
          setInstructorRequest(data);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo('.stat-card', { y: 30, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power3.out',
        });
        gsap.fromTo('.content-section', { y: 40, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.3,
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [loading]);

  const activeCourses = enrolledCourses.filter(c => c.status === 'active');
  const completedCourses = enrolledCourses.filter(c => c.status === 'completed');

  const stats = [
    { label: 'Enrolled', value: enrolledCourses.length, icon: BookOpen, color: 'yellow' },
    { label: 'In Progress', value: activeCourses.length, icon: TrendingUp, color: 'blue' },
    { label: 'Completed', value: completedCourses.length, icon: Award, color: 'green' },
    { label: 'Teaching', value: createdCourses.length, icon: Users, color: 'purple' },
  ];

  const colorMap = {
    yellow: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' },
    blue: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
    green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
    purple: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20' },
  };

  const quickActions = [
    { label: 'Browse Courses', icon: Search, to: '/courses', color: 'hover:bg-yellow-400/5 hover:text-yellow-400' },
    { label: 'Create Course', icon: PlusCircle, to: '/courses/create', color: 'hover:bg-green-400/5 hover:text-green-400' },
    { label: 'Community', icon: MessageSquare, to: '/community', color: 'hover:bg-blue-400/5 hover:text-blue-400' },
    { label: 'Take a Test', icon: ClipboardCheck, to: '/tests', color: 'hover:bg-purple-400/5 hover:text-purple-400' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 skeleton w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 skeleton" />
          <div className="h-64 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-txt">
          Welcome back, <span className="text-yellow-400">{user?.firstName}</span>
        </h1>
        <p className="text-txt-muted mt-1">Here's your learning overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const c = colorMap[stat.color];
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <span className={`badge ${c.bg} ${c.text} border ${c.border}`}>{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-txt">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning */}
        <div className="lg:col-span-2 content-section">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-txt flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" /> Continue Learning
              </h2>
              <Link to="/courses/my" className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activeCourses.length > 0 ? (
              <div className="space-y-3">
                {activeCourses.slice(0, 4).map(course => (
                  <div
                    key={course._id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-bdr/50
                               hover:border-yellow-400/20 cursor-pointer transition-all group"
                    onClick={() => navigate(`/courses/${course._id}`)}
                  >
                    <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-txt truncate group-hover:text-yellow-400 transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
                            style={{ width: `${course.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-yellow-400 whitespace-nowrap">{course.progress || 0}%</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-txt-muted group-hover:text-yellow-400 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-txt-muted mx-auto mb-3" />
                <p className="text-txt-muted mb-4">No courses yet. Start learning today!</p>
                <button onClick={() => navigate('/courses')} className="btn-primary">
                  Browse Courses
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="content-section card p-5">
            <h2 className="text-lg font-bold text-txt mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.to} onClick={() => navigate(action.to)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-txt-secondary transition-all ${action.color}`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructor Request for Students */}
          {user?.roles?.includes('student') && !user?.roles?.includes('instructor') && (
            <div className="content-section card p-5 bg-gradient-to-br from-yellow-400/5 to-transparent border-yellow-400/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-txt">Teaching</h2>
                  <p className="text-xs text-txt-muted">Share your knowledge</p>
                </div>
              </div>
              
              {instructorRequest?.status === 'pending' ? (
                <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-center">
                  <p className="text-sm font-bold text-yellow-400">Request Pending</p>
                  <p className="text-[10px] text-yellow-400/70 mt-1">We're reviewing your application</p>
                </div>
              ) : instructorRequest?.status === 'rejected' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-center">
                    <p className="text-sm font-bold text-red-400">Request Rejected</p>
                  </div>
                  <button 
                    onClick={() => setShowRequestModal(true)}
                    className="w-full btn-primary py-2 text-sm"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowRequestModal(true)}
                  className="w-full btn-primary py-2 text-sm"
                >
                  Become an Instructor
                </button>
              )}
            </div>
          )}

          {/* Recent Posts */}
          <div className="content-section card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-txt">Community</h2>
              <Link to="/community" className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentPosts.length > 0 ? (
              <div className="space-y-2">
                {recentPosts.slice(0, 3).map(post => (
                  <div key={post._id}
                    className="p-3 rounded-xl hover:bg-surface-hover cursor-pointer transition-all"
                    onClick={() => navigate(`/community/${post._id}`)}>
                    <p className="font-medium text-txt-secondary text-sm truncate">{post.title}</p>
                    <p className="text-xs text-txt-muted mt-1">
                      {post.likes?.length || 0} likes · {post.comments?.length || 0} comments
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-txt-muted text-sm text-center py-4">No posts yet</p>
            )}
          </div>
        </div>
      </div>

      <InstructorRequestModal 
        isOpen={showRequestModal} 
        onClose={() => setShowRequestModal(false)} 
        user={user}
      />
    </div>
  );
};

export default Dashboard;
