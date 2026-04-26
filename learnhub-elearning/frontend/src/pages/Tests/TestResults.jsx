import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, XCircle, Clock, CheckCircle, HelpCircle, ArrowLeft, Check, X } from 'lucide-react';
import api from '../../utils/api.js';

const TestResults = () => {
  const { testId, attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/tests/attempts/${attemptId}`);
        // API returns { attempt, testTitle, results }
        const merged = {
          ...(data.attempt || data),
          testTitle: data.testTitle || data.attempt?.testTitle,
          questions: data.results || data.attempt?.responses || [],
        };
        setResult(merged);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/tests')}
            className="btn-primary"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const score = result?.score ?? 0;
  const totalPoints = result?.totalPoints ?? 0;
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = result?.passed ?? percentage >= (result?.passingScore ?? 50);
  const timeTaken = result?.timeTaken
    ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`
    : 'N/A';
  const showResults = result?.showResults ?? true;
  const questions = result?.questions || result?.answers || [];
  const answeredCount = questions.filter(
    (q) => q.userAnswer !== undefined && q.userAnswer !== null && q.userAnswer !== ''
  ).length;

  // Score circle dimensions
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Card */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-8 text-center mb-8">
          {/* Score Circle */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg width="140" height="140" className="-rotate-90">
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke="#1f2937"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke={passed ? '#FACC15' : '#EF4444'}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute">
              <span className="text-4xl font-black text-txt">{percentage}%</span>
            </div>
          </div>

          {/* Pass/Fail Badge */}
          <div className="mb-4">
            {passed ? (
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                <Trophy className="w-4 h-4" /> Passed
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-red-400/10 text-red-400 border border-red-400/20">
                <XCircle className="w-4 h-4" /> Failed
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-txt mb-1">
            {result?.testTitle || result?.test?.title || 'Test Results'}
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-txt">
              {score}/{totalPoints}
            </p>
            <p className="text-xs text-txt-muted mt-1">Score</p>
          </div>
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-txt-muted" />
              <p className="text-2xl font-black text-txt">{timeTaken}</p>
            </div>
            <p className="text-xs text-txt-muted mt-1">Time Taken</p>
          </div>
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-txt">{answeredCount}</p>
            <p className="text-xs text-txt-muted mt-1">Answered</p>
          </div>
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-txt">{questions.length}</p>
            <p className="text-xs text-txt-muted mt-1">Total Questions</p>
          </div>
        </div>

        {/* Detailed Results */}
        {showResults && questions.length > 0 && (
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold text-txt mb-5">Detailed Results</h2>
            <div className="space-y-4">
              {questions.map((q, index) => {
                const isCorrect = q.isCorrect ?? q.correct ?? false;
                return (
                  <div
                    key={q._id || q.questionId || index}
                    className={`border-2 rounded-xl p-4 ${
                      isCorrect
                        ? 'border-green-400/30 bg-green-400/5'
                        : 'border-red-400/30 bg-red-400/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-bold text-txt-secondary">
                        Q{index + 1}. {q.text || q.questionText || q.question}
                      </span>
                      {isCorrect ? (
                        <span className="badge badge-green inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Correct
                        </span>
                      ) : (
                        <span className="badge badge-red inline-flex items-center gap-1">
                          <X className="w-3 h-3" /> Wrong
                        </span>
                      )}
                    </div>
                    {q.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-3 my-3">
                        {q.attachments.map((att, ai) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.url || '');
                          return isImage ? (
                            <img key={ai} src={att.url} alt={att.name || `Attachment ${ai + 1}`}
                              className="max-w-xs max-h-48 rounded-lg border-2 border-bdr object-contain" />
                          ) : (
                            <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border-2 border-bdr rounded-lg text-xs font-medium text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                              {att.name || 'View File'}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <div className="text-sm space-y-1 mt-2">
                      <p className="text-txt-secondary">
                        <span className="font-medium">Your answer:</span>{' '}
                        <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {q.userAnswer || q.answer || 'No answer'}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-txt-secondary">
                          <span className="font-medium">Correct answer:</span>{' '}
                          <span className="text-green-400">
                            {q.correctAnswer || 'N/A'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/tests')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tests
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
