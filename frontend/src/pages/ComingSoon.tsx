import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { BalanceScale } from '../components/ui/BalanceScale';
import { ButtonLink } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';

/** Every route resolves to something real — no dead links, no bare "#". */
export default function ComingSoon({ title }: { title: string }) {
  const { t } = useLang();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bone">
      <header className="border-b border-granite-soft px-5 py-4 sm:px-8">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-10 w-28 opacity-70">
            <BalanceScale className="h-auto w-full" weight={1.6} />
          </div>
          <p className="label mb-4">{t.common.comingSoon}</p>
          <h1 className="text-h2 text-ink">{title}</h1>
          <p className="mt-5 text-body text-ink-soft/80">{t.common.comingSoonBody}</p>
          <div className="mt-9 flex justify-center gap-3">
            <ButtonLink to="/signin">{t.hero.ctaPrimary}</ButtonLink>
            <ButtonLink to="/" variant="ghost">
              {t.common.backHome}
            </ButtonLink>
          </div>
          <Link to="/kitchen-sink" className="link-underline mt-8 inline-block text-caption text-granite hover:text-ink">
            /kitchen-sink
          </Link>
        </div>
      </main>
    </div>
  );
}
