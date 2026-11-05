'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, LANG_KEY, LANGUAGES, detectLanguage, isLang, type Lang } from '@/lib/i18n/languages';
import { translate, type MessageKey } from '@/lib/i18n/messages';
import { bookLabel as labelFor } from '@/lib/i18n/bookNames';
import { hasBibleIn, setSelectedTranslation, translationForLanguage } from '@/lib/bible/translations';

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Screen text in the chosen language (English where a language has no wording yet). */
  t: (key: MessageKey, vars?: Record<string, string>) => string;
  /** A Bible book name for the screen ("Jean" for John in French). */
  bookLabel: (englishName: string) => string;
};

const Ctx = createContext<I18n>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
  bookLabel: (n) => n,
});

export function useI18n(): I18n {
  return useContext(Ctx);
}

/** Shorthand for components that only need the text function. */
export function useT() {
  return useContext(Ctx).t;
}

/**
 * Holds the app language. The first visit follows the phone's language; after that the person's choice (saved on the
 * phone) wins. Switching language also opens the Bible in that language when the app has one.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let next: Lang = DEFAULT_LANG;
    try {
      const stored = window.localStorage.getItem(LANG_KEY);
      next = isLang(stored) ? stored : detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
    } catch {
      next = detectLanguage([navigator.language]);
    }
    setLangState(next);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
    // The Bible follows the language where the app has a Bible in it; otherwise the current Bible stays.
    if (hasBibleIn(next)) setSelectedTranslation(translationForLanguage(next));
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      bookLabel: (n) => labelFor(n, lang),
    }),
    [lang, setLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { LANGUAGES };
