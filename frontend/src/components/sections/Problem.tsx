import { useLang } from '../../context/LanguageContext';
import { CountUp } from '../ui/CountUp';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export function Problem() {
  const { t } = useLang();
  return (
    <section className="section-pad">
      <Reveal className="shell grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <SectionHeading eyebrow={t.problem.eyebrow} title={t.problem.title} />
          <RevealItem as="p">
            <span className="mt-6 block max-w-prose text-body text-ink-soft/80">{t.problem.body}</span>
          </RevealItem>
        </div>

        <dl className="grid gap-px self-start border border-granite-soft bg-granite-soft">
          {t.problem.stats.map((s, i) => (
            <RevealItem key={`stat-${i}`} className="bg-bone p-7 lg:p-8">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <p className="font-display text-[clamp(2.25rem,1.6rem+2vw,3rem)] leading-none text-ink">
                  <CountUp value={s.value} decimals={s.value % 1 !== 0 ? 1 : 0} />
                  {s.suffix}
                </p>
                <p className="mt-3 text-[0.9375rem] font-semibold text-ink-soft">{s.label}</p>
                <p className="mt-1.5 text-caption text-clay-deep">{s.note}</p>
              </dd>
            </RevealItem>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
