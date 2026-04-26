import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Users, Award } from 'lucide-react';
import api from '../utils/api.js';
import { formatDate } from '../utils/helpers.js';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/users/${userId}/profile`);
        setProfile(data.user || data);
        setCourses(data.courses || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && profile && cardRef.current) {
      const loadGsap = async () => {
        try {
          const gsap = (await import('gsap')).default || (await import('gsap')).gsap;
          gsap.fromTo(
            cardRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
          );
        } catch {
          if (cardRef.current) cardRef.current.style.opacity = '1';
        }
      };
      loadGsap();
    }
  }, [loading, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 font-medium mb-4">{error || 'User not found'}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const initial = profile.firstName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-txt-muted hover:text-yellow-400 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <div ref={cardRef} style={{ opacity: 0 }}>
          {/* Profile Header Card */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-5">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={`${profile.firstName}'s avatar`}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-bdr flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-20 h-20 rounded-2xl bg-yellow-400/10 border-2 border-yellow-400/20 items-center justify-center text-2xl font-black text-yellow-400 flex-shrink-0 ${
                  profile.avatar ? 'hidden' : 'flex'
                }`}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-txt">
                  {profile.firstName} {profile.lastName}
                </h1>
                {profile.roles && profile.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.roles.map((role) => (
                      <span key={role} className="badge badge-accent text-xs capitalize">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
                {profile.bio && (
                  <p className="text-txt-secondary text-sm mt-3 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-bdr">
              <div className="text-center p-3 bg-surface rounded-xl">
                <div className="flex items-center justify-center gap-1.5 text-yellow-400 mb-1">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-xs text-txt-muted">Joined</p>
                <p className="text-sm font-bold text-txt">{formatDate(profile.createdAt)}</p>
              </div>
              <div className="text-center p-3 bg-surface rounded-xl">
                <div className="flex items-center justify-center gap-1.5 text-blue-400 mb-1">
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-xs text-txt-muted">Courses</p>
                <p className="text-sm font-bold text-txt">{profile.courseCount || courses.length || 0}</p>
              </div>
              <div className="text-center p-3 bg-surface rounded-xl">
                <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-xs text-txt-muted">Students</p>
                <p className="text-sm font-bold text-txt">{profile.studentCount || 0}</p>
              </div>
              <div className="text-center p-3 bg-surface rounded-xl">
                <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-xs text-txt-muted">Posts</p>
                <p className="text-sm font-bold text-txt">{profile.postCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Courses by this user */}
          {courses.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-txt mb-4">
                Courses by {profile.firstName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <Link
                    key={course._id}
                    to={`/courses/${course._id}`}
                    className="bg-surface-card border-2 border-bdr rounded-2xl p-5 hover:border-yellow-400/30 transition-all group"
                  >
                    <h3 className="text-base font-bold text-txt group-hover:text-yellow-400 transition-colors mb-1 line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-txt-muted text-sm mb-3 line-clamp-2">
                      {course.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {course.sessionCount !== undefined && (
                        <span className="badge badge-purple text-xs">
                          {course.sessionCount} sessions
                        </span>
                      )}
                      {course.enrollmentCount !== undefined && (
                        <span className="badge badge-green text-xs">
                          {course.enrollmentCount} enrolled
                        </span>
                      )}
                      {course.price !== undefined && (
                        <span className="badge badge-accent text-xs">
                          {course.price === 0 ? 'Free' : `$${course.price}`}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for courses */}
          {courses.length === 0 && (
            <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 text-center">
              <BookOpen className="w-8 h-8 text-txt-muted mx-auto mb-2" />
              <p className="text-txt-muted text-sm">
                {profile.firstName} hasn't published any courses yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
