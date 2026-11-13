import { useLang } from '../../context/LanguageContext';
import { Accordion } from '../ui/Accordion';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export function Faq() {
  const { t } = useLang();
  return (
    <section id="faq" className="section-pad scroll-mt-24 bg-bone-deep/50">
      <Reveal className="shell grid gap-12 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:gap-20">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <RevealItem>
          <Accordion items={t.faq.items.map((i) => ({ q: i.q, a: i.a }))} />
        </RevealItem>
      </Reveal>
    </section>
  );
}
