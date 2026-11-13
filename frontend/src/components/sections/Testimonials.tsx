import { useLang } from '../../context/LanguageContext';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export function Testimonials() {
  const { t } = useLang();
  return (
    <section className="section-pad bg-bone-deep/50">
      <Reveal className="shell">
        <SectionHeading title={t.testimonials.title} />
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {t.testimonials.items.map((item) => (
            <RevealItem key={item.role} className="margin-rule pl-6">
              <blockquote>
                <p className="font-display text-[1.125rem] leading-relaxed text-ink">{item.quote}</p>
                <footer className="mt-5 font-mono text-[0.6875rem] tracking-label text-clay-deep">— {item.role}</footer>
              </blockquote>
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
