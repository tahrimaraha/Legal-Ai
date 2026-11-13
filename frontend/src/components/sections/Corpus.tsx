import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { statutesData } from '../../data/statutes';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { StatusBadge } from '../ui/StatusBadge';
import { FloatingBalance } from '../ui/FloatingGavel';

/** Set as the contents page of a legal code: index numeral, title, leader, year. */
export function Corpus() {
  const { lang, num } = useLang();
  const liveStatutes = statutesData.filter((s) => s.status === 'live');
  const plannedStatutes = statutesData.filter((s) => s.status !== 'live');

  return (
    <section id="statutes" className="section-pad scroll-mt-24 bg-ink text-bone relative overflow-hidden">
      {/* Floating background elements */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <FloatingBalance className="absolute left-[5%] top-[10%]" size={70} delay={1} />
        <FloatingBalance className="absolute right-[8%] bottom-[15%]" size={60} delay={3} duration={12} />
      </div>
      
      <Reveal className="shell relative z-10">
        <SectionHeading
          eyebrow={lang === 'bn' ? 'আইন সংকলন' : 'Statute Corpus'}
          title={lang === 'bn' ? 'পাঁচটি প্রধান আইন, ধারা উদ্ধৃতিসহ' : 'Curated Bangladeshi Statutes'}
          sub={
            lang === 'bn'
              ? 'এআই শুধুমাত্র এই সংকলিত আইনের ভিত্তিতে উত্তর প্রদান করে। সংকলনের বাইরের বিষয়ে আইনজীবীর পরামর্শ গ্রহণের দিকনির্দেশনা দেওয়া হয়।'
              : 'Every claim is directly grounded in these codified statutes. When outside scope, the system explicitly routes to an advocate.'
          }
          tone="invert"
        />

        <div className="mt-12">
          <div className="flex items-center justify-between border-b border-granite/30 pb-3">
            <span className="font-mono text-label uppercase text-clay tracking-wider">
              {lang === 'bn' ? 'সক্রিয় আইনসমূহ (Live)' : 'Live Indexed Statutes'}
            </span>
            <Link to="/statutes" className="font-mono text-xs text-clay-tint hover:underline">
              {lang === 'bn' ? 'সকল আইন ও ধারা দেখুন →' : 'View Full Library →'}
            </Link>
          </div>

          <ol className="divide-y divide-granite/20">
            {liveStatutes.map((item, i) => (
              <RevealItem as="li" key={item.id}>
                <Link
                  to={`/statutes/${item.slug}`}
                  className="group flex items-baseline gap-4 py-5 transition-colors duration-300 hover:bg-white/5 sm:gap-8 sm:px-3 rounded"
                >
                  <motion.span 
                    className="font-mono text-[0.75rem] tracking-label text-clay-tint/70"
                    whileHover={{ scale: 1.2, color: 'rgb(var(--clay))' }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {num(String(i + 1).padStart(2, '0'))}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <span className="block font-display text-[1.125rem] leading-snug text-bone sm:text-[1.375rem] group-hover:text-white transition">
                      {lang === 'bn' ? item.titleBn : item.titleEn}
                    </span>
                    <span className="mt-1 block text-caption text-granite line-clamp-1">
                      {lang === 'bn' ? item.descriptionBn : item.descriptionEn}
                    </span>
                  </div>
                  <span aria-hidden="true" className="hidden h-px flex-1 border-b border-dotted border-granite/40 sm:block" />
                  <div className="shrink-0 text-right">
                    <span className="block font-mono text-[0.875rem] text-clay-tint">{item.year}</span>
                    <span className="mt-1 block font-mono text-[0.625rem] tracking-label text-granite">
                      {num(item.sectionCount)} {lang === 'bn' ? 'ধারা' : 'sections'}
                    </span>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </ol>

          {/* Planned section */}
          <div className="mt-10 pt-6 border-t border-granite/30">
            <span className="font-mono text-label uppercase text-granite tracking-wider">
              {lang === 'bn' ? 'আসন্ন সংকলন (Coming Soon)' : 'Planned & Ingesting'}
            </span>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plannedStatutes.map((item) => (
                <div key={item.id} className="p-3.5 rounded border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-clay-tint">{item.year}</span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="font-display text-sm text-bone font-medium">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
