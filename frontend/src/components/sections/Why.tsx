import { useLang } from '../../context/LanguageContext';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export function Why() {
  const { t } = useLang();
  return (
    <section className="section-pad">
      <Reveal className="shell">
        <SectionHeading title={t.why.title} />
        <div className="mt-14 grid gap-px border border-granite-soft bg-granite-soft md:grid-cols-3">
          {t.why.cards.map((c) => (
            <RevealItem key={c.n} className="group bg-bone p-8 transition-colors duration-300 hover:bg-paper lg:p-10">
              <p className="font-mono text-[0.75rem] tracking-label text-clay">{c.n}</p>
              <h3 className="mt-8 text-h3">{c.title}</h3>
              <p className="mt-4 text-body text-ink-soft/80">{c.body}</p>
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
