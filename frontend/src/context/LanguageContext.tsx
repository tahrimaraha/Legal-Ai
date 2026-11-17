import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { bn, en } from '../i18n';
import type { Lang, Strings } from '../i18n';

interface LanguageValue {
  lang: Lang;
  t: Strings;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Localises digits: Bengali uses Bengali numerals. */
  num: (value: number | string) => string;
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const LANG_KEY = 'legal_ai_lang';

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // English by default; a visitor's own choice is remembered on this device.
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'bn' ? 'bn' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* storage unavailable (private mode): the choice just isn't remembered */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === 'bn' ? 'en' : 'bn')), []);

  const num = useCallback(
    (value: number | string) =>
      lang === 'bn'
        ? String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
        : String(value),
    [lang],
  );

  const value = useMemo<LanguageValue>(
    () => ({ lang, t: lang === 'bn' ? bn : en, setLang, toggle, num }),
    [lang, setLang, toggle, num],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
