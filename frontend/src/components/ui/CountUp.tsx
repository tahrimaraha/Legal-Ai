import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';

/** Counts a real, sourced figure up once as it enters view. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const { num } = useLang();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value]);

  const text = decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toLocaleString('en-US');
  return (
    <span ref={ref} className="tabular-nums">
      {num(text)}
    </span>
  );
}
