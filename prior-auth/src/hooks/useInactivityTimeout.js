import { useEffect, useRef, useState, useCallback } from 'react';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000;  // Show warning 2 min before logout
const TRACKED_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

/**
 * Tracks user activity and triggers onTimeout after 15 min of inactivity.
 * Returns { showWarning, remainingSeconds, resetTimer }.
 */
export default function useInactivityTimeout(onTimeout, enabled = true) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemainingSeconds(0);
    clearTimers();

    if (!enabled) return;

    // Set warning timer (fires 2 min before logout)
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(Math.ceil(WARNING_MS / 1000));

      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setShowWarning(false);
      onTimeout();
    }, TIMEOUT_MS);
  }, [enabled, onTimeout, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    resetTimer();

    const handleActivity = () => {
      // Throttle: only reset if >5s since last reset (avoids constant timer churn)
      if (Date.now() - lastActivityRef.current > 5000) {
        resetTimer();
      }
    };

    for (const event of TRACKED_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of TRACKED_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimer, clearTimers]);

  return { showWarning, remainingSeconds, resetTimer };
}
