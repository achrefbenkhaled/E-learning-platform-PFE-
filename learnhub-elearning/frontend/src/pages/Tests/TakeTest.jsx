import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, HelpCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, WifiOff, Play, Calendar, Lock, Timer, Camera, Shield } from 'lucide-react';
import api from '../../utils/api.js';
import { API_BASE_URL, ANTICHEAT_BASE_URL } from '../../utils/constants.js';
import { formatCountdownMs } from '../../utils/helpers.js';
import useAuth from '../../hooks/useAuth.js';
import useTimer from '../../hooks/useTimer.js';
import useAuthStore from '../../context/authStore.js';

const ANSWERS_KEY = 'test_answers';
const ATTEMPT_KEY = 'test_attempt';

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, getCurrentUser } = useAuth();
  const isStudent = user?.roles?.includes('student');

  // Test data
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Question navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  // Camera
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLost, setCameraLost] = useState(false);
  const [requireCamera, setRequireCamera] = useState(false);
  const videoRef = useRef(null);
  const miniVideoRef = useRef(null);

  // Anti-cheat status
  const [antiCheatActive, setAntiCheatActive] = useState(false);
  const [antiCheatToken, setAntiCheatToken] = useState(null);
  const [checkingAntiCheat, setCheckingAntiCheat] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [waitingForCamera, setWaitingForCamera] = useState(false);
  const [examLockedByAntiCheat, setExamLockedByAntiCheat] = useState(false);
  const [secureLaunched, setSecureLaunched] = useState(false);
  const [proctorActive, setProctorActive] = useState(false);

  // Socket
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(true);
  const [showReconnectNotice, setShowReconnectNotice] = useState(false);

  // Schedule countdown
  const [now, setNow] = useState(new Date());

  // Timer
  const handleExpire = useCallback(() => {
    submitTest(true);
  }, []);

  const { timeRemaining, isRunning, start: startTimer, formatTime, reset: resetTimer } =
    useTimer(0, handleExpire);

  // Tick every second for schedule countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch test info
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/tests/${testId}`);
        const testData = data.test || data;
        setTest(testData);
        if (testData.requireCamera || testData.settings?.requireCamera) {
          setRequireCamera(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  // Role & Block check
  useEffect(() => {
    if (user && !isStudent) {
      setError('Only users with the Student role can take tests.');
    } else if (test && test.isBlocked) {
      setError('Your access to this test has been restricted by the instructor.');
    }
  }, [user, isStudent, test]);

  // Check local Anti-Cheat status
  useEffect(() => {
    if (!test || !test.settings?.requireAntiCheat || started) return;

    const checkStatus = async () => {
      try {
        setCheckingAntiCheat(true);
        
        // 1. Get active session token from Anti-Cheat Backend
        // ANTICHEAT_BASE_URL is usually 'http://localhost:3001'
        let token = antiCheatToken;
        
        if (!token && ANTICHEAT_BASE_URL) {
          try {
            const tokenRes = await fetch(`${ANTICHEAT_BASE_URL}/api/anticheat/session-token`);
            const tokenData = await tokenRes.json();
            if (tokenData.ok && tokenData.token) {
              token = tokenData.token;
              setAntiCheatToken(token);
            }
          } catch (err) {
            console.warn('Failed to fetch anti-cheat session token:', err);
          }
        }

        // 2. Check status of the session token if we have one
        if (token && ANTICHEAT_BASE_URL) {
          try {
            const statusRes = await fetch(`${ANTICHEAT_BASE_URL}/api/anticheat/status/${token}`);
            const statusData = await statusRes.json();
            
            const isActive = statusData.active === true && statusData.validToken === true;
            setAntiCheatActive(isActive);
            
            if (statusData.violation) {
              console.warn('Anti-cheat violation detected:', statusData.reasons);
            }
          } catch (err) {
            console.warn('Failed to check anti-cheat status:', err);
            setAntiCheatActive(false);
          }
        } else {
          // No token available, so anti-cheat is not active
          setAntiCheatActive(false);
        }
      } catch (err) {
        console.error('Error checking anti-cheat status:', err);
        setAntiCheatActive(false);
      } finally {
        // Also check if local Python proctor is responding
        try {
          const procRes = await fetch('http://localhost:5050/status');
          const procData = await procRes.json();
          setProctorActive(procData.running === true);
        } catch (err) {
          setProctorActive(false);
        }
        setCheckingAntiCheat(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [test, started, antiCheatToken]);

  // Note: Immediate redirect removed to allow status check and timing in the web UI.
  // The user will click "Start Test" which will then trigger the secure flow.

  // Restore saved answers and attempt from localStorage on mount
  // Skip restore for anti-cheat tests — they cannot be resumed
  useEffect(() => {
    const isAntiCheat = test?.settings?.requireAntiCheat;

    if (!isAntiCheat) {
      const savedAnswers = localStorage.getItem(`${ANSWERS_KEY}_${testId}`);
      const savedAttempt = localStorage.getItem(`${ATTEMPT_KEY}_${testId}`);
      
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch {}
      }
      if (savedAttempt) {
        try {
          const parsed = JSON.parse(savedAttempt);
          setAttemptId(parsed.attemptId);
          setQuestions(parsed.questions || []);
          setStarted(true);
          resetTimer(parsed.remainingTime || 0);
          startTimer();
        } catch {}
      }
    } else {
      // Clear any stale data for anti-cheat tests
      localStorage.removeItem(`${ANSWERS_KEY}_${testId}`);
      localStorage.removeItem(`${ATTEMPT_KEY}_${testId}`);
    }

    // Handle Auto-Start from WPF Launcher (includes SSO handoff)
    const params = new URLSearchParams(window.location.search);
    const urlAccessToken = params.get('accessToken');
    const urlRefreshToken = params.get('refreshToken');

    if (urlAccessToken && urlRefreshToken) {
      if (urlAccessToken !== accessToken) {
        // Perform Auto-Login (SSO) to sync with the main browser account
        localStorage.setItem('accessToken', urlAccessToken);
        localStorage.setItem('refreshToken', urlRefreshToken);
        
        // IMPORTANT: Sync the Zustand store state to prevent infinite loop
        // Otherwise 'accessToken' variable from the hook remains stale, triggering the loop
        useAuthStore.setState({ 
          accessToken: urlAccessToken, 
          refreshToken: urlRefreshToken 
        });

        // Refresh the auth state
        getCurrentUser().catch(err => console.error('SSO sync failed:', err));
      }
    }

    // Removed autoStart effect to force user to click 'Start Test' inside locked browser
  }, [testId, test, loading, antiCheatActive, accessToken, getCurrentUser, started]);

  // Persist answers to localStorage
  useEffect(() => {
    if (started && Object.keys(answers).length > 0) {
      localStorage.setItem(`${ANSWERS_KEY}_${testId}`, JSON.stringify(answers));
    }
  }, [answers, started, testId]);

  // Auto-submit when schedule end time is reached during an active test
  useEffect(() => {
    if (!started || !test || submitting) return;
    const { scheduledEnd: activeEnd } = computeSchedule();
    if (!activeEnd) return;

    const msUntilEnd = activeEnd.getTime() - now.getTime();
    if (msUntilEnd <= 0) {
      submitTest(true);
    }
  }, [started, test, now, submitting]);

  // Socket.io setup
  useEffect(() => {
    if (!started || !attemptId) return;

    socketRef.current = io(API_BASE_URL);

    socketRef.current.emit('test:join-room', { testId, attemptId, userId: user?._id });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
      setShowReconnectNotice(false);
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
      setShowReconnectNotice(true);
    });

    socketRef.current.on('test:timer-sync', (data) => {
      if (data && typeof data.remainingTime === 'number') {
        resetTimer(data.remainingTime);
        if (!isRunning) startTimer();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [started, attemptId, testId, user]);

  // Request camera access
  const requestCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraActive(true);
      setCameraLost(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions and try again.');
      setCameraActive(false);
    }
  };

  // Monitor camera track ended
  useEffect(() => {
    if (!cameraStream) return;
    const tracks = cameraStream.getVideoTracks();
    const handleEnded = () => setCameraLost(true);
    tracks.forEach((track) => track.addEventListener('ended', handleEnded));
    return () => {
      tracks.forEach((track) => track.removeEventListener('ended', handleEnded));
    };
  }, [cameraStream]);

  // Assign camera stream to mini video when test starts
  useEffect(() => {
    if (started && cameraStream && miniVideoRef.current) {
      miniVideoRef.current.srcObject = cameraStream;
    }
  }, [started, cameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Compute schedule status (supports multi-window scheduleWindows + legacy single window)
  const computeSchedule = () => {
    const windows = test?.settings?.scheduleWindows || [];
    if (windows.length > 0) {
      // Check if currently inside any window
      for (const w of windows) {
        const start = new Date(w.startTime);
        const end = new Date(w.endTime);
        if (now >= start && now <= end) {
          return { scheduledStart: start, scheduledEnd: end, isBeforeStart: false, isAfterEnd: false, isOpen: true };
        }
      }
      // Find next future window
      const future = windows
        .filter(w => new Date(w.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      if (future.length > 0) {
        return {
          scheduledStart: new Date(future[0].startTime),
          scheduledEnd: new Date(future[0].endTime),
          isBeforeStart: true, isAfterEnd: false, isOpen: false,
        };
      }
      // All windows passed
      const lastWindow = windows.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
      return {
        scheduledStart: new Date(lastWindow.startTime),
        scheduledEnd: new Date(lastWindow.endTime),
        isBeforeStart: false, isAfterEnd: true, isOpen: false,
      };
    }
    // Legacy single window fallback
    const start = test?.settings?.scheduledStartTime ? new Date(test.settings.scheduledStartTime) : null;
    const end = test?.settings?.scheduledEndTime ? new Date(test.settings.scheduledEndTime) : null;
    return {
      scheduledStart: start,
      scheduledEnd: end,
      isBeforeStart: start ? now < start : false,
      isAfterEnd: end ? now > end : false,
      isOpen: (!start || now >= start) && (!end || now <= end),
    };
  };

  const { scheduledStart, scheduledEnd, isBeforeStart, isAfterEnd } = test ? computeSchedule() : {};
  const countdownToStart = isBeforeStart && scheduledStart ? scheduledStart.getTime() - now.getTime() : 0;

  // Request launch of secure WebView (Normal Browser only)
  const handleRequestSecureLaunch = async () => {
    if (secureLaunched) return;
    try {
      setSecureLaunched(true);
      setError('');

      if (antiCheatToken && ANTICHEAT_BASE_URL) {
        await fetch(`${ANTICHEAT_BASE_URL}/api/anticheat/request-exam-start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: antiCheatToken, 
            testId: testId,
            accessToken: accessToken,
            refreshToken: refreshToken
          })
        });
        
        // Show lockdown screen in this browser
        setExamLockedByAntiCheat(true);
        setStarted(true);
      } else {
        setError('Anti-cheat session not initialized. Please ensure the app is running.');
        setSecureLaunched(false);
      }
    } catch (err) {
      console.error('Failed to request secure launch:', err);
      setError('Failed to communicate with anti-cheat service.');
      setSecureLaunched(false);
    }
  };

  // Start test
  const handleStart = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isAutoStart = params.get('autoStart') === 'true';

      setLoading(true);
      const { data } = await api.post('/api/tests/start', { 
        testId,
        resume: isAutoStart
      });
      const attempt = data.attemptId || data.attempt?._id;
      const qs = data.questions || [];

      if (data.requireCamera) {
        setRequireCamera(true);
      }

      // Calculate effective duration: min of test duration and time until scheduledEndTime
      let durationMs = (data.duration || test?.settings?.duration || test?.duration || 30) * 60 * 1000;
      if (scheduledEnd) {
        const msUntilEnd = scheduledEnd.getTime() - Date.now();
        if (msUntilEnd > 0 && msUntilEnd < durationMs) {
          durationMs = msUntilEnd;
        }
      }

      setAttemptId(attempt);
      setQuestions(qs);

      // Session Sync with local Anti-Cheat
      if (test?.settings?.requireAntiCheat) {
        try {
          // If inside the WPF locked browser, tell it to launch main.py NOW
          if (isAutoStart && window.chrome?.webview?.postMessage) {
            window.chrome.webview.postMessage('START_PROCTOR');
          }

          setSessionStarted(true);
          
          // If we are in a normal browser, lock the UI. 
          if (!isAutoStart) {
            // Try to sync session (proctor may already be running from desktop)
            try {
              await fetch('http://localhost:5050/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_code: attempt, test_id: testId })
              });
            } catch (e) { /* proctor may not be running in normal browser mode */ }
            setExamLockedByAntiCheat(true);
            setStarted(true);
            resetTimer(durationMs);
            startTimer();
            setLoading(false);
            return;
          } else {
            // Wait for camera to work in locked browser before showing questions
            setWaitingForCamera(true);
            setLoading(false);
            
            const checkCamera = async () => {
              try {
                const res = await fetch('http://localhost:5050/status');
                const statusData = await res.json();
                if (statusData.running && statusData.initialized) {
                  // Camera is ready — now sync the session
                  try {
                    await fetch('http://localhost:5050/start-session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ session_code: attempt, test_id: testId })
                    });
                  } catch (e) { console.warn('start-session sync failed'); }
                  
                  setWaitingForCamera(false);
                  setStarted(true);
                  resetTimer(durationMs);
                  startTimer();
                  localStorage.setItem(
                    `${ATTEMPT_KEY}_${testId}`,
                    JSON.stringify({ attemptId: attempt, questions: qs, remainingTime: durationMs })
                  );
                } else {
                  setTimeout(checkCamera, 1000);
                }
              } catch (e) {
                setTimeout(checkCamera, 1000);
              }
            };
            checkCamera();
            return;
          }
        } catch (err) {
          console.warn('Failed to sync session with local proctor');
        }
      }

      setStarted(true);
      resetTimer(durationMs);
      startTimer();

      // Save attempt info for refresh recovery
      localStorage.setItem(
        `${ATTEMPT_KEY}_${testId}`,
        JSON.stringify({ attemptId: attempt, questions: qs, remainingTime: durationMs })
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  // Submit test
  const submitTest = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      await api.post('/api/tests/submit-test', {
        attemptId,
        testId,
        answers: formattedAnswers,
        autoSubmit: auto,
      });

      // Clean up localStorage
      localStorage.removeItem(`${ANSWERS_KEY}_${testId}`);
      localStorage.removeItem(`${ATTEMPT_KEY}_${testId}`);
      localStorage.removeItem('test_timer_remaining');

      // Stop camera before navigating
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      
      // Auto-stop the anti-cheat session when submitted
      if (antiCheatToken && ANTICHEAT_BASE_URL) {
        try {
          await fetch(`${ANTICHEAT_BASE_URL}/api/anticheat/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: antiCheatToken })
          });
        } catch (e) {
          console.warn('Failed to stop anti-cheat session');
        }
      }

      // Tell the WPF locked browser to auto-close itself
      if (window.chrome?.webview?.postMessage) {
        window.chrome.webview.postMessage('QUIT_EXAM');
        // Don't navigate — the WPF window will close and the user sees results in the regular browser
        return;
      }

      navigate(`/tests/results/${attemptId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit test');
      setSubmitting(false);
    }
  };

  // Set answer for current question
  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeRemaining < 60000 && timeRemaining > 0;

  // Timer progress percentage
  const totalDuration = test?.settings?.duration ? test.settings.duration * 60 * 1000 : (test?.duration ? test.duration * 60 * 1000 : 1);
  const timerProgress = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));

  const formatScheduleDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading && !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
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

  // Waiting for camera to initialize (full-screen blocking state)
  if (waitingForCamera) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.06),transparent_50%)]">
        <div className="max-w-md w-full">
          <div className="bg-surface-card border-2 border-yellow-400/30 rounded-[2rem] p-10 text-center shadow-brutal relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400/0 via-yellow-400 to-yellow-400/0 animate-pulse" />
            
            <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-400/30 relative">
              <Camera className="w-10 h-10 text-yellow-400" />
              <div className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-ping" />
            </div>

            <h2 className="text-2xl font-black text-txt mb-3">Waiting for Camera</h2>
            <p className="text-txt-secondary text-sm mb-6 leading-relaxed">
              The Anti-Cheat camera is initializing.<br />
              Questions will appear as soon as the camera feed is ready.
            </p>

            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
            </div>

            <p className="text-xs text-txt-muted">
              This usually takes a few seconds…
            </p>
          </div>
        </div>
      </div>
    );
  }
  // Start screen
  if (!started) {
    const params = new URLSearchParams(window.location.search);
    const isAutoStart = params.get('autoStart') === 'true';
    const isAntiCheatRequired = test?.settings?.requireAntiCheat;

    // GATE PAGE: If Anti-Cheat is required but we are in a normal browser
    if (isAntiCheatRequired && !isAutoStart) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.05),transparent_40%)]">
          <div className="max-w-xl w-full">
            <div className="bg-surface-card border-2 border-bdr rounded-[2rem] p-8 md:p-12 text-center shadow-brutal relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-3xl rounded-full -mr-16 -mt-16" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-yellow-400/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-yellow-400/20">
                  <Shield className="w-10 h-10 text-yellow-400" />
                </div>
                
                <h1 className="text-3xl font-black text-txt mb-2">{test?.title}</h1>
                <p className="text-txt-secondary mb-8">This exam requires the <strong>Secure Anti-Cheat Desktop Application</strong>.</p>

                <div className="grid grid-cols-1 gap-4 mb-8 text-left">
                  <div className={`p-5 rounded-2xl border-2 transition-all ${antiCheatActive && proctorActive ? 'border-green-400/30 bg-green-400/5' : 'border-bdr bg-surface'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${antiCheatActive && proctorActive ? 'bg-green-400/20 text-green-400' : 'bg-txt-muted/10 text-txt-muted'}`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-txt">Anti-Cheat Status</h3>
                          <p className="text-xs text-txt-muted">Verification of desktop environment</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${antiCheatActive ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                        {antiCheatActive ? 'Ready' : 'Not Detected'}
                      </div>
                    </div>
                  </div>
                </div>

                {!antiCheatActive && (
                  <div className="mb-8 p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-left">
                    <p className="text-xs text-amber-400 leading-relaxed">
                      <strong>How to start:</strong><br />
                      1. Open the LearnHub Anti-Cheat app on your computer.<br />
                      2. Turn protection <strong>ON</strong> in the app.<br />
                      3. Wait for this page to detect the app.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleRequestSecureLaunch}
                  disabled={!antiCheatActive || secureLaunched || isBeforeStart || isAfterEnd}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                    !antiCheatActive || secureLaunched || isBeforeStart || isAfterEnd
                      ? 'bg-surface-input text-txt-muted border-2 border-bdr cursor-not-allowed'
                      : 'bg-yellow-400 text-black hover:bg-yellow-350 shadow-[0_4px_0_0_#ca8a04] active:translate-y-1 active:shadow-none'
                  }`}
                >
                  {secureLaunched ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Launching Secure Window...
                    </>
                  ) : isBeforeStart ? (
                    <>
                      <Clock className="w-5 h-5" />
                      Opens in {formatCountdownMs(countdownToStart)}
                    </>
                  ) : isAfterEnd ? (
                    <>
                      <Lock className="w-5 h-5" />
                      Test Closed
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Go to Secure Page
                    </>
                  )}
                </button>
                
                <p className="mt-6 text-xs text-txt-muted">
                  The exam will open in a new, locked window. This tab will remain as a placeholder.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // NORMAL START SCREEN (Non-Anti-Cheat OR inside WebView)
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-txt mb-2">{test?.title}</h1>
          <p className="text-txt-muted mb-6">{test?.description || 'Good luck!'}</p>

          <div className="flex justify-center gap-3 mb-6">
            <span className="badge badge-accent inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {test?.settings?.duration || test?.duration || 30} minutes
            </span>
            <span className="badge badge-purple inline-flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> {test?.questions?.length || test?.questionCount || '?'} questions
            </span>
          </div>

          {/* Schedule Time Window */}
          {(scheduledStart || scheduledEnd) && (
            <div className="mb-6 p-4 rounded-xl bg-surface border-2 border-bdr text-left space-y-2">
              <h3 className="text-sm font-bold text-txt-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" /> Test Schedule
              </h3>
              {scheduledStart && (
                <div className="flex items-center gap-2 text-sm text-txt-secondary">
                  <span className="text-green-400 font-semibold">Opens:</span>
                  <span>{formatScheduleDate(scheduledStart)}</span>
                </div>
              )}
              {scheduledEnd && (
                <div className="flex items-center gap-2 text-sm text-txt-secondary">
                  <span className="text-red-400 font-semibold">Closes:</span>
                  <span>{formatScheduleDate(scheduledEnd)}</span>
                </div>
              )}
            </div>
          )}

          {/* Countdown to start */}
          {isBeforeStart && (
            <div className="mb-6 p-4 rounded-xl bg-blue-400/5 border-2 border-blue-400/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-bold text-blue-400">Test hasn't started yet</span>
              </div>
              <div className="text-2xl font-mono font-black text-blue-400">
                {formatCountdownMs(countdownToStart)}
              </div>
              <p className="text-xs text-blue-400/70 mt-1">until test opens</p>
            </div>
          )}

          {/* Test has ended */}
          {isAfterEnd && (
            <div className="mb-6 p-4 rounded-xl bg-red-400/5 border-2 border-red-400/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Lock className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold text-red-400">This test has ended</span>
              </div>
              <p className="text-xs text-red-400/70">The submission window has closed.</p>
            </div>
          )}

          {/* Camera requirement */}
          {requireCamera && !cameraActive && (
            <div className="mb-6 p-4 rounded-xl bg-surface border-2 border-bdr text-left space-y-3">
              <h3 className="text-sm font-bold text-txt-secondary flex items-center gap-2">
                <Camera className="w-4 h-4 text-yellow-400" /> Camera Required
              </h3>
              <p className="text-sm text-txt-muted">
                This test requires camera access for proctoring. Please enable your camera before starting.
              </p>
              <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl bg-black aspect-video" />
              {cameraError && (
                <p className="text-sm text-red-400">{cameraError}</p>
              )}
              <button onClick={requestCamera} className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Enable Camera
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={
              loading ||
              isBeforeStart ||
              isAfterEnd ||
              (requireCamera && !cameraActive) ||
              (isAntiCheatRequired && !antiCheatActive) ||
              !isStudent
            }
            className={`w-full py-3 ${
              isBeforeStart ||
              isAfterEnd ||
              (requireCamera && !cameraActive) ||
              (isAntiCheatRequired && !antiCheatActive) ||
              !isStudent
                ? 'btn-secondary opacity-50 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Starting...
              </span>
            ) : !isStudent ? (
              <span className="flex items-center justify-center gap-2 text-red-400">
                <Lock className="w-4 h-4" /> Students Only
              </span>
            ) : isAfterEnd ? (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Test Closed
              </span>
            ) : isBeforeStart ? (
              <span className="flex items-center justify-center gap-2">
                <Timer className="w-4 h-4" /> Opens in {formatCountdownMs(countdownToStart)}
              </span>
            ) : (isAntiCheatRequired && !antiCheatActive) ? (
              <span className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> {isAutoStart ? 'Initializing Secure Session...' : 'Enable Anti-Cheat to Start'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> {isAutoStart ? 'Starting Test...' : 'Start Test'}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Secure Lockdown Screen
  if (examLockedByAntiCheat && started) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.05),transparent_40%)]">
        <div className="max-w-xl w-full">
          <div className="bg-surface-card border-2 border-bdr rounded-[2rem] p-8 md:p-12 text-center shadow-brutal relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 bg-yellow-400/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 border-2 border-yellow-400/20 shadow-[8px_8px_0px_0px_rgba(250,204,21,0.1)]">
                <Lock className="w-12 h-12 text-yellow-400" />
              </div>
              
              <h1 className="text-4xl font-black text-txt mb-4 tracking-tight">Secure Session Active</h1>
              <p className="text-txt-secondary mb-10 text-lg leading-relaxed max-w-md mx-auto">
                This exam is now running in the <span className="text-yellow-400 font-bold underline decoration-yellow-400/30">Anti-Cheat Desktop Application</span>.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-10 text-left">
                <div className="p-5 rounded-2xl bg-surface border-2 border-bdr hover:border-yellow-400/50 transition-colors">
                  <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center mb-3">
                    <Shield className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h3 className="font-bold text-txt mb-2">Locked Browser</h3>
                  <p className="text-xs text-txt-muted leading-relaxed">Questions are hidden in this tab for security. Use the WPF app window.</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-surface border-2 border-bdr hover:border-yellow-400/50 transition-colors">
                  <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center mb-3">
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-txt mb-2">Proctoring On</h3>
                  <p className="text-xs text-txt-muted leading-relaxed">Camera monitoring and environment checks are active in the background.</p>
                </div>
              </div>

              <div className="p-6 bg-yellow-400/5 border-2 border-dashed border-yellow-400/20 rounded-2xl mb-8">
                <div className="flex items-center justify-center gap-3 text-yellow-400">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Waiting for submission</span>
                </div>
              </div>

              <p className="text-sm text-txt-muted flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-txt-muted" />
                Do not close this window until you finish the test.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test view
  return (
    <div className="min-h-screen bg-surface">
      {/* Reconnection notice */}
      {showReconnectNotice && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black text-center py-2 text-sm font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> Connection lost. Reconnecting... Your answers are saved locally.
        </div>
      )}

      {/* Timer bar */}
      <div
        className={`sticky top-0 z-40 bg-surface-card border-b-2 border-bdr ${
          showReconnectNotice ? 'mt-10' : ''
        }`}
      >
        {/* Yellow gradient progress bar */}
        <div className="h-1 bg-gray-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLowTime ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-txt-secondary truncate max-w-xs">
            {test?.title}
          </h2>
          <div
            className={`text-lg font-mono font-black px-4 py-1.5 rounded-xl flex items-center gap-2 ${
              isLowTime
                ? 'bg-red-400/10 text-red-400 border border-red-400/20 animate-pulse'
                : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
            }`}
          >
            <Clock className="w-4 h-4" /> {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-txt-muted">
            {answeredCount}/{questions.length} answered
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Question navigation sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 sticky top-24">
            <h3 className="text-sm font-bold text-txt-secondary mb-3">Questions</h3>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
              {questions.map((q, index) => {
                const qId = q._id || q.id || index;
                const isAnswered = answers[qId] !== undefined && answers[qId] !== '';
                const isCurrent = index === currentIndex;
                return (
                  <button
                    key={qId}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                      isCurrent
                        ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black'
                        : isAnswered
                        ? 'bg-green-400/10 text-green-400 border-2 border-green-400/30'
                        : 'bg-surface-input text-txt-muted border-2 border-bdr hover:border-bdr-hover'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              className="btn-primary w-full mt-4 py-2.5 text-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <Send className="w-3.5 h-3.5" /> Submit Test
              </span>
            </button>
          </div>
        </div>

        {/* Current question */}
        <div className="flex-1">
          {currentQuestion && (
            <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="badge badge-accent">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-sm text-txt-muted">
                  {currentQuestion.points || 1} point{(currentQuestion.points || 1) !== 1 ? 's' : ''}
                </span>
              </div>

              <h3 className="text-lg font-bold text-txt mb-6">
                {currentQuestion.question || currentQuestion.text}
              </h3>

              {/* Multiple choice */}
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, oIndex) => {
                    const qId = currentQuestion._id || currentQuestion.id || currentIndex;
                    const isSelected = answers[qId] === option;
                    return (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-yellow-400/50 bg-yellow-400/5'
                            : 'border-bdr hover:border-bdr-hover hover:bg-surface-input'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qId}`}
                          checked={isSelected}
                          onChange={() => setAnswer(qId, option)}
                          className="accent-yellow-400"
                        />
                        <span className={`${isSelected ? 'text-txt' : 'text-txt-secondary'}`}>{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Short answer */}
              {currentQuestion.type === 'short-answer' && (
                <textarea
                  value={
                    answers[currentQuestion._id || currentQuestion.id || currentIndex] || ''
                  }
                  onChange={(e) =>
                    setAnswer(
                      currentQuestion._id || currentQuestion.id || currentIndex,
                      e.target.value
                    )
                  }
                  placeholder="Type your answer here..."
                  rows={5}
                  className="input-field resize-none"
                />
              )}

              {/* File response */}
              {currentQuestion.type === 'file-response' && (() => {
                const qId = currentQuestion._id || currentQuestion.id || currentIndex;
                const imageExts = /\.(png|jpe?g|gif|webp|svg)$/i;
                return (
                  <div className="space-y-4">
                    {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                      <div className="space-y-3">
                        {currentQuestion.attachments.map((url, i) =>
                          imageExts.test(url) ? (
                            <img key={i} src={url} alt={`Attachment ${i + 1}`} className="max-w-full rounded-xl border-2 border-bdr" />
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-yellow-400 underline text-sm hover:text-yellow-300">
                              Attachment {i + 1} - {url.split('/').pop()}
                            </a>
                          )
                        )}
                      </div>
                    )}
                    <textarea
                      value={answers[qId] || ''}
                      onChange={(e) => setAnswer(qId, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={5}
                      className="input-field resize-none"
                    />
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="btn-primary flex items-center gap-2"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Finish Test
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Feed Top Right - Always Visible During Exam */}
      {(antiCheatActive || (requireCamera && cameraActive) || started) && !examLockedByAntiCheat && (
        <div className="fixed top-4 right-4 z-40">
          <div className="w-80 rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-[0_10px_30px_rgba(250,204,21,0.2)] bg-black hover:border-yellow-300 transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-300/10 px-4 py-2 flex items-center justify-between border-b border-yellow-400/30">
              <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {test?.settings?.requireAntiCheat ? 'AI Proctor Live' : 'Camera Feed'}
              </span>
              <span className="text-[10px] font-bold text-yellow-400/70 bg-black/50 px-2 py-0.5 rounded">
                {test?.settings?.requireAntiCheat ? 'MONITORING' : 'RECORDING'}
              </span>
            </div>

            {/* Camera Display */}
            <div className="w-full aspect-video bg-black relative overflow-hidden">
              {test?.settings?.requireAntiCheat ? (
                // AI Proctor Feed from main.py
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black relative">
                  <img 
                    src="http://localhost:5050/video_feed" 
                    alt="AI Proctor Feed" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.querySelector('.proctor-error')?.classList.remove('hidden');
                    }}
                  />
                  <div className="proctor-error hidden absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-400 mb-2" />
                    <p className="text-xs text-yellow-400">AI Proctor Offline</p>
                    <p className="text-[10px] text-yellow-400/60 mt-1">Attempting to reconnect...</p>
                  </div>
                </div>
              ) : (
                // Webcam feed from browser
                <video 
                  ref={miniVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Overlay indicator */}
              <div className="absolute inset-0 pointer-events-none border-2 border-yellow-400/10 rounded-xl" />
            </div>

            {/* Footer Status */}
            <div className="bg-black/80 px-4 py-2 flex items-center justify-between border-t border-yellow-400/30">
              <div className="flex items-center gap-2">
                <Camera className="w-3 h-3 text-yellow-400" />
                <span className="text-[11px] font-bold text-yellow-400">
                  {antiCheatActive ? 'Protected' : 'Monitoring'}
                </span>
              </div>
              <span className="text-[10px] text-yellow-400/60">
                {started ? 'In Progress' : 'Standby'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Camera lost overlay */}
      {cameraLost && started && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-txt mb-2">Camera Disconnected</h3>
            <p className="text-txt-secondary text-sm mb-4">
              Your camera was lost. Please re-enable it to continue the test.
            </p>
            <button onClick={requestCamera} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Re-enable Camera
            </button>
          </div>
        </div>
      )}

      {/* Waiting for Camera Modal */}
      {waitingForCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-yellow-400 rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-pulse">
            <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-400">
              <Camera className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-black text-yellow-400 mb-2">Waiting for Camera</h3>
            <p className="text-txt-secondary text-sm">
              Please wait while the Anti-Cheat camera feed initializes...
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <h3 className="text-lg font-black text-txt mb-2">Submit Test?</h3>
            <p className="text-txt-secondary text-sm mb-1">
              You have answered {answeredCount} of {questions.length} questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-amber-400 text-sm mb-4">
                {questions.length - answeredCount} question(s) are unanswered.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => submitTest(false)}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeTest;
