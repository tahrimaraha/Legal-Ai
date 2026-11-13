import { useEffect, useState } from 'react';
import type { Variants } from 'framer-motion';

/** True when the user has asked the system for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

export const EASE_SETTLE = [0.16, 1, 0.3, 1] as const;

/** Section reveal: fades up once, at 20% visibility, never on scroll-up. */
export const revealParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};

export const revealChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SETTLE } },
};

export const revealViewport = { once: false, amount: 0.2 } as const;
