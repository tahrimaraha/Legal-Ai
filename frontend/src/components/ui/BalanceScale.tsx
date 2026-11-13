import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';

/** Fire this from anywhere to give the beam one small nudge. */
export const NUDGE_EVENT = 'legal-ai:nudge';
export const nudgeScale = () => window.dispatchEvent(new CustomEvent(NUDGE_EVENT));

interface Props {
  className?: string;
  /** Stroke width scales the whole drawing's weight. */
  weight?: number;
}

/**
 * The signature element. Drawn from primitives so it can be themed and animated:
 * a beam on a fulcrum, two pans on chains. It enters tipped and settles level.
 */
export function BalanceScale({ className = '', weight = 2 }: Props) {
  const { t } = useLang();
  const reduced = useReducedMotion();

  const target = useMotionValue(reduced ? 0 : -12);
  const beam = useSpring(target, { stiffness: 84, damping: 7.5, mass: 1.15 });
  // The pans hang plumb, but catch up a beat after the beam — that lag reads as weight.
  const panCounter = useSpring(useTransform(beam, (r) => -r), { stiffness: 130, damping: 13 });

  useEffect(() => {
    if (reduced) {
      target.set(0);
      return;
    }
    const settle = window.setTimeout(() => target.set(0), 140);
    const onNudge = () => {
      target.set(-3.5);
      window.setTimeout(() => target.set(0), 130);
    };
    window.addEventListener(NUDGE_EVENT, onNudge);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener(NUDGE_EVENT, onNudge);
    };
  }, [reduced, target]);

  const hover = (v: number) => () => !reduced && target.set(v);

  const pan = (x: number) => (
    <motion.g style={{ rotate: panCounter, originX: `${x}px`, originY: '112px' }}>
      <line x1={x} y1="112" x2={x - 26} y2="168" stroke="currentColor" strokeWidth={weight * 0.6} />
      <line x1={x} y1="112" x2={x + 26} y2="168" stroke="currentColor" strokeWidth={weight * 0.6} />
      <line x1={x} y1="112" x2={x} y2="168" stroke="currentColor" strokeWidth={weight * 0.45} opacity="0.55" />
      <path
        d={`M ${x - 46} 168 L ${x + 46} 168 L ${x + 30} 192 L ${x - 30} 192 Z`}
        fill="rgb(var(--c-clay-tint))"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinejoin="round"
      />
      <line x1={x - 46} y1="168" x2={x + 46} y2="168" stroke="currentColor" strokeWidth={weight} />
    </motion.g>
  );

  return (
    <svg
      viewBox="0 0 400 400"
      className={`text-clay-deep ${className}`}
      role="img"
      aria-label={t.hero.scaleAlt}
      onMouseEnter={hover(3)}
      onMouseLeave={hover(0)}
    >
      {/* Plinth and column — these never move. */}
      <line x1="200" y1="96" x2="200" y2="330" stroke="currentColor" strokeWidth={weight * 1.6} />
      <path d="M 150 330 L 250 330 L 268 356 L 132 356 Z" fill="rgb(var(--c-clay-tint))" stroke="currentColor" strokeWidth={weight} strokeLinejoin="round" />
      <line x1="118" y1="356" x2="282" y2="356" stroke="currentColor" strokeWidth={weight * 1.6} strokeLinecap="square" />
      <circle cx="200" cy="96" r={weight * 3} fill="currentColor" />

      {/* The beam and its pans. */}
      <motion.g style={{ rotate: beam, originX: '200px', originY: '96px' }}>
        <line x1="72" y1="112" x2="328" y2="112" stroke="currentColor" strokeWidth={weight * 1.4} strokeLinecap="round" />
        <path d="M 200 96 L 186 112 L 214 112 Z" fill="currentColor" />
        {pan(72)}
        {pan(328)}
      </motion.g>
    </svg>
  );
}
