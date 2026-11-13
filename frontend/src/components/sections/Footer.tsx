import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';
import { Logo } from '../ui/Logo';

export function Footer() {
  const { t, num } = useLang();
  const year = num(new Date().getFullYear());

  return (
    <footer className="bg-ink pb-10 pt-20 text-bone">
      <div className="shell">
        <div className="grid gap-12 border-b border-granite/25 pb-14 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))] lg:gap-10">
          <div>
            <Logo tone="invert" />
            <p className="mt-6 max-w-xs text-caption leading-relaxed text-granite">{t.footer.blurb}</p>
            <div className="mt-7">
              <LanguageToggle tone="invert" />
            </div>
          </div>

          {t.footer.cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="label mb-5 text-clay-tint/70">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to.startsWith('/#') ? (
                      <a href={l.to.replace('/#', '#')} className="text-caption text-granite transition-colors hover:text-bone">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="text-caption text-granite transition-colors hover:text-bone">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-2 lg:gap-16">
          <div className="pl-5" style={{ boxShadow: 'inset 1px 0 0 rgb(var(--c-granite) / 0.4)' }}>
            <p className="label mb-3 text-clay-tint/70">{t.footer.disclaimerTitle}</p>
            <p className="max-w-prose text-caption leading-relaxed text-granite">
              এটি তথ্যগত সহায়তা, আইনি পরামর্শ নয়। গুরুত্বপূর্ণ বিষয়ে যোগ্য আইনজীবীর পরামর্শ নিন।
            </p>
            <p className="mt-3 max-w-prose text-caption leading-relaxed text-granite">
              This is legal information, not legal advice. For anything important, consult a qualified lawyer.
            </p>
          </div>
          <div className="lg:pt-8">
            <p className="max-w-prose text-caption leading-relaxed text-granite/80">{t.footer.project}</p>
            <p className="mt-3 text-caption text-granite/60">{t.footer.rights}</p>
          </div>
        </div>

        <p className="border-t border-granite/25 pt-6 font-mono text-[0.6875rem] tracking-label text-granite/60">
          LEGAL AI · আইনি সহায়ক · {year}
        </p>
      </div>
    </footer>
  );
}
