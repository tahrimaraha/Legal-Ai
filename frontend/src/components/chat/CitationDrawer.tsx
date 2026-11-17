import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { EASE_SETTLE, useReducedMotion } from '../../lib/motion';
import { statuteById } from '../../mocks/statutes';
import type { Citation } from '../../mocks/types';

interface Props {
  citation: Citation | null;
  onClose: () => void;
  onAsk: (c: Citation) => void;
}

/** Splits the passage around the matched span so the match can be highlighted in place. */
function Highlighted({ text, match, label }: { text: string; match: string; label: string }) {
  const at = text.indexOf(match);
  if (at === -1) return <p className="whitespace-pre-line">{text}</p>;
  return (
    <p className="whitespace-pre-line">
      {text.slice(0, at)}
      <mark className="bg-clay-tint px-0.5 text-ink shadow-[inset_0_-1px_0_rgb(var(--c-clay))]" title={label}>
        {match}
      </mark>
      {text.slice(at + match.length)}
    </p>
  );
}

export function CitationDrawer({ citation, onClose, onAsk }: Props) {
  const { lang, t, num } = useLang();
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!citation) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [citation, onClose]);

  const statute = citation ? statuteById(citation.statuteId) : undefined;

  return (
    <AnimatePresence>
      {citation && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="false"
            aria-label={t.chat.drawerTitle}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-granite-soft bg-paper"
            initial={{ x: reduced ? 0 : '100%', opacity: reduced ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : '100%', opacity: reduced ? 0 : 1 }}
            transition={{ duration: reduced ? 0.15 : 0.24, ease: EASE_SETTLE }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-granite-soft px-6 py-5">
              <div>
                <p className="label mb-2">{t.chat.drawerTitle}</p>
                <h2 className="font-display text-[1.25rem] leading-snug text-ink">
                  {lang === 'bn' ? citation.labelBn : citation.labelEn}
                </h2>
                {statute && (
                  <p className="mt-2 font-mono text-[0.6875rem] tracking-label text-clay-deep">
                    {statute.year} · {num(statute.chunks ?? 0)} chunks · match {num(Math.round(citation.score * 100))}%
                  </p>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t.chat.drawerClose}
                className="shrink-0 rounded-sm border border-granite-soft p-2 text-clay-deep transition-colors hover:border-clay hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="label mb-3">{t.chat.matched}</p>
              <div className="margin-rule pl-5 font-body text-[0.9375rem] leading-[1.85] text-ink-soft">
                <Highlighted
                  text={lang === 'bn' ? citation.textBn : citation.textEn}
                  match={lang === 'bn' ? citation.matchBn : citation.matchEn}
                  label={t.chat.matched}
                />
              </div>
            </div>

            <footer className="border-t border-granite-soft px-6 py-5">
              <button
                type="button"
                onClick={() => onAsk(citation)}
                className="link-underline inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-clay-deep hover:text-ink"
              >
                {t.chat.askAbout}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
