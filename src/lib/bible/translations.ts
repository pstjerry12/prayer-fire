export type TranslationId = 'kjv' | 'asv' | 'web' | 'lsg' | 'rv1909' | 'almeida';

export interface BibleTranslation {
  id: TranslationId;
  name: string;
  shortName: string;
  /** App language code of the text (en, fr, es, pt). */
  language: 'en' | 'fr' | 'es' | 'pt';
  /** Credit that must be shown with the text (only some licences ask for one). */
  credit?: string;
}

// Only public-domain (or freely licensed) translations — see docs/BIBLE-TRANSLATIONS.md for where each one comes
// from and its licence. loadTranslation.ts says how each one is fetched. Add new entries here (and a matching
// src/data/bible/<id>.json, then `npm run split-bible`) to extend the picker.
export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  { id: 'kjv', name: 'King James Version', shortName: 'KJV', language: 'en' },
  { id: 'asv', name: 'American Standard Version', shortName: 'ASV', language: 'en' },
  { id: 'web', name: 'World English Bible', shortName: 'WEB', language: 'en' },
  { id: 'lsg', name: 'Louis Segond 1910', shortName: 'LSG', language: 'fr' },
  { id: 'rv1909', name: 'Reina-Valera 1909', shortName: 'RV1909', language: 'es' },
  {
    id: 'almeida',
    name: 'Bíblia Livre (Almeida 1819, revisão 2018)',
    shortName: 'Almeida',
    language: 'pt',
    credit: 'Bíblia Livre (BLIVRE), © 2018 Diego Santos, Mario Sérgio e Marco Teles, licença Creative Commons Atribuição 4.0 Brasil (CC BY 4.0 BR).',
  },
];

/** The Bible to open for an app language: the first translation in that language, else the English default. */
export function translationForLanguage(language: string): TranslationId {
  return BIBLE_TRANSLATIONS.find((t) => t.language === language)?.id ?? DEFAULT_TRANSLATION;
}

/** True when the app has a Bible in this language. */
export function hasBibleIn(language: string): boolean {
  return BIBLE_TRANSLATIONS.some((t) => t.language === language);
}

export const DEFAULT_TRANSLATION: TranslationId = 'kjv';

const STORAGE_KEY = 'upp_bible_translation';
/** Fired on `window` whenever the chosen Bible translation changes. */
export const TRANSLATION_EVENT = 'pfm-bible-translation';

function isTranslationId(value: string | null): value is TranslationId {
  return !!value && BIBLE_TRANSLATIONS.some((t) => t.id === value);
}

/** The user's last-selected translation, shared across the Bible reader and Verse of the Day. */
export function getSelectedTranslation(): TranslationId {
  if (typeof window === 'undefined') return DEFAULT_TRANSLATION;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTranslationId(stored) ? stored : DEFAULT_TRANSLATION;
  } catch {
    return DEFAULT_TRANSLATION;
  }
}

export function setSelectedTranslation(id: TranslationId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    // Tell any Bible screen that is already open (the language switch changes the Bible too).
    window.dispatchEvent(new Event(TRANSLATION_EVENT));
  } catch {
    // ignore quota/availability errors — falls back to DEFAULT_TRANSLATION next load
  }
}

export function getTranslationMeta(id: string): BibleTranslation {
  return BIBLE_TRANSLATIONS.find((t) => t.id === id) ?? BIBLE_TRANSLATIONS[0];
}

/** The word for "chapter" read aloud before a chapter, per Bible language. */
export const CHAPTER_WORD: Record<'en' | 'fr' | 'es' | 'pt', string> = { en: 'chapter', fr: 'chapitre', es: 'capítulo', pt: 'capítulo' };
