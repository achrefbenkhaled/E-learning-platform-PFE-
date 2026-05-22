import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, HelpCircle, Users, Plus, FileQuestion, Trash2, Link2, Eye, CheckCircle, FileEdit, Archive, Shield } from 'lucide-react';
import api from '../../utils/api.js';
import useAuth from '../../hooks/useAuth.js';

const TestBrowser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'applied'
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const cardsRef = useRef([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'created') {
        const { data } = await api.get('/api/tests/my');
        setTests(data.tests || []);
      } else {
        const { data } = await api.get('/api/tests/my-attempts');
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || `Failed to load ${activeTab} tests`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // GSAP stagger animation
  useEffect(() => {
    if (!loading && (tests.length > 0 || attempts.length > 0) && cardsRef.current.length > 0) {
      const loadGsap = async () => {
        try {
          const gsap = (await import('gsap')).default || (await import('gsap')).gsap;
          gsap.fromTo(
            cardsRef.current.filter(Boolean),
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }
          );
        } catch {
          cardsRef.current.forEach((el) => { if (el) el.style.opacity = '1'; });
        }
      };
      loadGsap();
    }
  }, [loading, tests, attempts, activeTab]);

  const copyLink = (testId) => {
    const link = `${window.location.origin}/tests/${testId}/take`;
    navigator.clipboard.writeText(link);
    setCopiedId(testId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (testId) => {
    try {
      await api.delete(`/api/tests/${testId}`);
      setTests((prev) => prev.filter((t) => t._id !== testId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test');
    }
  };

  const statusConfig = {
    published: { label: 'Published', color: 'green', icon: CheckCircle },
    draft: { label: 'Draft', color: 'gray', icon: FileEdit },
    archived: { label: 'Archived', color: 'red', icon: Archive },
  };

  // Rendering helpers defined inside component to access state/handlers
  const renderCreatedTest = (test, index, type) => {
    const cfg = statusConfig[test.status] || statusConfig.draft;
    const StatusIcon = cfg.icon;
    const isFinal = type === 'final';

    return (
      <div
        key={test._id}
        ref={(el) => (cardsRef.current[index + (isFinal ? 0 : 100)] = el)} // Offset for uniqueness
        style={{ opacity: 0 }}
        className={`bg-surface-card border-2 rounded-2xl p-6 transition-all group relative flex flex-col ${
          isFinal ? 'border-pink-500/20 hover:border-pink-500/50' : 'border-bdr hover:border-yellow-400/30'
        }`}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-${cfg.color}-400/10 text-${cfg.color}-400 border border-${cfg.color}-400/20`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          {isFinal && (
            <span className="px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-black uppercase tracking-wider">
              Secure
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className={`text-lg font-bold text-txt transition-colors mb-2 line-clamp-1 ${isFinal ? 'group-hover:text-pink-500' : 'group-hover:text-yellow-400'}`}>
          {test.title}
        </h3>
        <p className="text-txt-muted text-sm mb-4 line-clamp-2 flex-1">
          {test.description || 'No description provided.'}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {test.settings?.duration && (
            <span className={`badge inline-flex items-center gap-1 ${isFinal ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'badge-accent'}`}>
              <Clock className="w-3 h-3" /> {test.settings.duration} min
            </span>
          )}
          {test.questions && (
            <span className="badge badge-purple inline-flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> {test.questions.length} questions
            </span>
          )}
          <span className="badge badge-blue inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {test.attemptCount || 0} participants
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-bdr">
          <button
            onClick={() => copyLink(test._id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              copiedId === test._id
                ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                : 'bg-surface-hover text-txt-secondary hover:text-yellow-400 border border-bdr hover:border-yellow-400/30'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            {copiedId === test._id ? 'Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={() => navigate(`/tests/${test._id}/participants`)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-hover text-txt-secondary border border-bdr transition-all ${
              isFinal ? 'hover:text-pink-500 hover:border-pink-500/30' : 'hover:text-blue-400 hover:border-blue-400/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Participants
          </button>

          <button
            onClick={() => navigate(`/tests/${test._id}/edit`)}
            className={`p-2 rounded-lg text-txt-muted border border-transparent transition-all ${
              isFinal ? 'hover:text-pink-500 hover:bg-pink-500/10 hover:border-pink-500/20' : 'hover:text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/20'
            }`}
            title="Edit Test"
          >
            <FileEdit className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDeleteConfirm(test._id)}
            className="p-2 rounded-lg text-txt-muted hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all"
            title="Delete Test"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {deleteConfirm === test._id && (
          <div className="absolute inset-0 bg-surface-card/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 p-6 z-10 animate-scaleIn">
            <p className="text-sm font-bold text-txt text-center">Delete this test?</p>
            <p className="text-xs text-txt-muted text-center">This will permanently delete the test and all its data.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(test._id)}
                className="btn-danger text-xs px-4 py-1.5"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAppliedTest = (attempt, index, type) => {
    const test = attempt.testId;
    if (!test) return null;
    const isFinal = type === 'final';

    return (
      <div
        key={attempt._id}
        ref={(el) => (cardsRef.current[index + (isFinal ? 200 : 300)] = el)}
        style={{ opacity: 0 }}
        className={`bg-surface-card border-2 rounded-2xl p-6 transition-all group relative flex flex-col ${
          isFinal ? 'border-pink-500/20 hover:border-pink-500/50' : 'border-bdr hover:border-blue-400/30'
        }`}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            attempt.status === 'in-progress' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' : 
            attempt.passed ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 
            'bg-red-400/10 text-red-400 border border-red-400/20'
          }`}>
            {attempt.status === 'in-progress' ? 'In Progress' : (attempt.passed ? 'Passed' : 'Completed')}
          </span>
          {isFinal && (
            <Shield className="w-4 h-4 text-pink-500/50" />
          )}
        </div>

        {/* Title & Description */}
        <h3 className={`text-lg font-bold text-txt transition-colors mb-2 line-clamp-1 ${isFinal ? 'group-hover:text-pink-500' : 'group-hover:text-blue-400'}`}>
          {test.title}
        </h3>
        <p className="text-txt-muted text-sm mb-4 line-clamp-2 flex-1">
          Started: {new Date(attempt.startedAt).toLocaleDateString()}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {attempt.score !== undefined && attempt.totalPoints !== undefined && (
            <span className="badge badge-accent inline-flex items-center gap-1">
              Score: {attempt.score}/{attempt.totalPoints}
            </span>
          )}
          {attempt.percentage !== undefined && (
            <span className="badge badge-purple inline-flex items-center gap-1">
               {attempt.percentage}%
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-bdr">
          {attempt.status === 'in-progress' ? (
             <button
               onClick={() => navigate(`/tests/${test._id}/take`)}
               className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                 isFinal ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-yellow-400 text-black hover:bg-yellow-500'
               }`}
             >
               <Clock className="w-3.5 h-3.5" /> Resume {isFinal ? 'Exam' : 'Test'}
             </button>
          ) : (
             <button
               onClick={() => navigate(`/tests/results/${attempt._id}`)}
               className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-hover text-txt-secondary border border-bdr transition-all ${
                 isFinal ? 'hover:text-pink-500 hover:border-pink-500/30' : 'hover:text-blue-400 hover:border-blue-400/30'
               }`}
             >
               <Eye className="w-3.5 h-3.5" /> View Results
             </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 leading-tight">
          <div>
            <h1 className="text-3xl font-black text-txt">My Tests</h1>
            <p className="mt-1 text-txt-muted">Manage your tests and view your attempts</p>
          </div>
          {user?.roles?.includes('instructor') && (
            <button
              onClick={() => navigate('/tests/create')}
              className="btn-primary mt-4 sm:mt-0 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Test
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-bdr mb-8">
          <button 
            className={`pb-3 font-semibold transition-colors relative ${activeTab === 'created' ? 'text-yellow-400' : 'text-txt-muted hover:text-txt'}`}
            onClick={() => setActiveTab('created')}
          >
            Created Tests
            {activeTab === 'created' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />}
          </button>
          <button 
            className={`pb-3 font-semibold transition-colors relative ${activeTab === 'applied' ? 'text-yellow-400' : 'text-txt-muted hover:text-txt'}`}
            onClick={() => setActiveTab('applied')}
          >
            Applied Tests
            {activeTab === 'applied' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!error && activeTab === 'created' && tests.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-surface-card border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-8 h-8 text-txt-muted" />
            </div>
            {user?.roles?.includes('instructor') ? (
              <>
                <h3 className="text-xl font-bold text-txt mb-2">No tests yet</h3>
                <p className="text-txt-muted mb-6">Create your first test and share it with people!</p>
                <button
                  onClick={() => navigate('/tests/create')}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Test
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-txt mb-2">Instructor Access Required</h3>
                <p className="text-txt-muted">Only instructors can create tests. Contact an administrator to upgrade your account.</p>
              </>
            )}
          </div>
        )}

        {!error && activeTab === 'applied' && attempts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-surface-card border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-txt-muted" />
            </div>
            <h3 className="text-xl font-bold text-txt mb-2">No attempts yet</h3>
            <p className="text-txt-muted mb-6">You haven't participated in any tests yet.</p>
          </div>
        )}

        {/* Test Sections */}
        <div className="space-y-12">
          {activeTab === 'created' ? (
            <>
              {/* Created: Final Exams */}
              {tests.filter(t => t.type === 'final').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <Shield className="w-5 h-5 text-pink-500" />
                    <h2 className="text-xl font-black text-txt uppercase tracking-tight">Final Exams</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.filter(t => t.type === 'final').map((test, index) => renderCreatedTest(test, index, 'final'))}
                  </div>
                </div>
              )}

              {/* Created: Quizzes */}
              <div>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <HelpCircle className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-black text-txt uppercase tracking-tight">Practice Quizzes</h2>
                </div>
                {tests.filter(t => t.type !== 'final').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.filter(t => t.type !== 'final').map((test, index) => renderCreatedTest(test, index, 'quiz'))}
                  </div>
                ) : (
                  <div className="card p-8 text-center bg-surface-card border-dashed">
                    <p className="text-txt-muted text-sm italic">No practice quizzes found.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Applied: Final Exams */}
              {attempts.filter(a => a.testId?.type === 'final').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <Shield className="w-5 h-5 text-pink-500" />
                    <h2 className="text-xl font-black text-txt uppercase tracking-tight">Final Exam Results</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {attempts.filter(a => a.testId?.type === 'final').map((attempt, index) => renderAppliedTest(attempt, index, 'final'))}
                  </div>
                </div>
              )}

              {/* Applied: Quizzes */}
              <div>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <HelpCircle className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-black text-txt uppercase tracking-tight">Quiz Attempts</h2>
                </div>
                {attempts.filter(a => a.testId?.type !== 'final').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {attempts.filter(a => a.testId?.type !== 'final').map((attempt, index) => renderAppliedTest(attempt, index, 'quiz'))}
                  </div>
                ) : (
                  <div className="card p-8 text-center bg-surface-card border-dashed">
                    <p className="text-txt-muted text-sm italic">No quiz attempts found.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestBrowser;
