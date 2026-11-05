/** The languages the app can be shown in. English is the source language and the fallback for anything not yet translated. */
export type Lang = 'en' | 'fr' | 'es' | 'pt' | 'sw' | 'ko' | 'tl';

export const LANGUAGES: { code: Lang; native: string; english: string; ttsTag: string }[] = [
  { code: 'en', native: 'English', english: 'English', ttsTag: 'en-US' },
  { code: 'fr', native: 'Français', english: 'French', ttsTag: 'fr-FR' },
  { code: 'es', native: 'Español', english: 'Spanish', ttsTag: 'es-ES' },
  { code: 'pt', native: 'Português', english: 'Portuguese', ttsTag: 'pt-BR' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili', ttsTag: 'sw-TZ' },
  { code: 'ko', native: '한국어', english: 'Korean', ttsTag: 'ko-KR' },
  { code: 'tl', native: 'Tagalog', english: 'Tagalog', ttsTag: 'fil-PH' },
];

export const LANG_KEY = 'pfm_lang';
export const DEFAULT_LANG: Lang = 'en';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGUAGES.some((l) => l.code === v);
}

/** Picks the app language from the phone's language list (e.g. ["fr-CA", "en"] gives "fr"; "fil" gives "tl"). */
export function detectLanguage(tags: readonly string[] | undefined | null): Lang {
  for (const raw of tags ?? []) {
    const base = String(raw).toLowerCase().split(/[-_]/)[0];
    const code = base === 'fil' ? 'tl' : base;
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}

export function ttsTagFor(lang: Lang): string {
  return LANGUAGES.find((l) => l.code === lang)?.ttsTag ?? 'en-US';
}
