import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';

/** The one pill-shaped control in the system. */
export function LanguageToggle({ tone = 'default' }: { tone?: 'default' | 'invert' }) {
  const { lang, setLang, t } = useLang();
  const reduced = useReducedMotion();
  const shell = tone === 'invert' ? 'border-granite/50 text-granite' : 'border-granite-soft text-clay-deep';

  return (
    <div className={`relative inline-flex items-center rounded-full border ${shell} p-0.5`} role="group" aria-label={t.common.langToggle}>
      {(['bn', 'en'] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={`relative z-10 rounded-full px-3 py-1 text-[0.75rem] font-semibold transition-colors duration-200 ${
              active ? 'text-bone' : tone === 'invert' ? 'text-granite hover:text-bone' : 'text-clay-deep hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${tone}`}
                className="absolute inset-0 -z-10 rounded-full bg-clay"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {code === 'bn' ? 'বাংলা' : 'EN'}
          </button>
        );
      })}
    </div>
  );
}
