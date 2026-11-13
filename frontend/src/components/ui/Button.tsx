import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../lib/motion';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'quiet' | 'danger';
export type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-sm font-body font-semibold ' +
  'transition-colors duration-200 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

const variants: Record<Variant, string> = {
  primary: 'bg-clay text-bone hover:bg-clay-deep',
  secondary: 'border border-granite text-ink hover:border-clay hover:text-clay-deep bg-white shadow-xs',
  ghost: 'border border-transparent text-ink hover:bg-bone-deep hover:text-clay-deep bg-transparent',
  dark: 'bg-ink text-bone hover:bg-ink-soft',
  quiet: 'text-clay-deep hover:text-ink bg-transparent',
  danger: 'bg-brick text-white hover:bg-brick/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-caption',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-[52px] px-7 text-[1rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return [base, variants[variant], sizes[size], extra].join(' ');
}

/** The gavel strike: a 2px rule snaps in beneath the label the moment the block is struck. */
function Strike({ shown }: { shown: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[8px] left-1/2 h-[2px] -translate-x-1/2 bg-current"
      initial={false}
      animate={{ width: shown ? 'calc(100% - 2.5rem)' : '0%', opacity: shown ? 0.85 : 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    />
  );
}

/** Shared press behaviour for both the button and the link flavour. */
function useStrike() {
  const [struck, setStruck] = useState(false);
  const timer = useRef<number>();
  const strike = useCallback(() => {
    setStruck(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStruck(false), 260);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { struck, strike };
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, onPointerDown, disabled, loading, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const { struck, strike } = useStrike();

  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      onPointerDown={(e) => {
        strike();
        onPointerDown?.(e as unknown as React.PointerEvent<HTMLButtonElement>);
      }}
      {...rest}
    >
      {loading && <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1" />}
      {children}
      <Strike shown={struck && !reduced && !loading} />
    </motion.button>
  );
});

export interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className = '', children, onClick }: ButtonLinkProps) {
  const reduced = useReducedMotion();
  const { struck, strike } = useStrike();
  const cls = buttonClass(variant, size, className);
  const isAnchor = to.startsWith('#') || to.startsWith('/#');

  const body = (
    <>
      {children}
      <Strike shown={struck && !reduced} />
    </>
  );

  if (isAnchor) {
    return (
      <motion.a
        href={to.replace('/#', '#')}
        className={cls}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        onPointerDown={strike}
        onClick={onClick}
      >
        {body}
      </motion.a>
    );
  }

  return (
    <motion.span className="inline-flex" whileTap={reduced ? undefined : { scale: 0.97 }} onPointerDown={strike}>
      <Link to={to} className={cls} onClick={onClick}>
        {body}
      </Link>
    </motion.span>
  );
}
