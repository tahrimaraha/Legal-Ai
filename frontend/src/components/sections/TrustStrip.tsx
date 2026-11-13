import { ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { Reveal, RevealItem } from '../ui/Reveal';

const anchors = ['#showcase', '#showcase', '#statutes', '#features'];

export function TrustStrip() {
  const { t } = useLang();
  return (
    <section aria-label={t.trust.title} className="border-y border-granite-soft bg-bone-deep/60">
      <Reveal className="shell grid grid-cols-2 divide-granite-soft lg:grid-cols-4 lg:divide-x">
        {t.trust.items.map((item, i) => (
          <RevealItem key={item.label}>
            <motion.a
              href={anchors[i]}
              className="group flex h-full flex-col justify-between gap-6 border-b border-granite-soft px-1 py-7 transition-colors duration-200 hover:bg-clay-tint/50 lg:border-b-0 lg:px-7"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.span 
                className="label"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {String(i + 1).padStart(2, '0')}
              </motion.span>
              <span>
                <motion.span 
                  className="block font-display text-[1.25rem] text-ink"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                >
                  {item.label}
                </motion.span>
                <span className="mt-1.5 flex items-center gap-2 text-caption text-clay-deep">
                  {item.note}
                  <ArrowDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5" aria-hidden="true" />
                </span>
              </span>
            </motion.a>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
