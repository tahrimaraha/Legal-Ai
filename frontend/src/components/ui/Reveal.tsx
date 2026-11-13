import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { revealChild, revealParent, revealViewport } from '../../lib/motion';

/** Fades a group up once, staggering its children. Never replays on scroll-up. */
export function Reveal({ children, className = '', as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'ul' | 'li' }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={revealParent} initial="hidden" whileInView="shown" viewport={revealViewport}>
      {children}
    </Comp>
  );
}

export function RevealItem({ children, className = '', as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'p' | 'h2' }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={revealChild}>
      {children}
    </Comp>
  );
}
