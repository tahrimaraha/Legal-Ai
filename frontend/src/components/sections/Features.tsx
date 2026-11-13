import { FileText, Flag, MessageSquareText, Search, ShieldCheck, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';
import { Reveal, RevealItem } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { AnimatedBackground } from '../ui/AnimatedBackground';

const icons = [MessageSquareText, FileText, Search, History, Flag, ShieldCheck];

export function Features() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  
  return (
    <section id="features" className="section-pad scroll-mt-24 bg-bone-deep/50 relative overflow-hidden">
      <AnimatedBackground variant="orbs" className="opacity-30" />
      
      <Reveal className="shell relative">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} />
        
        <div className="mt-14 grid gap-px border border-granite-soft bg-granite-soft sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => {
            const Icon = icons[i];
            return (
              <RevealItem key={`feature-${i}`}>
                <motion.div
                  className="group border-transparent bg-bone p-8 transition-all duration-300 hover:bg-paper hover:shadow-lg relative overflow-hidden"
                  whileHover={reduced ? {} : { 
                    y: -4,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  {/* Background shimmer effect */}
                  {!reduced && (
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: 'linear-gradient(120deg, transparent 30%, rgba(139, 90, 60, 0.05) 50%, transparent 70%)',
                      }}
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                      }}
                    />
                  )}

                  <motion.div
                    className="relative z-10"
                    whileHover={reduced ? {} : { 
                      scale: 1.1, 
                      rotate: [0, -2, 2, 0],
                      transition: { duration: 0.4, ease: "easeOut" }
                    }}
                  >
                    <Icon className="h-5 w-5 text-clay transition-all duration-300 group-hover:text-clay-deep group-hover:-translate-y-0.5" aria-hidden="true" />
                  </motion.div>
                  
                  <h3 className="mt-7 font-display text-[1.375rem] text-ink relative z-10">{f.title}</h3>
                  
                  <ul className="mt-5 space-y-2 relative z-10">
                    {f.bullets.map((b, idx) => (
                      <motion.li 
                        key={b} 
                        className="flex gap-3 text-caption text-ink-soft/80"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (i * 0.1) + (idx * 0.05) + 0.3 }}
                      >
                        <motion.span 
                          aria-hidden="true" 
                          className="mt-2 h-px w-3 shrink-0 bg-granite transition-all duration-300 group-hover:bg-clay group-hover:w-4"
                          whileInView={reduced ? {} : {
                            scaleX: [0, 1],
                            transition: { delay: (i * 0.1) + (idx * 0.05) + 0.5, duration: 0.3 }
                          }}
                        />
                        {b}
                      </motion.li>
                    ))}
                  </ul>

                  {/* Corner decoration - REMOVED */}
                </motion.div>
              </RevealItem>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
