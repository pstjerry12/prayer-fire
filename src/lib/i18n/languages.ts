/**
 * The languages the app can be shown in: English (the default and the fallback), French, Spanish and Portuguese. No others for now.
 * The text for each lives in locales/<code>.json at the project root.
 */
export type Lang = 'en' | 'fr' | 'es' | 'pt';

export const LANGUAGES: { code: Lang; native: string; english: string; ttsTag: string }[] = [
  { code: 'en', native: 'English', english: 'English', ttsTag: 'en-US' },
  { code: 'fr', native: 'Français', english: 'French', ttsTag: 'fr-FR' },
  { code: 'es', native: 'Español', english: 'Spanish', ttsTag: 'es-ES' },
  { code: 'pt', native: 'Português', english: 'Portuguese', ttsTag: 'pt-BR' },
];

export const LANG_KEY = 'pfm_lang';
export const DEFAULT_LANG: Lang = 'en';

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGUAGES.some((l) => l.code === v);
}

/** Picks the app language from the phone's language list (e.g. ["fr-CA", "en"] gives "fr"). Anything unsupported gives English. */
export function detectLanguage(tags: readonly string[] | undefined | null): Lang {
  for (const raw of tags ?? []) {
    const base = String(raw).toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

export function ttsTagFor(lang: Lang): string {
  return LANGUAGES.find((l) => l.code === lang)?.ttsTag ?? 'en-US';
}
