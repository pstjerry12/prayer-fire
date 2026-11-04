import { getPremiumFlag } from '@/lib/premiumFlag';
import { isTranslationAllowed } from '@/lib/tiers';

export type TranslationId = 'kjv' | 'asv' | 'web';

export interface BibleTranslation {
  id: TranslationId;
  name: string;
  shortName: string;
}

// Only public-domain translations bundled from midvash/bible-data — see
// loadTranslation.ts for how each one is fetched. Add new entries here (and
// a matching src/data/bible/<id>.json) to extend the picker.
export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  { id: 'kjv', name: 'King James Version', shortName: 'KJV' },
  { id: 'asv', name: 'American Standard Version', shortName: 'ASV' },
  { id: 'web', name: 'World English Bible', shortName: 'WEB' },
];

export const DEFAULT_TRANSLATION: TranslationId = 'kjv';

const STORAGE_KEY = 'upp_bible_translation';

function isTranslationId(value: string | null): value is TranslationId {
  return !!value && BIBLE_TRANSLATIONS.some((t) => t.id === value);
}

/** The user's last-selected translation, shared across the Bible reader and Verse of the Day. */
export function getSelectedTranslation(): TranslationId {
  if (typeof window === 'undefined') return DEFAULT_TRANSLATION;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Free reads the King James Version; ASV and WEB are Partner translations (a saved choice is kept for when they join).
    return isTranslationId(stored) && isTranslationAllowed(getPremiumFlag(), stored) ? stored : DEFAULT_TRANSLATION;
  } catch {
    return DEFAULT_TRANSLATION;
  }
}

export function setSelectedTranslation(id: TranslationId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore quota/availability errors — falls back to DEFAULT_TRANSLATION next load
  }
}

export function getTranslationMeta(id: string): BibleTranslation {
  return BIBLE_TRANSLATIONS.find((t) => t.id === id) ?? BIBLE_TRANSLATIONS[0];
}
