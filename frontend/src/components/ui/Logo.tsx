import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';

/** The brand emblem (scales, column and circuit "L"), from /public/logo-mark.png. */
export function LogoMark({ className = '' }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" aria-hidden="true" draggable={false} className={`object-contain ${className}`} />;
}

interface Props {
  /** Inverted sits on the ink band; default sits on bone. */
  tone?: 'default' | 'invert';
  showSub?: boolean;
}

export function Logo({ tone = 'default', showSub = true }: Props) {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const ink = tone === 'invert' ? 'text-bone' : 'text-ink';
  const sub = tone === 'invert' ? 'text-granite' : 'text-clay-deep';

  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label={`${t.brand.name} — ${t.brand.sub}`}>
      <motion.span
        className={`block shrink-0 ${tone === 'invert' ? 'rounded-md bg-[#FDF6E8] p-0.5 shadow-sm' : ''}`}
        whileHover={reduced ? undefined : { rotate: [0, -5, 3, 0] }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <LogoMark className={tone === 'invert' ? 'h-8 w-8' : 'h-9 w-9'} />
      </motion.span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.0625rem] font-semibold tracking-[0.08em] ${ink}`}>LEGAL AI</span>
        {showSub && <span className={`mt-1 text-[0.6875rem] font-medium ${sub}`}>{t.brand.sub}</span>}
      </span>
    </Link>
  );
}
