import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { API_BASE } from '../config';

type AntiCheatStatus = {
  active: boolean;
  validToken: boolean;
  violation: boolean;
  reasons: string[];
  reason: string | null;
};

type ProctorReport = {
  updatedAt: string | null;
  stdout: string;
  stderr: string;
  summary: string | null;
};

type ProctorStats = {
  running: boolean;
  error: string | null;
  duration_seconds: number;
  total_frames: number;
  looking_away_percent: number;
  phone_detection_percent: number;
  unauthorized_person_percent: number;
  no_person_percent: number;
  away_count: number;
  phone_detected_count: number;
  unauthorized_person_detected_count: number;
  no_person_detected_count: number;
};

type Question = {
  _id: string;
  question: string;
  type: string;
  options?: string[];
  points: number;
  attachments?: { url: string; name: string }[];
};

type TestInfo = {
  _id: string;
  title: string;
  description: string;
  questionCount: number;
  settings: {
    duration: number;
    passingScore: number;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    scheduleWindows?: { startTime: string; endTime: string }[];
    showResults: boolean;
  };
};

type SubmitResult = {
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  testTitle: string;
  showResults: boolean;
};

const AC_POLL_MS = 7000;
const PROCTOR_WEB_BASE = import.meta.env.VITE_PROCTOR_WEB_URL || 'http://127.0.0.1:5050';
const ANSWERS_KEY = 'ac_exam_answers';
const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || '';

export default function ExamPage() {
  const { testId: paramTestId } = useParams();
  const [searchParams] = useSearchParams();
  const acToken = searchParams.get('token') || searchParams.get('acToken') || '';
  const authTokenParam = searchParams.get('auth') || '';
  const refreshTokenParam = searchParams.get('refresh') || '';
  const testId = paramTestId || '';

  // Store tokens in refs to avoid stale closures
  const jwtRef = useRef(authTokenParam || localStorage.getItem('ac_jwt') || '');
  const refreshRef = useRef(refreshTokenParam || localStorage.getItem('ac_refresh') || '');
  const [, setTokenVersion] = useState(0); // trigger re-render on token change

  useEffect(() => {
    if (authTokenParam) { localStorage.setItem('ac_jwt', authTokenParam); jwtRef.current = authTokenParam; }
    if (refreshTokenParam) { localStorage.setItem('ac_refresh', refreshTokenParam); refreshRef.current = refreshTokenParam; }
  }, [authTokenParam, refreshTokenParam]);

  // Auto-refresh helper: wraps fetch, retries once on 401 with refresh token
  const authFetch = useCallback(async (url: string, opts: RequestInit = {}): Promise<Response> => {
    const doFetch = (token: string) => fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
    });

    let res = await doFetch(jwtRef.current);
    if (res.status === 401 && refreshRef.current) {
      // Try to refresh
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshRef.current }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          jwtRef.current = data.accessToken;
          refreshRef.current = data.refreshToken;
          localStorage.setItem('ac_jwt', data.accessToken);
          localStorage.setItem('ac_refresh', data.refreshToken);
          setTokenVersion(v => v + 1);
          res = await doFetch(data.accessToken);
        }
      } catch { /* refresh failed, return original 401 */ }
    }
    return res;
  }, []);

  // Anti-cheat state
  const [acView, setAcView] = useState<'loading' | 'verified' | 'blocked'>('loading');
  const [blockMessage, setBlockMessage] = useState('');

  // Test state
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'info' | 'exam' | 'submitting' | 'results' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Refs for latest state (used in timer callbacks to avoid stale closures)
  const answersRef = useRef<Record<string, string>>({});
  const attemptIdRef = useRef<string | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const phaseRef = useRef(phase);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  // Proctor
  const [proctor, setProctor] = useState<ProctorReport | null>(null);
  const [proctorStats, setProctorStats] = useState<ProctorStats | null>(null);
  const [frameOk, setFrameOk] = useState(false);

  // --- Anti-cheat polling ---
  useEffect(() => {
    if (!acToken) {
      // No anti-cheat token — skip AC verification, go straight to test
      setAcView('verified');
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/anticheat/status/${encodeURIComponent(acToken)}`);
        const data = (await res.json()) as AntiCheatStatus;
        if (cancelled) return;
        if (data.violation) {
          const extra = data.reasons?.length ? ` (${data.reasons.join('; ')})` : '';
          setBlockMessage(`Exam locked: environment violation detected.${extra}`);
          setAcView('blocked');
          return;
        }
        if (!data.active || !data.validToken) {
          if (data.reason === 'invalid_token') {
            setBlockMessage('Anti-cheat session invalid. Re-open the exam from the desktop app.');
          } else if (data.reason === 'heartbeat_timeout') {
            setBlockMessage('Anti-cheat session expired. Re-open the exam from the desktop app with protection ON.');
          } else {
            setBlockMessage('Anti-cheat is not active. Enable it in the desktop client.');
          }
          setAcView('blocked');
          return;
        }
        setAcView('verified');
      } catch {
        if (!cancelled) {
          setBlockMessage('Cannot reach the anti-cheat verification server.');
          setAcView('blocked');
        }
      }
    };
    void poll();
    const id = setInterval(poll, AC_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [acToken]);

  // --- Proctor polling ---
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/proctor/report`);
        if (res.ok) { const data = await res.json(); if (!cancelled) setProctor(data); }
      } catch { /* ignore */ }
    };
    void pull();
    const id = setInterval(pull, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(`${PROCTOR_WEB_BASE}/stats`);
        if (res.ok) { const data = await res.json(); if (!cancelled) setProctorStats(data); }
      } catch { /* keep old */ }
    };
    void pull();
    const id = setInterval(pull, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // --- Load test info ---
  useEffect(() => {
    if (!testId) { setPhase('error'); setErrorMsg('No test ID provided'); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exam/${testId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || 'Test not found');
          setPhase('error');
          return;
        }
        const data = await res.json();
        setTestInfo(data);
        setPhase('info');
      } catch {
        setErrorMsg('Cannot reach exam server');
        setPhase('error');
      }
    };
    void load();
  }, [testId]);

  // --- Restore saved answers ---
  useEffect(() => {
    if (!testId) return;
    const saved = localStorage.getItem(`${ANSWERS_KEY}_${testId}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [testId]);

  // --- Persist answers ---
  useEffect(() => {
    if (phase === 'exam' && testId && Object.keys(answers).length > 0) {
      localStorage.setItem(`${ANSWERS_KEY}_${testId}`, JSON.stringify(answers));
    }
  }, [answers, phase, testId]);

  // --- Timer ---
  useEffect(() => {
    if (phase !== 'exam' || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            // Use refs to get latest state (avoids stale closure)
            doSubmit(true);
          }
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]); // only depends on phase, not timeRemaining

  // --- Start test ---
  const handleStart = async () => {
    if (!jwtRef.current) { setErrorMsg('Authentication required. Please go back and try again.'); setPhase('error'); return; }
    try {
      setPhase('loading');
      const res = await authFetch(`${API_BASE}/api/exam/${testId}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.attemptId) {
          // Already submitted — go to results
          setAttemptId(data.attemptId);
          setErrorMsg(data.error || 'Already submitted');
          setPhase('error');
          return;
        }
        setErrorMsg(data.error || 'Failed to start test');
        setPhase('error');
        return;
      }
      setAttemptId(data.attemptId);
      setQuestions(data.questions || []);
      setTimeRemaining(data.remainingMs || (data.duration || 30) * 60 * 1000);
      setPhase('exam');
    } catch {
      setErrorMsg('Network error starting test');
      setPhase('error');
    }
  };

  // --- Submit test (ref-based for timer auto-submit) ---
  const doSubmit = async (auto = false) => {
    if (phaseRef.current === 'submitting' || phaseRef.current === 'results') return;
    setShowConfirm(false);
    setPhase('submitting');
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const curAnswers = answersRef.current;
      const curQuestions = questionsRef.current;
      const curAttemptId = attemptIdRef.current;

      // Build answers in the format the backend expects
      const formattedAnswers: Record<string, string> = {};
      curQuestions.forEach((q, index) => {
        const qId = q._id || index.toString();
        if (curAnswers[qId] !== undefined) {
          formattedAnswers[qId] = curAnswers[qId];
        }
      });

      const res = await authFetch(`${API_BASE}/api/exam/submit`, {
        method: 'POST',
        body: JSON.stringify({ attemptId: curAttemptId, answers: formattedAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit');
        setPhase('error');
        return;
      }
      // Clean up
      localStorage.removeItem(`${ANSWERS_KEY}_${testId}`);
      setSubmitResult(data);
      setPhase('results');
    } catch {
      setErrorMsg('Network error submitting test. Your answers are saved locally.');
      setPhase('exam');
    }
  };

  const handleSubmit = (auto = false) => doSubmit(auto);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '').length;

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining < 60000 && timeRemaining > 0;

  // --- Blocked by anti-cheat ---
  if (acView === 'blocked') {
    return (
      <div className="exam-lock-screen">
        <div className="exam-lock-card">
          <h1>Exam Locked</h1>
          <p>{blockMessage}</p>
        </div>
        <style>{lockStyles}</style>
      </div>
    );
  }

  // --- AC still loading ---
  if (acView === 'loading') {
    return (
      <div style={loadingStyle}>
        <div className="spinner" />
        Verifying anti-cheat session...
        <style>{spinnerCss}</style>
      </div>
    );
  }

  // --- Error ---
  if (phase === 'error') {
    return (
      <div className="exam-page">
        <div className="center-card">
          <div className="error-icon">!</div>
          <h2>Error</h2>
          <p>{errorMsg}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            {MAIN_APP_URL && (
              <a href={MAIN_APP_URL} className="btn btn-secondary" style={{ display: 'inline-block' }}>
                Back to Main App
              </a>
            )}
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // --- Loading ---
  if (phase === 'loading') {
    return (
      <div style={loadingStyle}>
        <div className="spinner" />
        Loading...
        <style>{spinnerCss}</style>
      </div>
    );
  }

  // --- Results ---
  if (phase === 'results' && submitResult) {
    const pct = submitResult.percentage;
    return (
      <div className="exam-page">
        <div className="center-card" style={{ maxWidth: 500 }}>
          <div className={`result-badge ${submitResult.passed ? 'passed' : 'failed'}`}>
            {submitResult.passed ? 'PASSED' : 'FAILED'}
          </div>
          <h2>{submitResult.testTitle}</h2>
          <div className="score-circle">
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none"
                stroke={submitResult.passed ? '#22c55e' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 327} 327`}
                transform="rotate(-90 60 60)" />
            </svg>
            <span className="score-text">{pct}%</span>
          </div>
          <div className="stats-row">
            <div><strong>{submitResult.score}</strong>/{submitResult.totalPoints} points</div>
          </div>
          {MAIN_APP_URL && (
            <a href={`${MAIN_APP_URL}/tests/results/${submitResult.attemptId}`} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              View Detailed Results
            </a>
          )}
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // --- Submitting ---
  if (phase === 'submitting') {
    return (
      <div style={loadingStyle}>
        <div className="spinner" />
        Submitting your answers...
        <style>{spinnerCss}</style>
      </div>
    );
  }

  // --- Test info (start screen) ---
  if (phase === 'info' && testInfo) {
    const now = new Date();
    const windows = testInfo.settings.scheduleWindows || [];
    let scheduleOk = true;
    let scheduleMsg = '';

    if (windows.length > 0) {
      const inWindow = windows.some(w => now >= new Date(w.startTime) && now <= new Date(w.endTime));
      if (!inWindow) {
        const future = windows.filter(w => new Date(w.startTime) > now).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        if (future.length > 0) {
          scheduleOk = false;
          scheduleMsg = `Test opens: ${new Date(future[0].startTime).toLocaleString()}`;
        } else {
          scheduleOk = false;
          scheduleMsg = 'All test windows have closed.';
        }
      }
    } else {
      if (testInfo.settings.scheduledStartTime && now < new Date(testInfo.settings.scheduledStartTime)) {
        scheduleOk = false;
        scheduleMsg = `Test opens: ${new Date(testInfo.settings.scheduledStartTime).toLocaleString()}`;
      }
      if (testInfo.settings.scheduledEndTime && now > new Date(testInfo.settings.scheduledEndTime)) {
        scheduleOk = false;
        scheduleMsg = 'Test has ended.';
      }
    }

    return (
      <div className="exam-page">
        <div className="center-card" style={{ maxWidth: 520 }}>
          <div className="ac-badge">Anti-Cheat Protected</div>
          <h2>{testInfo.title}</h2>
          {testInfo.description && <p className="desc">{testInfo.description}</p>}
          <div className="info-badges">
            <span className="info-badge">{testInfo.settings.duration} min</span>
            <span className="info-badge">{testInfo.questionCount} questions</span>
            <span className="info-badge">{testInfo.settings.passingScore}% to pass</span>
          </div>
          {!scheduleOk && <p className="schedule-warn">{scheduleMsg}</p>}
          {!jwtRef.current && <p className="schedule-warn">Authentication missing. Please access this from the main platform.</p>}
          <button
            className="btn btn-primary btn-full"
            disabled={!scheduleOk || !jwtRef.current}
            onClick={handleStart}
          >
            Start Test
          </button>
        </div>

        {/* Camera overlay on start screen */}
        {acToken && (
          <aside className="camera-overlay-mini">
            <img
              src={`${PROCTOR_WEB_BASE}/video_feed`}
              alt="Camera"
              onLoad={() => setFrameOk(true)}
              onError={() => setFrameOk(false)}
              style={{ display: frameOk ? 'block' : 'none', width: '100%', borderRadius: 8 }}
            />
            {!frameOk && <div className="camera-mini-fallback">Camera loading...</div>}
          </aside>
        )}
        <style>{pageStyles}</style>
      </div>
    );
  }

  // --- Exam (taking test) ---
  if (phase === 'exam' && questions.length > 0) {
    const timerPct = testInfo ? Math.max(0, Math.min(100, (timeRemaining / ((testInfo.settings.duration || 30) * 60 * 1000)) * 100)) : 100;
    const imageExts = /\.(png|jpe?g|gif|webp|svg)$/i;

    return (
      <div className="exam-active">
        {/* Camera overlay */}
        {acToken && (
          <aside className="camera-overlay">
            <h2>Live Camera</h2>
            <div className="camera-wrap">
              <img
                src={`${PROCTOR_WEB_BASE}/video_feed`}
                alt="Proctor camera"
                onLoad={() => setFrameOk(true)}
                onError={() => setFrameOk(false)}
                style={{ display: frameOk ? 'block' : 'none' }}
              />
              {!frameOk && <div className="camera-fallback">Camera unavailable</div>}
            </div>
          </aside>
        )}

        {/* Timer bar */}
        <div className="timer-bar">
          <div className="timer-progress" style={{ width: `${timerPct}%`, background: isLowTime ? '#ef4444' : 'linear-gradient(90deg, #eab308, #f59e0b)' }} />
          <div className="timer-content">
            <span className="timer-title">{testInfo?.title}</span>
            <span className={`timer-clock ${isLowTime ? 'low' : ''}`}>{formatTime(timeRemaining)}</span>
            <span className="timer-count">{answeredCount}/{questions.length} answered</span>
          </div>
        </div>

        <div className="exam-layout">
          {/* Sidebar */}
          <div className="q-sidebar">
            <h3>Questions</h3>
            <div className="q-grid">
              {questions.map((q, i) => {
                const qId = q._id || i.toString();
                const isAnswered = answers[qId] !== undefined && answers[qId] !== '';
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={qId}
                    onClick={() => setCurrentIndex(i)}
                    className={`q-btn ${isCurrent ? 'current' : isAnswered ? 'answered' : ''}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} onClick={() => setShowConfirm(true)}>
              Submit Test
            </button>
          </div>

          {/* Question */}
          <div className="q-main">
            {currentQuestion && (
              <div className="q-card">
                <div className="q-header">
                  <span className="q-badge">Question {currentIndex + 1} of {questions.length}</span>
                  <span className="q-points">{currentQuestion.points || 1} pt{(currentQuestion.points || 1) !== 1 ? 's' : ''}</span>
                </div>
                <h3 className="q-text">{currentQuestion.question}</h3>

                {/* Multiple choice */}
                {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                  <div className="options">
                    {currentQuestion.options.map((opt, oi) => {
                      const qId = currentQuestion._id || currentIndex.toString();
                      const isSelected = answers[qId] === opt;
                      return (
                        <label key={oi} className={`option ${isSelected ? 'selected' : ''}`}>
                          <input type="radio" name={`q-${qId}`} checked={isSelected} onChange={() => setAnswer(qId, opt)} />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short answer */}
                {currentQuestion.type === 'short-answer' && (
                  <textarea
                    className="text-input"
                    rows={5}
                    value={answers[currentQuestion._id || currentIndex.toString()] || ''}
                    onChange={e => setAnswer(currentQuestion._id || currentIndex.toString(), e.target.value)}
                    placeholder="Type your answer here..."
                  />
                )}

                {/* File response */}
                {currentQuestion.type === 'file-response' && (() => {
                  const qId = currentQuestion._id || currentIndex.toString();
                  return (
                    <div>
                      {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          {currentQuestion.attachments.map((att, ai) => {
                            const url = att.url || (att as unknown as string);
                            return imageExts.test(url) ? (
                              <img key={ai} src={url} alt={att.name || `Attachment ${ai + 1}`} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, border: '1px solid #334155' }} />
                            ) : (
                              <a key={ai} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#eab308', fontSize: '0.9rem', marginBottom: 4 }}>
                                {att.name || `Attachment ${ai + 1}`}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      <textarea
                        className="text-input"
                        rows={5}
                        value={answers[qId] || ''}
                        onChange={e => setAnswer(qId, e.target.value)}
                        placeholder="Type your answer here..."
                      />
                    </div>
                  );
                })()}

                {/* Navigation */}
                <div className="q-nav">
                  <button className="btn btn-secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}>
                    Previous
                  </button>
                  {currentIndex < questions.length - 1 ? (
                    <button className="btn btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>
                      Next
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>
                      Finish
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Proctor details */}
            {acToken && (
              <div className="proctor-console">
                <h3>Proctor Monitoring</h3>
                {proctorStats && (
                  <div className="stats-grid">
                    <div><strong>Looking away:</strong> {proctorStats.away_count}</div>
                    <div><strong>Phone:</strong> {proctorStats.phone_detected_count}</div>
                    <div><strong>Multiple persons:</strong> {proctorStats.unauthorized_person_detected_count}</div>
                    <div><strong>No person:</strong> {proctorStats.no_person_detected_count}</div>
                  </div>
                )}
                {proctor?.stdout?.trim() && (
                  <pre className="proctor-pre">{proctor.stdout}</pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirm modal */}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Submit Test?</h3>
              <p>You have answered {answeredCount} of {questions.length} questions.</p>
              {answeredCount < questions.length && (
                <p style={{ color: '#eab308' }}>{questions.length - answeredCount} question(s) unanswered.</p>
              )}
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSubmit(false)}>Submit</button>
              </div>
            </div>
          </div>
        )}

        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div style={loadingStyle}>
      <div className="spinner" />
      Loading exam...
      <style>{spinnerCss}</style>
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0f172a',
  color: '#94a3b8',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  fontFamily: 'system-ui, sans-serif',
};

const spinnerCss = `
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid #334155;
    border-top-color: #eab308;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const lockStyles = `
  .exam-lock-screen {
    min-height: 100vh; background: #450a0a; color: #fecaca;
    display: flex; align-items: center; justify-content: center;
    padding: 2rem; font-family: system-ui, sans-serif;
  }
  .exam-lock-card {
    max-width: 520px; background: #7f1d1d; border: 1px solid #f87171;
    border-radius: 16px; padding: 2rem; box-shadow: 0 0 40px rgba(239,68,68,0.25);
  }
  .exam-lock-card h1 { margin: 0 0 1rem; color: #fef2f2; font-size: 1.5rem; }
  .exam-lock-card p { margin: 0; line-height: 1.5; }
`;

const pageStyles = `
  * { box-sizing: border-box; }
  .exam-page, .exam-active {
    min-height: 100vh; background: #0f172a; color: #e2e8f0;
    font-family: system-ui, sans-serif; padding: 2rem;
  }
  .center-card {
    max-width: 460px; margin: 0 auto; background: #1e293b;
    border: 1px solid #334155; border-radius: 20px; padding: 2rem; text-align: center;
  }
  .center-card h2 { margin: 0.5rem 0; font-size: 1.5rem; }
  .desc { color: #94a3b8; font-size: 0.95rem; margin: 0.5rem 0 1rem; }
  .ac-badge {
    display: inline-block; background: #14532d; color: #86efac;
    font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem;
    border-radius: 999px; margin-bottom: 0.75rem; letter-spacing: 0.05em;
  }
  .info-badges { display: flex; gap: 0.5rem; justify-content: center; margin: 1rem 0; flex-wrap: wrap; }
  .info-badge {
    background: #1e3a5f; color: #93c5fd;
    font-size: 0.8rem; font-weight: 600; padding: 0.35rem 0.75rem;
    border-radius: 999px;
  }
  .schedule-warn {
    background: #422006; color: #fdba74; border: 1px solid #92400e;
    border-radius: 12px; padding: 0.75rem; font-size: 0.85rem; margin: 1rem 0;
  }
  .error-icon {
    width: 48px; height: 48px; background: #7f1d1d; color: #fca5a5;
    border-radius: 12px; font-size: 1.5rem; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
  }
  .btn {
    padding: 0.7rem 1.25rem; font-size: 0.95rem; font-weight: 600;
    border: none; border-radius: 12px; cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: #eab308; color: #000; }
  .btn-primary:hover:not(:disabled) { background: #ca8a04; }
  .btn-secondary { background: #334155; color: #e2e8f0; }
  .btn-secondary:hover:not(:disabled) { background: #475569; }
  .btn-full { width: 100%; }

  /* Results */
  .result-badge {
    display: inline-block; font-size: 0.8rem; font-weight: 800;
    padding: 0.4rem 1rem; border-radius: 999px; letter-spacing: 0.1em; margin-bottom: 0.5rem;
  }
  .result-badge.passed { background: #14532d; color: #86efac; }
  .result-badge.failed { background: #7f1d1d; color: #fca5a5; }
  .score-circle { position: relative; display: inline-block; margin: 1rem 0; }
  .score-text {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 1.5rem; font-weight: 900;
  }
  .stats-row { color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem; }

  /* Timer bar */
  .timer-bar {
    position: sticky; top: 0; z-index: 40;
    background: #1e293b; border-bottom: 1px solid #334155;
  }
  .timer-progress { height: 3px; transition: width 1s linear; }
  .timer-content {
    max-width: 900px; margin: 0 auto; padding: 0.75rem 1rem;
    display: flex; align-items: center; justify-content: space-between;
  }
  .timer-title { font-size: 0.85rem; font-weight: 600; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .timer-clock {
    font-family: 'Consolas', monospace; font-size: 1.1rem; font-weight: 900;
    background: #1a2332; padding: 0.3rem 0.75rem; border-radius: 8px;
    border: 1px solid #334155; color: #eab308;
  }
  .timer-clock.low { color: #ef4444; border-color: #7f1d1d; animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .timer-count { font-size: 0.8rem; color: #64748b; }

  /* Exam layout */
  .exam-active { padding-right: 2rem; }
  .exam-layout {
    max-width: 900px; margin: 1.5rem auto 0;
    display: flex; gap: 1.5rem;
  }
  .q-sidebar {
    width: 200px; flex-shrink: 0;
    background: #1e293b; border: 1px solid #334155; border-radius: 16px;
    padding: 1rem; position: sticky; top: 80px; align-self: flex-start;
  }
  .q-sidebar h3 { margin: 0 0 0.75rem; font-size: 0.85rem; color: #94a3b8; }
  .q-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .q-btn {
    width: 36px; height: 36px; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
    border: 2px solid #334155; background: #0f172a; color: #64748b; cursor: pointer;
    transition: all 0.1s;
  }
  .q-btn:hover { border-color: #475569; }
  .q-btn.current { background: #eab308; color: #000; border-color: #000; }
  .q-btn.answered { background: rgba(34,197,94,0.1); color: #22c55e; border-color: rgba(34,197,94,0.3); }
  .q-main { flex: 1; min-width: 0; }
  .q-card {
    background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 1.5rem;
  }
  .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .q-badge {
    background: #1e3a5f; color: #93c5fd; font-size: 0.75rem; font-weight: 700;
    padding: 0.3rem 0.6rem; border-radius: 999px;
  }
  .q-points { font-size: 0.8rem; color: #64748b; }
  .q-text { margin: 0 0 1.25rem; font-size: 1.05rem; line-height: 1.5; }
  .options { display: flex; flex-direction: column; gap: 0.5rem; }
  .option {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.85rem 1rem; border-radius: 12px;
    border: 2px solid #334155; cursor: pointer; transition: all 0.15s;
  }
  .option:hover { border-color: #475569; background: #1a2332; }
  .option.selected { border-color: rgba(234,179,8,0.5); background: rgba(234,179,8,0.05); }
  .option input[type="radio"] { accent-color: #eab308; }
  .text-input {
    width: 100%; background: #0f172a; color: #e2e8f0; border: 2px solid #334155;
    border-radius: 12px; padding: 0.85rem; font-family: inherit; font-size: 0.95rem;
    resize: vertical;
  }
  .text-input:focus { outline: none; border-color: #eab308; }
  .q-nav { display: flex; justify-content: space-between; margin-top: 1.5rem; }

  /* Camera overlay */
  .camera-overlay {
    position: fixed; top: 1rem; right: 1rem; width: 280px;
    background: #111827; border: 1px solid #334155; border-radius: 12px;
    padding: 0.75rem; z-index: 20; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  }
  .camera-overlay h2 { margin: 0 0 0.4rem; font-size: 0.85rem; color: #93c5fd; }
  .camera-wrap {
    position: relative; width: 100%; aspect-ratio: 4/3;
    border: 1px solid #334155; border-radius: 8px; overflow: hidden; background: #020617;
  }
  .camera-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-fallback {
    position: absolute; inset: 0; display: grid; place-items: center;
    color: #94a3b8; font-size: 0.8rem; pointer-events: none;
  }
  .camera-overlay-mini {
    position: fixed; bottom: 1rem; right: 1rem; width: 180px;
    border-radius: 12px; overflow: hidden; border: 2px solid #334155; z-index: 10;
  }
  .camera-mini-fallback {
    padding: 1rem; background: #111827; color: #64748b; font-size: 0.75rem; text-align: center;
  }

  /* Proctor console */
  .proctor-console {
    margin-top: 1.5rem; background: #111827; border: 1px solid #334155;
    border-radius: 12px; padding: 1rem;
  }
  .proctor-console h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #93c5fd; }
  .stats-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 0.3rem 1rem; margin-bottom: 0.75rem;
    color: #cbd5e1; font-size: 0.85rem;
  }
  .proctor-pre {
    margin: 0; max-height: 150px; overflow: auto; white-space: pre-wrap;
    font-family: Consolas, monospace; font-size: 0.75rem; color: #e2e8f0;
    background: #0b1220; border: 1px solid #1f2937; border-radius: 8px; padding: 0.5rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  }
  .modal-card {
    background: #1e293b; border: 1px solid #334155;
    border-radius: 16px; padding: 1.5rem; max-width: 380px; width: 90%;
  }
  .modal-card h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
  .modal-card p { margin: 0 0 0.25rem; font-size: 0.9rem; color: #94a3b8; }
  .modal-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  .modal-actions .btn { flex: 1; }

  @media (max-width: 768px) {
    .exam-layout { flex-direction: column; }
    .q-sidebar { width: 100%; position: static; }
    .camera-overlay { width: 160px; }
  }
`;
