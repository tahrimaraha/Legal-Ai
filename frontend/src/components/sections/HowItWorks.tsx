import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { EASE_SETTLE, revealViewport } from '../../lib/motion';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

/** The connecting rule draws itself as the sequence enters view. */
function DrawnRule({ orientation }: { orientation: 'h' | 'v' }) {
  const horizontal = orientation === 'h';
  return (
    <svg
      aria-hidden="true"
      className={horizontal ? 'absolute left-0 top-[7px] hidden h-px w-full lg:block' : 'absolute left-[7px] top-0 h-full w-px lg:hidden'}
      viewBox={horizontal ? '0 0 100 1' : '0 0 1 100'}
      preserveAspectRatio="none"
    >
      <motion.line
        x1={horizontal ? 0 : 0.5}
        y1={horizontal ? 0.5 : 0}
        x2={horizontal ? 100 : 0.5}
        y2={horizontal ? 0.5 : 100}
        stroke="rgb(var(--c-granite))"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={revealViewport}
        transition={{ duration: 1.1, ease: EASE_SETTLE }}
      />
    </svg>
  );
}

export function HowItWorks() {
  const { t } = useLang();
  return (
    <section id="how" className="section-pad scroll-mt-24">
      <Reveal className="shell">
        <SectionHeading eyebrow={t.how.eyebrow} title={t.how.title} />

        <div className="relative mt-16 pl-10 lg:pl-0 lg:pt-12">
          <DrawnRule orientation="h" />
          <DrawnRule orientation="v" />

          <ol className="grid gap-12 lg:grid-cols-4 lg:gap-8">
            {t.how.steps.map((s, idx) => (
              <RevealItem as="li" key={s.n} className="relative">
                <motion.span
                  aria-hidden="true"
                  className="absolute -left-10 top-0 block h-[15px] w-[15px] rounded-full border border-granite bg-bone lg:-top-[19px] lg:left-0"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={revealViewport}
                  transition={{ delay: idx * 0.2, type: "spring", stiffness: 300, damping: 20 }}
                />
                <motion.span
                  aria-hidden="true"
                  className="absolute -left-[34px] top-[4px] block h-[7px] w-[7px] rounded-full bg-clay lg:-top-[15px] lg:left-1"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={revealViewport}
                  transition={{ delay: idx * 0.2 + 0.1, type: "spring", stiffness: 400, damping: 15 }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(var(--c-clay), 0.4)",
                      "0 0 0 8px rgba(var(--c-clay), 0)",
                    ],
                  }}
                  style={{
                    animationDelay: `${idx * 0.2}s`,
                  }}
                />
                <p className="font-mono text-[0.75rem] tracking-label text-clay">{s.n}</p>
                <h3 className="mt-4 font-display text-[1.375rem] leading-snug text-ink">{s.title}</h3>
                <p className="mt-3 text-caption leading-relaxed text-ink-soft/80">{s.body}</p>
              </RevealItem>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
