import { BIBLE_BOOKS } from '@/app/data/bibleBooks';

/**
 * Where the person last read or listened in the Bible. Unlike the reader's own position (kept for one session only),
 * this is saved on the phone so "Continue where you stopped" on the home screen still works after the app is closed.
 */
const KEY = 'pfm_bible_last';

export interface LastPlace {
  /** Book name, e.g. "John". */
  book: string;
  chapter: number;
  /** The verse being read when they stopped, if known. */
  verse?: number;
}

/** Where listening starts for someone who has not read or listened yet. */
export const FIRST_PLACE: LastPlace = { book: 'John', chapter: 1 };

export function getLastPlace(): LastPlace | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastPlace;
    const book = BIBLE_BOOKS.find((b) => b.name === p.book);
    if (!book || !Number.isInteger(p.chapter) || p.chapter < 1 || p.chapter > book.chapters) return null;
    return { book: p.book, chapter: p.chapter, ...(Number.isInteger(p.verse) && (p.verse as number) > 0 ? { verse: p.verse } : {}) };
  } catch {
    return null;
  }
}

export function saveLastPlace(place: LastPlace): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(place));
  } catch {
    // storage unavailable: "Continue" then simply starts from the beginning
  }
}

/** The reader opened this chapter: remember it, but keep the verse already saved for the same chapter. */
export function touchLastPlace(book: string, chapter: number): void {
  const existing = getLastPlace();
  if (existing && existing.book === book && existing.chapter === chapter) return;
  saveLastPlace({ book, chapter });
}

/** The chapter after this one (rolling into the next book); null after Revelation 22. */
export function nextChapter(place: LastPlace): LastPlace | null {
  const i = BIBLE_BOOKS.findIndex((b) => b.name === place.book);
  if (i < 0) return null;
  if (place.chapter < BIBLE_BOOKS[i].chapters) return { book: place.book, chapter: place.chapter + 1 };
  const next = BIBLE_BOOKS[i + 1];
  return next ? { book: next.name, chapter: 1 } : null;
}

export const placeLabel = (p: LastPlace) => `${p.book} ${p.chapter}`;
