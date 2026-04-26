import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Play,
  FileText, Video, Download, Trophy
} from 'lucide-react';
import api from '../../utils/api.js';
import useAuth from '../../hooks/useAuth.js';

/**
 * Converts a video URL to an embeddable format.
 * Supports YouTube and Vimeo links.
 */
const getEmbedUrl = (url) => {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
};

const SessionPlayer = () => {
  const { courseId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(new Set());
  const [progress, setProgress] = useState(0);
  const [slideDir, setSlideDir] = useState('');
  const [showCongrats, setShowCongrats] = useState(false);
  const congratsRef = useRef(null);

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/courses/${courseId}`);
      const { course: courseData, sessions: sessionData, enrollment: enrollmentData } = res.data;
      const data = courseData || res.data;
      setCourse(data);

      const sortedSessions = (sessionData || []).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );
      setSessions(sortedSessions);

      const current = sortedSessions.find((s) => s._id === sessionId) || sortedSessions[0];
      setCurrentSession(current);

      setProgress(enrollmentData?.progress || 0);
      const completed = (enrollmentData?.completedSessions || []).map((s) =>
        typeof s === 'string' ? s : s._id
      );
      setCompletedSessions(new Set(completed));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [courseId, sessionId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // When sessionId changes in URL, update the current session
  useEffect(() => {
    if (sessions.length > 0) {
      const session = sessions.find((s) => s._id === sessionId);
      if (session) {
        setCurrentSession(session);
      }
    }
  }, [sessionId, sessions]);

  useEffect(() => {
    if (!showCongrats || !congratsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(congratsRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo('.congrats-trophy',
        { scale: 0, rotation: -15 },
        { scale: 1, rotation: 0, duration: 0.6, delay: 0.2, ease: 'back.out(1.7)' }
      );
      gsap.fromTo('.congrats-text',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, delay: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo('.confetti-particle',
        { y: 0, opacity: 1, scale: 0 },
        {
          y: () => gsap.utils.random(-200, 200),
          x: () => gsap.utils.random(-250, 250),
          rotation: () => gsap.utils.random(-360, 360),
          scale: 1,
          opacity: 0,
          duration: 2,
          delay: () => gsap.utils.random(0.2, 0.8),
          ease: 'power2.out',
          stagger: 0.05,
        }
      );
    }, congratsRef);
    const timer = setTimeout(() => setShowCongrats(false), 5000);
    return () => { ctx.revert(); clearTimeout(timer); };
  }, [showCongrats]);

  const currentIndex = sessions.findIndex((s) => s._id === currentSession?._id);
  const prevSession = currentIndex > 0 ? sessions[currentIndex - 1] : null;
  const nextSession = currentIndex < sessions.length - 1 ? sessions[currentIndex + 1] : null;

  const navigateSession = (session, direction) => {
    setSlideDir(direction === 'next' ? 'slide-left' : 'slide-right');
    setTimeout(() => {
      navigate(`/courses/${courseId}/sessions/${session._id}`);
      setSlideDir('');
    }, 200);
  };

  const handleMarkComplete = async () => {
    setCompleting(true);
    try {
      await api.post(`/api/courses/${courseId}/sessions/${currentSession._id}/complete`);
      setCompletedSessions((prev) => new Set([...prev, currentSession._id]));

      // Recalculate progress
      const newCompleted = completedSessions.size + 1;
      const newProgress = sessions.length > 0 ? (newCompleted / sessions.length) * 100 : 0;
      setProgress(newProgress);

      if (completedSessions.size + 1 >= sessions.length) {
        setShowCongrats(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  const embedUrl = getEmbedUrl(currentSession?.videoUrl);
  const isCurrentCompleted = completedSessions.has(currentSession?._id);

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
          <h3 className="text-lg font-bold text-txt mb-2">Something went wrong</h3>
          <p className="text-txt-muted mb-4">{error}</p>
          <button onClick={() => navigate(`/courses/${courseId}`)} className="btn-secondary">
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Progress bar at top */}
      <div className="h-1 bg-gray-900 w-full">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top nav */}
      <div className="bg-surface border-b border-bdr px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex items-center gap-2 text-txt-muted hover:text-yellow-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Back to Course</span>
            </button>
            <div className="hidden md:block text-sm text-txt-muted">
              <span className="text-txt font-semibold">{course?.title}</span>
            </div>
          </div>
          <div className="text-sm text-txt-muted font-medium">
            <span className="text-yellow-400">{currentIndex + 1}</span> / {sessions.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <div className={`session-content ${slideDir}`}>
            {/* Video Player */}
            <div className="bg-black">
              <div className="max-w-5xl mx-auto">
                {embedUrl ? (
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src={embedUrl}
                      title={currentSession?.title}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : currentSession?.videoUrl ? (
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <video
                      src={currentSession.videoUrl}
                      controls
                      className="absolute inset-0 w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center bg-surface-card"
                    style={{ paddingTop: '56.25%', position: 'relative' }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Video className="w-16 h-16 text-txt-muted mb-3" />
                      <p className="text-txt-muted">No video available for this session</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-surface px-6 py-6">
              <div className="max-w-5xl mx-auto">
                {error && (
                  <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-black text-txt mb-1">
                      {currentSession?.title}
                    </h2>
                    {currentSession?.description && (
                      <p className="text-txt-muted mt-2">{currentSession.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {currentSession?.pdfUrl && (
                      <a
                        href={currentSession.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        View PDF
                      </a>
                    )}

                    {isCurrentCompleted ? (
                      <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-400/10 text-green-400 text-sm font-semibold border-2 border-green-400/20">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <button
                        onClick={handleMarkComplete}
                        disabled={completing}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        {completing ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {completing ? 'Saving...' : 'Mark as Complete'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Previous / Next buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-bdr">
                  {prevSession ? (
                    <button
                      onClick={() => navigateSession(prevSession, 'prev')}
                      className="flex items-center gap-3 text-txt-muted hover:text-yellow-400 transition-colors group"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-xs text-txt-muted">Previous</p>
                        <p className="text-sm font-semibold group-hover:text-yellow-400 transition-colors">{prevSession.title}</p>
                      </div>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextSession ? (
                    <button
                      onClick={() => navigateSession(nextSession, 'next')}
                      className="flex items-center gap-3 text-txt-muted hover:text-yellow-400 transition-colors text-right group"
                    >
                      <div>
                        <p className="text-xs text-txt-muted">Next</p>
                        <p className="text-sm font-semibold group-hover:text-yellow-400 transition-colors">{nextSession.title}</p>
                      </div>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Session List */}
        <div
          className="w-full lg:w-80 bg-surface-card border-t lg:border-t-0 lg:border-l border-bdr overflow-y-auto"
        >
          <div className="p-4 border-b border-bdr">
            <h3 className="text-sm font-bold text-txt uppercase tracking-wide">
              Course Content
            </h3>
            <p className="text-xs text-txt-muted mt-1">
              <span className="text-yellow-400 font-semibold">{completedSessions.size}</span> of {sessions.length} completed
            </p>
          </div>

          <div className="divide-y divide-bdr">
            {sessions.map((session, index) => {
              const isActive = session._id === currentSession?._id;
              const isCompleted = completedSessions.has(session._id);
              return (
                <button
                  key={session._id}
                  onClick={() => {
                    const dir = index > currentIndex ? 'next' : 'prev';
                    navigateSession(session, dir);
                  }}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                    isActive
                      ? 'bg-yellow-400/5 border-l-2 border-l-yellow-400'
                      : 'hover:bg-surface-input border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Status indicator */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                      isCompleted
                        ? 'bg-green-400/10 text-green-400 border-green-400/20'
                        : isActive
                        ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                        : 'bg-surface text-txt-muted border-bdr'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? 'text-yellow-400' : 'text-txt-secondary'
                      }`}
                    >
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {session.duration && (
                        <p className="text-xs text-txt-muted">{session.duration}</p>
                      )}
                      {session.videoUrl && <Play className="w-3 h-3 text-txt-muted" />}
                      {session.pdfUrl && <FileText className="w-3 h-3 text-txt-muted" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showCongrats && (
        <div
          ref={congratsRef}
          onClick={() => setShowCongrats(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="confetti-particle absolute left-1/2 top-1/2"
                style={{
                  width: `${8 + (i % 3) * 4}px`,
                  height: `${8 + (i % 3) * 4}px`,
                  backgroundColor: ['#FACC15', '#3B82F6', '#22C55E', '#A855F7', '#F97316', '#EC4899'][i % 6],
                  borderRadius: i % 3 === 0 ? '50%' : '2px',
                }}
              />
            ))}
          </div>
          <div className="text-center relative z-10">
            <div className="congrats-trophy mb-6">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-yellow-400/20 border-2 border-yellow-400/40 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-yellow-400" />
              </div>
            </div>
            <div className="congrats-text">
              <h2 className="text-4xl font-black text-white mb-2">Congratulations!</h2>
              <p className="text-xl text-yellow-400 font-bold mb-2">Course Completed</p>
              <p className="text-txt-muted">You finished all {sessions.length} sessions</p>
              <p className="text-sm text-txt-muted mt-4">Click anywhere to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionPlayer;
