import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants.js';

const STORAGE_KEY = 'test_timer_remaining';

const useTimer = (initialTime = 0, onExpire = () => {}) => {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : initialTime;
  });
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  const socketRef = useRef(null);

  // Keep callback ref fresh
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Persist remaining time to localStorage for refresh recovery
  useEffect(() => {
    if (isRunning) {
      localStorage.setItem(STORAGE_KEY, timeRemaining.toString());
    }
  }, [timeRemaining, isRunning]);

  // Countdown interval
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            localStorage.removeItem(STORAGE_KEY);
            onExpireRef.current();
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining > 0]);

  // Socket.io listener for timer sync
  useEffect(() => {
    socketRef.current = io(API_BASE_URL, { autoConnect: false });

    socketRef.current.on('test:timer-sync', (data) => {
      if (data && typeof data.remainingTime === 'number') {
        setTimeRemaining(data.remainingTime);
        localStorage.setItem(STORAGE_KEY, data.remainingTime.toString());
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newTime) => {
      setIsRunning(false);
      const t = newTime !== undefined ? newTime : initialTime;
      setTimeRemaining(t);
      localStorage.setItem(STORAGE_KEY, t.toString());
    },
    [initialTime]
  );

  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.max(0, Math.floor((ms ?? timeRemaining) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timeRemaining]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem(STORAGE_KEY);
    };
  }, []);

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    socket: socketRef.current,
  };
};

export default useTimer;
