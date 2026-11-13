import { Outlet, Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { LogoMark } from '../components/ui/Logo';

export function AuthLayout() {
  const { lang } = useLang();

  return (
    <div className="flex min-h-[100dvh] flex-col justify-between bg-bone text-ink-soft font-body selection:bg-clay-tint p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="header-wood flex items-center justify-between mx-auto w-full max-w-5xl rounded-md px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#FDF6E8] p-0.5 shadow-sm"><LogoMark className="h-full w-full" /></span>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold text-bone tracking-tight">LEGAL AI</span>
            <span className="text-[10px] text-clay-tint font-mono uppercase">
              {lang === 'bn' ? 'আইনি সহায়ক' : 'Legal Assistant'}
            </span>
          </div>
        </Link>
        <LanguageToggle tone="invert" />
      </header>

      {/* Main card */}
      <main className="my-auto mx-auto w-full max-w-md py-8">
        <div className="rounded border border-granite bg-white p-6 sm:p-8 shadow-composer">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-granite font-mono">
        <p>
          {lang === 'bn'
            ? '© ২০২৫ আইনি সহায়ক · তথ্যগত আইনি প্ল্যাটফর্ম'
            : '© 2025 AI Legal Assistant for Citizens · Legal Information Platform'}
        </p>
      </footer>
    </div>
  );
}
