import { motion } from 'framer-motion';
import { Bot, ShieldCheck, Mail, Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';
import { AnimatedBackground } from '../ui/AnimatedBackground';

export function EscalationLadder() {
  const { lang } = useLang();
  const reduced = useReducedMotion();

  const rungs = [
    {
      step: '01',
      titleBn: 'এআই সরাসরি উত্তর',
      titleEn: 'AI Answer',
      costBn: 'সম্পূর্ণ বিনামূল্যে · তাৎক্ষণিক',
      costEn: 'Free & Instant',
      descBn: 'বাংলাদেশের নির্দিষ্ট আইন ও ধারা উদ্ধৃত করে আপনার আইনি প্রশ্নের বিশদ বিশ্লেষণ।',
      descEn: 'Instant plain-language legal answers grounded in real Bangladeshi statutes with Act & Section cited.',
      icon: Bot,
      route: '/app/chat',
      badge: 'Free',
      color: 'from-green-500/10 to-emerald-500/10',
      borderColor: 'border-green-200',
    },
    {
      step: '02',
      titleBn: 'আইনজীবী দ্বারা যাচাই',
      titleEn: 'Lawyer Verification',
      costBn: 'বিনামূল্যে / নামমাত্র ফি · প্রায় ২ৄ ঘণ্টা',
      costEn: 'Free · ~24 Hours',
      descBn: 'এআই প্রদত্ত নির্দিষ্ট উত্তরটি একজন বার কাউন্সিল সনদপ্রাপ্ত আইনজীবী পর্যালোচনা করে নির্ভুলতা নিশ্চিত করবেন।',
      descEn: 'Have a verified advocate review the exact AI answer and issue a formal verdict with notes.',
      icon: ShieldCheck,
      route: '/how-it-works#verification',
      badge: 'Grounded',
      color: 'from-blue-500/10 to-cyan-500/10',
      borderColor: 'border-blue-200',
    },
    {
      step: '03',
      titleBn: 'আইনজীবীকে সরাসরি বার্তা',
      titleEn: 'Message a Lawyer',
      costBn: 'আইনজীবী কর্তৃক গৃহীত হওয়ার পর',
      costEn: 'Gated Thread',
      descBn: 'আপনার সুনির্দিষ্ট ঘটনার তথ্যাদি নিয়ে আইনজীবীর সাথে নিরাপদ ব্যক্তিগত মেসেজে আলোচনা।',
      descEn: 'Direct confidential messaging thread unlocks once a lawyer accepts your inquiry.',
      icon: Mail,
      route: '/lawyers',
      badge: 'Confidential',
      color: 'from-purple-500/10 to-violet-500/10',
      borderColor: 'border-purple-200',
    },
    {
      step: '04',
      titleBn: 'আইনজীবী নিয়োগ ও পরামর্শ',
      titleEn: 'Hire & Consult',
      costBn: 'ধার্যকৃত ফি অনুযায়ী · অডিও / ভিডিও / সরাসরি',
      costEn: 'Paid Consultation',
      descBn: 'নোটিশ প্রেরণ, মামলা প্রস্তুতি বা পূর্ণাঙ্গ শুনানির জন্য বিশেষজ্ঞ আইনজীবীর সাথে অ্যাপয়েন্টমেন্ট।',
      descEn: 'Schedule scheduled audio, video or chamber consultations for formal representation and notice drafting.',
      icon: Briefcase,
      route: '/lawyers',
      badge: 'Representation',
      color: 'from-orange-500/10 to-red-500/10',
      borderColor: 'border-orange-200',
    },
  ];

  return (
    <section className="section-pad border-y border-granite bg-bone relative overflow-hidden">
      <AnimatedBackground variant="legal-symbols" className="opacity-20" />
      
      <div className="shell relative">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.span 
            className="font-mono text-label uppercase tracking-wider text-clay-deep"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {lang === 'bn' ? 'ধাপে ধাপে সমাধান' : 'The Escalation Ladder'}
          </motion.span>
          <motion.h2 
            className="font-display text-h2 font-bold text-ink mt-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            {lang === 'bn' ? 'তথ্য থেকে আইনজীবীর পাশে পাওয়া' : 'From Instant Information to Representation'}
          </motion.h2>
          <motion.p 
            className="mt-4 font-body text-body text-ink-soft"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            {lang === 'bn'
              ? 'আপনার প্রয়োজন অনুযায়ী চারটি সুনির্দিষ্ট ধাপ। সাধারণ তথ্যের জন্য কোনো ফি নেই, জটিল বিষয়ে সরাসরি আইনজীবীর পরামর্শ।'
              : 'Four deliberate rungs calibrated by cost, speed, and legal certainty. You never pay for simple information.'}
          </motion.p>
        </motion.div>

        {/* Connecting Lines (Desktop) */}
        {!reduced && (
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none">
            <motion.svg
              className="w-full h-2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <motion.path
                d="M 0 1 Q 25 1 50 1 T 100 1"
                stroke="url(#gradient)"
                strokeWidth="2"
                fill="none"
                vectorEffect="non-scaling-stroke"
                style={{ pathLength: 1 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5A3C" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#8B5A3C" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8B5A3C" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </motion.svg>
          </div>
        )}

        {/* 4 Rungs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {rungs.map((r, idx) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.step}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: idx * 0.15,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={reduced ? {} : { 
                  y: -8,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                className={`group flex flex-col justify-between rounded-xl border ${r.borderColor} bg-gradient-to-br ${r.color} backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
              >
                {/* Background glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)`
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between border-b border-granite-soft/30 pb-3 mb-4">
                    <motion.span 
                      className="font-mono text-xs font-bold text-clay-deep"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.15 + 0.3 }}
                    >
                      {r.step}
                    </motion.span>
                    <motion.span 
                      className="font-mono text-[10px] uppercase bg-white/80 text-clay-deep px-2 py-0.5 rounded-full border border-clay/20 shadow-sm"
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.15 + 0.4 }}
                    >
                      {r.badge}
                    </motion.span>
                  </div>

                  <motion.div 
                    className="mb-4 text-clay-deep"
                    whileHover={reduced ? {} : { 
                      rotate: [0, -10, 10, 0],
                      scale: 1.1,
                      transition: { duration: 0.5 }
                    }}
                  >
                    <Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
                  </motion.div>

                  <motion.h3 
                    className="font-display text-base font-bold text-ink mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.5 }}
                  >
                    {lang === 'bn' ? r.titleBn : r.titleEn}
                  </motion.h3>

                  <motion.p 
                    className="text-xs font-mono text-clay-deep font-semibold mb-3"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.6 }}
                  >
                    {lang === 'bn' ? r.costBn : r.costEn}
                  </motion.p>

                  <motion.p 
                    className="text-xs text-ink-soft leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.7 }}
                  >
                    {lang === 'bn' ? r.descBn : r.descEn}
                  </motion.p>
                </div>

                <motion.div 
                  className="mt-6 pt-4 border-t border-granite-soft/30 relative z-10"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 + 0.8 }}
                >
                  <Link
                    to={r.route}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-deep hover:text-ink transition-all duration-200 group/link"
                  >
                    <span>{lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Explore'}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-1 transition-transform duration-200" />
                  </Link>
                </motion.div>

                {/* Step number background */}
                <div className="absolute top-4 right-4 opacity-5 text-6xl font-bold text-clay-deep select-none">
                  {idx + 1}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress indicators */}
        {!reduced && (
          <motion.div 
            className="flex justify-center mt-8 gap-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1 }}
          >
            {rungs.map((_, idx) => (
              <motion.div
                key={idx}
                className="h-1 w-12 bg-clay/20 rounded-full overflow-hidden"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2 + idx * 0.1, duration: 0.4 }}
              >
                <motion.div
                  className="h-full w-full bg-clay rounded-full"
                  initial={{ x: "-100%" }}
                  whileInView={{ x: "0%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.4 + idx * 0.1, duration: 0.6 }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
