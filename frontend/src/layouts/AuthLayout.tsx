import { Outlet, Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { LogoMark } from '../components/ui/Logo';

/**
 * Sign in / sign up shell: a sunlit chamber (window light, books, the bench illustration) behind a
 * cream card. Only presentation lives here — every auth page keeps its own steps and logic.
 */
export function AuthLayout() {
  const { lang } = useLang();
  const bn = lang === 'bn';

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-[#ecd3b9] font-body text-ink-soft selection:bg-clay-tint">
      {/* ——— Scenery (decorative) ——— */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* warm wall */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,#f8e6d2_0%,#f0d8bf_45%,#e2c09f_100%)]" />
        {/* window light falling in from the left */}
        <div className="absolute -left-[10%] top-0 h-[120%] w-[60%] -skew-x-[18deg] bg-[repeating-linear-gradient(90deg,rgba(255,247,236,0.55)_0px,rgba(255,247,236,0.55)_70px,transparent_70px,transparent_110px)] opacity-60 blur-2xl" />
        <div className="absolute left-[2%] top-[4%] h-[70%] w-[22%] rounded-t-full border-[14px] border-[#fff6ea]/45 blur-[3px] max-lg:hidden" />
        {/* floor */}
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent via-[#dcb995]/60 to-[#cfa983]/80" />
        {/* soft arc behind the bench */}
        <div className="absolute -right-[10%] top-[24%] h-[78vh] w-[78vh] rounded-full bg-[#f7e7d5]/70 max-md:hidden" />
        {/* books on a low shelf, out of focus */}
        <div className="absolute bottom-[14%] left-[3%] hidden items-end gap-[3px] blur-[2.5px] lg:flex">
          {[
            ['#5b3a2a', 150], ['#7a5038', 170], ['#3f2a20', 160], ['#8b6248', 175], ['#6b4a3a', 150],
            ['#a37a58', 165], ['#4d3226', 172], ['#7b3e2c', 158],
          ].map(([c, h], i) => (
            <span key={i} className="block w-[22px] rounded-t-[2px]" style={{ background: c as string, height: h as number }} />
          ))}
        </div>
        <div className="absolute bottom-[12%] left-[1%] hidden h-5 w-[300px] rounded-sm bg-[#a87c58] blur-[2px] lg:block" />
        {/* the bench illustration (title cropped off, edges blended into the room) */}
        <div
          className="absolute bottom-[6%] right-0 hidden w-[min(44vw,620px)] overflow-hidden md:block"
          style={{
            // Fade the picture's own rectangle (left, top and bottom edges) into the room.
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, #000 13%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 90%, transparent 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent 0%, #000 13%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 90%, transparent 100%)',
            maskComposite: 'intersect',
          }}
        >
          <img src="/law-desk.png" alt="" className="-mt-[19%] w-full mix-blend-multiply" />
        </div>
        {/* gentle vignette so the card stays the focus */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_50%,transparent_40%,rgba(120,70,40,0.12)_100%)]" />
      </div>

      {/* ——— Floating top bar ——— */}
      <header className="px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-xl bg-[#4a2a19]/95 px-4 py-3 shadow-[0_14px_34px_-16px_rgba(60,30,12,0.7)] ring-1 ring-black/10 backdrop-blur sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-10 rounded-lg ring-1 ring-white/20" />
            <span className="flex flex-col leading-tight">
              <span
                className="text-lg font-semibold tracking-wide text-[#fbf2e8]"
                style={bn ? undefined : { fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                LEGAL AI
              </span>
              <span className="text-[12px] text-[#e9d6c4]/85">{bn ? 'আইনি সহায়ক' : 'Legal Assistant'}</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle tone="invert" />
            <span aria-hidden="true" className="hidden h-7 w-px bg-[#e9d6c4]/25 sm:block" />
            <Link to="/signin" className="hidden text-[0.9375rem] font-medium text-[#fbf2e8]/90 transition hover:text-white sm:block">
              {bn ? 'সাইন ইন' : 'Sign In'}
            </Link>
            <Link
              to="/signup"
              className="hidden rounded-lg bg-[#f6dcc2] px-4 py-2 text-[0.9375rem] font-semibold text-[#3a2112] transition hover:bg-[#fbe8d5] sm:block"
            >
              {bn ? 'শুরু করুন' : 'Get started'}
            </Link>
          </div>
        </div>
      </header>

      {/* ——— Card ——— */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="auth-card w-full max-w-[34rem] rounded-2xl border border-white/60 bg-[#fdf6ee]/95 p-6 shadow-[0_30px_70px_-28px_rgba(90,45,15,0.55)] backdrop-blur-sm sm:p-10">
          <Outlet />
        </div>
      </main>

      {/* ——— Footer ——— */}
      <footer className="px-4 pb-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4 text-center text-[13px] text-[#6b4a35]">
          <span aria-hidden="true" className="h-px flex-1 bg-[#6b4a35]/25" />
          <p>
            {bn
              ? `© ${new Date().getFullYear().toLocaleString('bn-BD', { useGrouping: false })} আইনি সহায়ক · তথ্যগত আইনি প্ল্যাটফর্ম`
              : `© ${new Date().getFullYear()} AI Legal Assistant for Citizens · Legal Information Platform`}
          </p>
          <span aria-hidden="true" className="h-px flex-1 bg-[#6b4a35]/25" />
        </div>
      </footer>
    </div>
  );
}
