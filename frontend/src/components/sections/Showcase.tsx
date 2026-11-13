import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { EASE_SETTLE, useReducedMotion } from '../../lib/motion';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { AskPreview, DraftPreview, LookupPreview } from './Previews';

const panels = [AskPreview, DraftPreview, LookupPreview];

export function Showcase() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const Panel = panels[active];
  const tab = t.showcase.tabs[active];

  return (
    <section id="showcase" className="section-pad scroll-mt-24">
      <Reveal className="shell">
        <SectionHeading eyebrow={t.showcase.eyebrow} title={t.showcase.title} sub={t.showcase.sub} />

        <RevealItem className="mt-12">
          <div role="tablist" aria-label={t.showcase.title} className="flex flex-wrap gap-1 border-b border-granite-soft">
            {t.showcase.tabs.map((item, i) => (
              <button
                key={item.id}
                role="tab"
                id={`showcase-tab-${item.id}`}
                aria-selected={active === i}
                aria-controls={`showcase-panel-${item.id}`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setActive((a) => (a + 1) % panels.length);
                  if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + panels.length) % panels.length);
                }}
                className={`relative px-5 py-3.5 text-[0.9375rem] font-semibold transition-colors duration-200 ${
                  active === i ? 'text-ink' : 'text-granite hover:text-clay-deep'
                }`}
              >
                {item.label}
                {active === i && (
                  <motion.span
                    layoutId="showcase-underline"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-clay"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            ))}
          </div>
        </RevealItem>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:gap-14">
          <RevealItem>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, x: reduced ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -8 }}
                transition={{ duration: 0.28, ease: EASE_SETTLE }}
                role="tabpanel"
                id={`showcase-panel-${tab.id}`}
                aria-labelledby={`showcase-tab-${tab.id}`}
              >
                <h3 className="text-h3 text-ink">{tab.title}</h3>
                <p className="mt-4 max-w-prose text-body text-ink-soft/80">{tab.body}</p>
              </motion.div>
            </AnimatePresence>
          </RevealItem>

          <RevealItem>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                transition={{ duration: 0.28, ease: EASE_SETTLE }}
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </RevealItem>
        </div>
      </Reveal>
    </section>
  );
}
