import { Check, Minus, TriangleAlert } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

export function Safety() {
  const { t } = useLang();
  const columns = [
    { key: 'does', data: t.safety.does, Icon: Check, tone: 'text-clay-deep' },
    { key: 'doesNot', data: t.safety.doesNot, Icon: Minus, tone: 'text-granite' },
    { key: 'lawyer', data: t.safety.lawyer, Icon: TriangleAlert, tone: 'text-brick' },
  ];

  return (
    <section id="safety" className="section-pad scroll-mt-24">
      <Reveal className="shell">
        <SectionHeading eyebrow={t.safety.eyebrow} title={t.safety.title} />

        <div className="mt-14 grid gap-px border border-granite-soft bg-granite-soft md:grid-cols-3">
          {columns.map(({ key, data, Icon, tone }) => (
            <RevealItem key={key} className="bg-paper p-8 lg:p-10">
              <div className="flex items-center gap-2.5 border-b border-granite-soft pb-5">
                <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
                <h3 className="font-display text-[1.25rem] text-ink">{data.title}</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {data.items.map((item) => (
                  <li key={item} className="flex gap-3 text-caption leading-relaxed text-ink-soft/85">
                    <span aria-hidden="true" className={`mt-2 h-px w-3 shrink-0 ${key === 'lawyer' ? 'bg-brick' : 'bg-granite'}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
