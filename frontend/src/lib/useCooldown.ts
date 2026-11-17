import { useCallback, useEffect, useState } from 'react';

/** Seconds remaining before an action (e.g. "Resend email") may run again. */
export function useCooldown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [left > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useCallback((seconds: number) => setLeft(Math.max(0, Math.ceil(seconds))), []);
  return { left, start, active: left > 0 };
}
