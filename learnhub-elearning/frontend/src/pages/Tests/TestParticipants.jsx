import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Clock, Link2, CheckCircle, XCircle, Eye, Share2, ShieldAlert, Smartphone, UserX, Users2, EyeOff } from 'lucide-react';
import api from '../../utils/api.js';

const TestParticipants = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testInfo, setTestInfo] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const cardsRef = useRef([]);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/tests/${testId}/attempts`);
        setTestInfo(data.test);
        setAttempts(data.attempts || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load participants');
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [testId]);

  // GSAP stagger
  useEffect(() => {
    if (!loading && attempts.length > 0 && cardsRef.current.length > 0) {
      const loadGsap = async () => {
        try {
          const gsap = (await import('gsap')).default || (await import('gsap')).gsap;
          gsap.fromTo(
            cardsRef.current.filter(Boolean),
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
          );
        } catch {
          cardsRef.current.forEach((el) => { if (el) el.style.opacity = '1'; });
        }
      };
      loadGsap();
    }
  }, [loading, attempts]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/tests/${testId}/take`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // Stats
  const submitted = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
  const avgScore = submitted.length > 0
    ? Math.round(submitted.reduce((sum, a) => sum + (a.percentage || 0), 0) / submitted.length)
    : 0;
  const passRate = submitted.length > 0
    ? Math.round((submitted.filter(a => a.passed).length / submitted.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tests')}
          className="inline-flex items-center gap-2 text-txt-muted hover:text-yellow-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tests
        </button>

        {/* Header */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-txt">{testInfo?.title || 'Test'}</h1>
              <p className="text-txt-muted text-sm mt-1">
                {testInfo?.questionCount || 0} questions &middot; {testInfo?.settings?.duration || 0} min &middot; {testInfo?.settings?.passingScore || 60}% to pass
              </p>
            </div>
            <button
              onClick={copyLink}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-green-400/10 text-green-400 border-2 border-green-400/20'
                  : 'bg-yellow-400/10 text-yellow-400 border-2 border-yellow-400/20 hover:bg-yellow-400/20'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Share Test Link'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="bg-surface rounded-xl p-4 border border-bdr text-center">
              <div className="text-2xl font-black text-txt">{attempts.length}</div>
              <div className="text-xs text-txt-muted font-medium mt-1">Participants</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-bdr text-center">
              <div className="text-2xl font-black text-yellow-400">{avgScore}%</div>
              <div className="text-xs text-txt-muted font-medium mt-1">Avg Score</div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-bdr text-center">
              <div className="text-2xl font-black text-green-400">{passRate}%</div>
              <div className="text-xs text-txt-muted font-medium mt-1">Pass Rate</div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty */}
        {!error && attempts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-surface-card border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-txt-muted" />
            </div>
            <h3 className="text-xl font-bold text-txt mb-2">No participants yet</h3>
            <p className="text-txt-muted mb-6">Share the test link and people will appear here!</p>
            <button onClick={copyLink} className="btn-primary inline-flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Copy Test Link
            </button>
          </div>
        )}

        {/* Participant List */}
        {attempts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-txt mb-3">Participants ({attempts.length})</h2>
            {attempts.map((attempt, index) => {
              const user = attempt.userId;
              const isInProgress = attempt.status === 'in-progress';

              return (
                <div
                  key={attempt._id}
                  ref={(el) => (cardsRef.current[index] = el)}
                  style={{ opacity: 0 }}
                  className="bg-surface-card border-2 border-bdr rounded-xl p-4 hover:border-yellow-400/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-sm font-bold text-yellow-400 flex-shrink-0">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        (user?.firstName?.charAt(0) || '?').toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-txt text-sm truncate">
                        {user ? `${user.firstName} ${user.lastName || ''}` : 'Unknown User'}
                      </p>
                      <p className="text-xs text-txt-muted truncate">{user?.email || ''}</p>
                    </div>

                    {/* Score */}
                    {!isInProgress ? (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-txt">{attempt.score}/{attempt.totalPoints}</p>
                          <p className="text-xs text-txt-muted">{formatTime(attempt.timeTaken)}</p>
                        </div>

                        {/* Percentage */}
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                          attempt.passed ? 'bg-green-400/10 border border-green-400/20' : 'bg-red-400/10 border border-red-400/20'
                        }`}>
                          <span className={`text-sm font-black ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
                            {attempt.percentage}%
                          </span>
                          {attempt.passed
                            ? <CheckCircle className="w-3 h-3 text-green-400" />
                            : <XCircle className="w-3 h-3 text-red-400" />
                          }
                        </div>

                        {/* View Answers */}
                        <button
                          onClick={() => navigate(`/tests/results/${attempt._id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-hover text-txt-secondary hover:text-yellow-400 border border-bdr hover:border-yellow-400/30 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Answers
                        </button>
                      </div>
                    ) : (
                      <span className="badge badge-accent inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </div>

                  {/* Mobile score row */}
                  {!isInProgress && (
                    <div className="flex items-center justify-between mt-3 sm:hidden pt-3 border-t border-bdr">
                      <span className="text-xs text-txt-muted">
                        {attempt.score}/{attempt.totalPoints} &middot; {formatTime(attempt.timeTaken)}
                      </span>
                      <span className="text-xs text-txt-muted">{formatDate(attempt.submittedAt)}</span>
                    </div>
                  )}

                  {/* Anti-Cheat Details */}
                  {!isInProgress && attempt.proctoringData && (
                    <div className="mt-4 pt-4 border-t border-bdr">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-bold text-txt-secondary">Anti-Cheat Report</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Looking Away */}
                        <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                          attempt.proctoringData.lookingAwayPercent > 15 
                            ? 'bg-red-400/5 border-red-400/20 text-red-400' 
                            : attempt.proctoringData.lookingAwayPercent > 5
                              ? 'bg-yellow-400/5 border-yellow-400/20 text-yellow-400'
                              : 'bg-surface border-bdr text-txt-muted'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            <EyeOff className="w-3.5 h-3.5" /> 
                            <span>Looking Away</span>
                          </div>
                          <div className="text-lg font-black">{Math.round(attempt.proctoringData.lookingAwayPercent || 0)}%</div>
                          <div className="text-[10px] opacity-70">{attempt.proctoringData.lookingAwayCount || 0} occurrences</div>
                        </div>

                        {/* Phone Detected */}
                        <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                          (attempt.proctoringData.phoneDetectedCount || 0) > 0 
                            ? 'bg-red-400/5 border-red-400/20 text-red-400' 
                            : 'bg-surface border-bdr text-txt-muted'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            <Smartphone className="w-3.5 h-3.5" /> 
                            <span>Phone</span>
                          </div>
                          <div className="text-lg font-black">{Math.round(attempt.proctoringData.phoneDetectionPercent || 0)}%</div>
                          <div className="text-[10px] opacity-70">{attempt.proctoringData.phoneDetectedCount || 0} occurrences</div>
                        </div>

                        {/* Multiple People */}
                        <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                          (attempt.proctoringData.multiplePersonsCount || 0) > 0 
                            ? 'bg-red-400/5 border-red-400/20 text-red-400' 
                            : 'bg-surface border-bdr text-txt-muted'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            <Users2 className="w-3.5 h-3.5" /> 
                            <span>Multiple People</span>
                          </div>
                          <div className="text-lg font-black">{Math.round(attempt.proctoringData.unauthorizedPersonPercent || 0)}%</div>
                          <div className="text-[10px] opacity-70">{attempt.proctoringData.multiplePersonsCount || 0} occurrences</div>
                        </div>

                        {/* No Face */}
                        <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                          (attempt.proctoringData.noPersonCount || 0) > 0 
                            ? 'bg-yellow-400/5 border-yellow-400/20 text-yellow-400' 
                            : 'bg-surface border-bdr text-txt-muted'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                            <UserX className="w-3.5 h-3.5" /> 
                            <span>No Person</span>
                          </div>
                          <div className="text-lg font-black">{Math.round(attempt.proctoringData.noPersonPercent || 0)}%</div>
                          <div className="text-[10px] opacity-70">{attempt.proctoringData.noPersonCount || 0} occurrences</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestParticipants;
