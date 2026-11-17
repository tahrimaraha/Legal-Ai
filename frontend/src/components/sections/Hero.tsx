import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, Play, Scale, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useReducedMotion } from '../../lib/motion';
import { nudgeScale } from '../ui/BalanceScale';

const EASE = [0.16, 1, 0.3, 1] as const;
const CRED_ICONS: LucideIcon[] = [Scale, CircleCheck, ShieldCheck];

/** Full-bleed courtroom hero: warm-dark photo, serif headline, a defined credibility bar. */
export function Hero() {
  const { t, lang } = useLang();
  const reduced = useReducedMotion();
  const bn = lang === 'bn';

  // The last two words of the headline get the warm accent ("own words." / "আপনার ভাষায়।").
  const words = t.hero.headline.split(' ');
  const plain = words.slice(0, -2).join(' ');
  const accent = words.slice(-2).join(' ');

  const rise = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <section className="relative isolate overflow-hidden bg-[#1c120c] text-[#f6ece3]">
      {/* ——— Background photograph + sunlight. Light layers share the photo's box so they line up
           with its windows (≈30%, 70%, 93% across, upper half). ——— */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-20 w-full overflow-hidden lg:w-[68%] lg:[mask-image:linear-gradient(to_right,transparent_0%,#000_22%)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,#000_22%)]"
      >
        <motion.img
          src="/hero-courtroom.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_60%]"
          style={{ filter: 'saturate(1.3) contrast(1.14) brightness(1.08) sepia(0.12)' }}
          initial={reduced ? false : { scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
          loading="eager"
          decoding="async"
        />
        {/* warm golden grade */}
        <div className="absolute inset-0 bg-[#e0893c]/25 mix-blend-soft-light" />

        {/* windows glowing with daylight */}
        {[
          { left: '30%', w: '13%', o: 0.55 },
          { left: '70%', w: '14%', o: 0.75 },
          { left: '93%', w: '14%', o: 0.85 },
        ].map((win) => (
          <div
            key={win.left}
            className="absolute top-[8%] h-[46%] -translate-x-1/2 rounded-[45%] mix-blend-screen blur-xl"
            style={{
              left: win.left,
              width: win.w,
              opacity: win.o,
              background: 'radial-gradient(closest-side, rgba(255,226,180,0.95), rgba(255,196,128,0.45) 55%, transparent)',
            }}
          />
        ))}

        {/* god rays: long soft beams falling down-left from the right-hand windows */}
        {[
          { left: '97%', w: '9%', delay: 0, o: 0.7, blur: 'blur-[10px]' },
          { left: '91%', w: '3.5%', delay: 1.4, o: 0.75, blur: 'blur-[4px]' },
          { left: '84%', w: '6%', delay: 0.8, o: 0.55, blur: 'blur-[8px]' },
          { left: '76%', w: '8%', delay: 2.1, o: 0.6, blur: 'blur-[10px]' },
          { left: '70%', w: '2.5%', delay: 0.3, o: 0.65, blur: 'blur-[3px]' },
          { left: '62%', w: '5%', delay: 1.8, o: 0.4, blur: 'blur-[8px]' },
        ].map((ray) => (
          <motion.div
            key={ray.left}
            className={`absolute top-[12%] h-[150%] origin-top mix-blend-screen ${ray.blur}`}
            style={{
              left: ray.left,
              width: ray.w,
              rotate: 38,
              background:
                'linear-gradient(to bottom, rgba(255,222,170,0.85) 0%, rgba(255,200,140,0.45) 35%, rgba(255,190,120,0.12) 70%, transparent 100%)',
            }}
            initial={{ opacity: ray.o }}
            animate={reduced ? undefined : { opacity: [ray.o, ray.o * 0.6, ray.o] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: ray.delay }}
          />
        ))}

        {/* dust drifting through the light */}
        {!reduced &&
          [
            [72, 30, 0], [80, 44, 1.5], [66, 52, 3], [88, 38, 2.2], [75, 62, 4], [60, 40, 5.2], [84, 58, 0.8], [92, 50, 3.6],
          ].map(([x, y, d], i) => (
            <motion.span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-[#fff1da] shadow-[0_0_6px_2px_rgba(255,230,190,0.6)]"
              style={{ left: `${x}%`, top: `${y}%` }}
              animate={{ y: [0, 18, 0], x: [0, -10, 0], opacity: [0, 0.9, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: d }}
            />
          ))}

        {/* where the sunlight lands on the floor and benches */}
        <div className="absolute bottom-[8%] left-[38%] h-[32%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(255,196,130,0.45),transparent)] mix-blend-screen blur-2xl" />
        {/* faint warm haze in the air */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_30%,rgba(255,206,150,0.18),transparent_70%)] mix-blend-screen" />
      </div>

      {/* Left-side fade so the copy reads cleanly (lighter than before so the room stays visible) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#1c120c_0%,#1c120c_26%,rgba(28,18,12,0.86)_38%,rgba(28,18,12,0.4)_55%,rgba(28,18,12,0.06)_78%,transparent_100%)] max-lg:bg-[linear-gradient(180deg,rgba(28,18,12,0.7)_0%,rgba(28,18,12,0.82)_55%,#1c120c_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-[#1c120c]/70 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#1c120c] to-transparent" />

      <div className="shell relative flex min-h-[640px] flex-col justify-center pb-16 pt-[128px] lg:min-h-[min(860px,100svh)] lg:pb-20 lg:pt-[140px]">
        <div className="max-w-[640px]">
          <motion.p
            {...rise(0.1)}
            className="mb-7 flex items-center gap-4 font-body text-[12px] font-medium uppercase tracking-[0.24em] text-[#e9d8c8]/85"
          >
            <span>{t.hero.eyebrow}</span>
            <span aria-hidden="true" className="h-px w-16 bg-[#e9d8c8]/45" />
          </motion.p>

          <motion.h1
            {...rise(0.2)}
            className={`text-[#fbf4ec] ${
              bn
                ? 'font-display text-[clamp(2.4rem,1.6rem+3.2vw,3.9rem)] font-semibold leading-[1.3]'
                : 'text-[clamp(2.75rem,1.4rem+4.6vw,4.75rem)] font-medium leading-[1.06] tracking-[-0.015em]'
            }`}
            style={bn ? undefined : { fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {plain} <span className="text-[#efc9a4]">{accent}</span>
          </motion.h1>

          <motion.p {...rise(0.35)} className="mt-7 max-w-[34rem] text-[1.0625rem] leading-[1.7] text-[#efe3d8]/85">
            {t.hero.sub}
          </motion.p>

          {/* ——— Actions ——— */}
          <motion.div {...rise(0.5)} className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              to={`/signin?redirect=${encodeURIComponent('/app/chat')}`}
              onPointerDown={nudgeScale}
              className="group inline-flex items-center gap-3 rounded-lg bg-[#f6dcc2] px-7 py-4 text-[1rem] font-semibold text-[#2a170c] shadow-[0_10px_30px_-10px_rgba(246,220,194,0.45)] transition hover:bg-[#fbe8d5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6dcc2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c120c]"
            >
              {t.hero.ctaPrimary}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <span aria-hidden="true" className="hidden h-10 w-px bg-[#e9d8c8]/25 sm:block" />
            <a
              href="#how"
              className="group inline-flex items-center gap-3 rounded-lg px-2 py-3 text-[1rem] font-medium text-[#f6ece3] transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6dcc2]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f6ece3]/70 transition group-hover:border-white group-hover:bg-white/10">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
              </span>
              {t.hero.ctaSecondary}
            </a>
          </motion.div>
        </div>

          {/* ——— Credibility bar: icon + label, separated by clear dividers ——— */}
          <motion.ul
            {...rise(0.65)}
            className="mt-14 flex w-full flex-col overflow-hidden rounded-xl border border-[#e9d8c8]/15 bg-[#1c120c]/55 backdrop-blur-sm md:w-max md:flex-row"
          >
            {t.hero.credibility.map((item, i) => {
              const Icon = CRED_ICONS[i % CRED_ICONS.length];
              return (
                <li
                  key={item}
                  className={`flex items-center gap-3 whitespace-nowrap px-5 py-3.5 text-[0.875rem] text-[#efe3d8]/90 ${
                    i > 0 ? 'border-t border-[#e9d8c8]/15 md:border-l md:border-t-0' : ''
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-[#efc9a4]" strokeWidth={1.75} />
                  <span>{item}</span>
                </li>
              );
            })}
          </motion.ul>
      </div>

      {/* Defined bottom edge into the next section */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-[#e9d8c8]/15" />
    </section>
  );
}
