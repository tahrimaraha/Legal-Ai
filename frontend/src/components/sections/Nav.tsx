import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ButtonLink } from '../ui/Button';
import { LanguageToggle } from '../ui/LanguageToggle';
import { Logo } from '../ui/Logo';

export function Nav() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const links = [
    { label: t.nav.how, href: '#how' },
    { label: t.nav.features, href: '#features' },
    { label: t.nav.statutes, href: '#statutes' },
    { label: t.nav.faq, href: '#faq' },
  ];

  return (
    <motion.header
      className="header-wood fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      animate={{
        borderBottomColor: scrolled ? 'rgba(255, 214, 170, 0.18)' : 'rgba(255, 214, 170, 0)',
      }}
      transition={{ duration: 0.28 }}
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-caption focus:text-bone"
      >
        {t.nav.skip}
      </a>

      <div className="shell flex h-[76px] items-center justify-between gap-4">
        <Logo tone="invert" />

        <nav aria-label={t.nav.features} className="hidden items-center gap-6 xl:gap-8 lg:flex flex-shrink-0">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="link-underline text-[0.875rem] xl:text-[0.9375rem] font-medium text-bone/80 hover:text-bone whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:gap-3 lg:flex flex-shrink-0">
          <LanguageToggle tone="invert" />
          <ButtonLink to="/signin" variant="quiet" size="sm" className="!text-clay-tint hover:!text-bone">
            {t.nav.signIn}
          </ButtonLink>
          <ButtonLink to="/signin" variant="primary" size="sm">
            {t.nav.getStarted}
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-bone/25 text-bone lg:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="header-wood border-t border-bone/15 lg:hidden"
          >
            <nav className="shell flex flex-col gap-1 py-6" aria-label={t.nav.features}>
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-bone/15 py-4 font-display text-h3 text-bone"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LanguageToggle tone="invert" />
                <ButtonLink to="/signin" variant="ghost" size="sm" className="!text-bone !border-bone/25 hover:!bg-bone/10" onClick={() => setMenuOpen(false)}>
                  {t.nav.signIn}
                </ButtonLink>
                <ButtonLink to="/signin" variant="primary" size="sm" onClick={() => setMenuOpen(false)}>
                  {t.nav.getStarted}
                </ButtonLink>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
