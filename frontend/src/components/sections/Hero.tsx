import type { PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';
import { nudgeScale } from '../ui/BalanceScale';
import { ButtonLink } from '../ui/Button';

const EASE = [0.16, 1, 0.3, 1] as const;
const PREMIUM_EASE = [0.25, 0.1, 0.25, 1] as const;

export function Hero() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();

  // Enhanced parallax for premium depth effect
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 25 });
  const sy = useSpring(py, { stiffness: 150, damping: 25 });

  // Transform values for 3D effects
  const imageX = useTransform(sx, [-1, 1], [-8, 8]);
  const imageY = useTransform(sy, [-1, 1], [-6, 6]);
  const imageRotateX = useTransform(sy, [-1, 1], [2, -2]);
  const imageRotateY = useTransform(sx, [-1, 1], [-3, 3]);
  
  // Parallax scroll effects
  const backgroundY = useTransform(scrollY, [0, 500], [0, -100]);
  const textY = useTransform(scrollY, [0, 500], [0, 50]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    px.set(x);
    py.set(y);
  };
  
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section className="relative overflow-hidden pb-20 pt-[124px] lg:pb-[120px] lg:pt-[168px]">
      {/* Animated background with floating elements */}
      <motion.div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0"
        style={{ y: backgroundY }}
      >
        {/* Main grid */}
        <div className="flex justify-center opacity-40 h-full">
          <div className="h-full w-full max-w-content px-5 sm:px-8">
            <div className="grid h-full grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <motion.div 
                  key={i} 
                  className={`h-full border-l border-granite-soft/30 ${i > 1 ? 'hidden lg:block' : ''}`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 1.5, delay: i * 0.1, ease: EASE }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating legal symbols */}
        {/* Removed - causing black bubble effect */}
      </motion.div>

      <div className="shell relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        {/* ——— Left: Hero Content with enhanced animations ——— */}
        <motion.div className="z-10" style={{ y: textY }}>
          <motion.p
            className="label mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          >
            {t.hero.eyebrow}
          </motion.p>

          <motion.h1
            className="text-display text-ink"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          >
            {t.hero.headline.split(' ').map((word, i) => (
              <span key={i}>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: EASE,
                    delay: 0.3 + i * 0.1
                  }}
                >
                  {word}
                </motion.span>{' '}
              </span>
            ))}
          </motion.h1>

          <motion.p
            className="mt-7 max-w-prose text-body text-ink-soft/85"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
          >
            {t.hero.sub}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
          >
            <motion.span 
              onPointerDown={nudgeScale} 
              className="inline-flex"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <ButtonLink to="/signin" size="lg">
                {t.hero.ctaPrimary}
              </ButtonLink>
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <ButtonLink to="#how" variant="ghost" size="lg">
                {t.hero.ctaSecondary}
              </ButtonLink>
            </motion.span>
          </motion.div>

          <motion.ul
            className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-granite-soft pt-6 text-caption text-clay-deep"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1 }}
          >
            {t.hero.credibility.map((item, i) => (
              <motion.li 
                key={item} 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 1.2 + i * 0.1 }}
              >
                {i > 0 && <span aria-hidden="true" className="text-granite">·</span>}
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* ——— Right: Enhanced Cinematic Image ——— */}
        <motion.div 
          className="relative z-0"
          onPointerMove={onMove} 
          onPointerLeave={onLeave}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: PREMIUM_EASE, delay: 0.3 }}
        >
          {/* Mouse following spotlight effect - REMOVED */}

          <motion.div
            className="group relative mx-auto aspect-[16/11] w-full max-w-[600px] overflow-hidden rounded-2xl"
            style={reduced ? undefined : { 
              perspective: 1200,
              x: imageX,
              y: imageY,
              rotateX: imageRotateX,
              rotateY: imageRotateY,
            }}
            whileHover={reduced ? {} : {
              scale: 1.03,
              boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.4)",
              transition: { duration: 0.4, ease: PREMIUM_EASE }
            }}
          >
            
            {/* Main image container with enhanced depth */}
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1810] to-[#1a0f08] shadow-2xl">
              {/* Enhanced Gavel Strike Animation */}
              <motion.div
                className="absolute inset-0"
                animate={reduced ? {} : {
                  y: [0, -5, 2, 0, 0, 0],
                  rotate: [0, -2, 1, 0, 0, 0],
                  scale: [1, 1.01, 0.99, 1, 1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: [0.43, 0.13, 0.23, 0.96],
                  times: [0, 0.12, 0.2, 0.28, 0.35, 1],
                }}
              >
                {/* Enhanced Ken Burns effect */}
                <motion.div
                  className="absolute inset-0"
                  animate={reduced ? {} : {
                    scale: [1, 1.03, 1.01, 1],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <img
                    src="/images.jpeg"
                    alt="Legal justice and law - Professional legal authority"
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </motion.div>
              </motion.div>

              {/* Enhanced Impact Flash Effect */}
              {!reduced && (
                <>
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-white/0 rounded-2xl"
                    animate={{
                      opacity: [0, 0, 0, 0.12, 0, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 5,
                      times: [0, 0.18, 0.19, 0.21, 0.25, 1],
                    }}
                  />
                  {/* Secondary flash */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-clay/0 rounded-2xl"
                    animate={{
                      opacity: [0, 0, 0, 0.08, 0, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 5,
                      times: [0, 0.19, 0.21, 0.23, 0.27, 1],
                    }}
                  />
                </>
              )}

              {/* Enhanced gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f08]/50 via-transparent to-transparent pointer-events-none" />
              
              {/* Multiple light sweep effects */}
              {!reduced && (
                <>
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.04) 50%, transparent 70%)',
                    }}
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 6,
                    }}
                  />
                  {/* Secondary sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(70deg, transparent 40%, rgba(139, 90, 60, 0.02) 50%, transparent 60%)',
                    }}
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 8,
                      delay: 2,
                    }}
                  />
                </>
              )}

              {/* Enhanced border accent */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 pointer-events-none" />
            </div>

            {/* Enhanced Strike Ripple Effects */}
            {!reduced && (
              <>
                <motion.div
                  className="absolute bottom-[45%] left-1/2 -translate-x-1/2"
                  animate={{
                    scale: [0, 2, 3],
                    opacity: [0, 0, 0.4, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 5,
                    times: [0, 0.2, 0.22, 0.3],
                  }}
                >
                  <div className="h-40 w-40 rounded-full border-2 border-clay/40" />
                </motion.div>
                {/* Secondary ripple */}
                <motion.div
                  className="absolute bottom-[45%] left-1/2 -translate-x-1/2"
                  animate={{
                    scale: [0, 1.5, 2.5],
                    opacity: [0, 0, 0.6, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 5,
                    times: [0, 0.19, 0.21, 0.28],
                  }}
                >
                  <div className="h-32 w-32 rounded-full border-2 border-white/30" />
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}