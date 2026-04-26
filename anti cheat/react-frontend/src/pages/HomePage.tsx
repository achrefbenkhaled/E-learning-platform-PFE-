import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../config';

/**
 * Landing page: live anti-cheat status from the API (WPF must be ON with an active session).
 * "Open Exam" sends a start request to the WPF app, which launches the secure exam host.
 */

type AcUiStatus = 'loading' | 'on' | 'off' | 'offline';

const POLL_MS = 3000;

export default function HomePage() {
  const [acStatus, setAcStatus] = useState<AcUiStatus>('loading');
  const [openError, setOpenError] = useState<string | null>(null);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const refreshAntiCheatFlag = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/anti-cheat-status`);
      if (!res.ok) throw new Error('bad response');
      const data = (await res.json()) as { enabled?: boolean };
      setAcStatus(data.enabled === true ? 'on' : 'off');
    } catch {
      setAcStatus('offline');
    }
  }, []);

  useEffect(() => {
    void refreshAntiCheatFlag();
    const id = setInterval(() => void refreshAntiCheatFlag(), POLL_MS);
    return () => clearInterval(id);
  }, [refreshAntiCheatFlag]);

  const openExam = async () => {
    setOpenError(null);
    setOpenInfo(null);
    setOpening(true);
    try {
      const res = await fetch(`${API_BASE}/api/anticheat/session-token`);
      const data = (await res.json()) as { ok?: boolean; token?: string };
      if (data.ok && data.token) {
        const triggerRes = await fetch(`${API_BASE}/api/anticheat/request-exam-start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token }),
        });
        if (!triggerRes.ok) {
          setOpenError(
            'Anti-cheat is not active on the desktop app. Turn it ON in WPF, then try again.',
          );
          return;
        }
        setOpenInfo(
          'Exam start request sent to desktop app. The secure exam window should open in WPF now.',
        );
        return;
      }
      setOpenError(
        'No active anti-cheat session. Open the desktop app and turn Anti-Cheat ON, then try again.',
      );
      void refreshAntiCheatFlag();
    } catch {
      setOpenError(
        'Cannot reach the anti-cheat API. From the project folder run: npm run dev (starts API + Vite), or in a separate terminal: cd express-backend && npm start',
      );
    } finally {
      setOpening(false);
    }
  };

  const canOpen = acStatus === 'on';

  return (
    <div className="home">
      <div className="home-card">
        <h1>Online exam platform</h1>

        <div className={`status-pill ${acStatus}`}>
          <span className="status-dot" aria-hidden />
          <span className="status-text">
            {acStatus === 'loading' && 'Checking anti-cheat…'}
            {acStatus === 'on' && 'Anti-cheat: running — you can open the exam'}
            {acStatus === 'off' && 'Anti-cheat: not running — start the desktop app and turn it ON'}
            {acStatus === 'offline' &&
              'Cannot reach API — run npm run dev from the project root, or npm start in express-backend'}
          </span>
        </div>

        <p className="instructions">
          Run the <strong>Exam Anti-Cheat</strong> application on this PC, enable protection, then use
          the button below. The site checks every few seconds whether a live session exists.
        </p>

        <button
          type="button"
          className="open-exam-btn"
          disabled={!canOpen || opening}
          onClick={() => void openExam()}
        >
          {opening ? 'Opening…' : 'Open Exam'}
        </button>

        {openInfo && <p className="info-msg">{openInfo}</p>}
        {openError && <p className="error-msg">{openError}</p>}

        <p className="hint">
          This button does not open the exam directly in browser. It asks the desktop anti-cheat app
          to launch the secure fullscreen exam host.
        </p>
      </div>
      <style>{`
        .home {
          min-height: 100vh;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: system-ui, sans-serif;
        }
        .home-card {
          max-width: 520px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 2rem;
        }
        h1 {
          margin: 0 0 1.25rem;
          font-size: 1.5rem;
        }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .status-pill.loading {
          background: #1e3a5f;
          color: #93c5fd;
        }
        .status-pill.on {
          background: #14532d;
          color: #86efac;
        }
        .status-pill.off {
          background: #450a0a;
          color: #fecaca;
        }
        .status-pill.offline {
          background: #422006;
          color: #fdba74;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-pill.loading .status-dot {
          background: #3b82f6;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .status-pill.on .status-dot {
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
        }
        .status-pill.off .status-dot {
          background: #ef4444;
        }
        .status-pill.offline .status-dot {
          background: #f97316;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .instructions {
          margin: 0 0 1.25rem;
          line-height: 1.55;
          color: #cbd5e1;
          font-size: 0.95rem;
        }
        .open-exam-btn {
          width: 100%;
          padding: 0.9rem 1.25rem;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          background: #3b82f6;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }
        .open-exam-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .open-exam-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .error-msg {
          margin: 1rem 0 0;
          color: #fca5a5;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .info-msg {
          margin: 1rem 0 0;
          color: #86efac;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .hint {
          margin: 1.25rem 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}
