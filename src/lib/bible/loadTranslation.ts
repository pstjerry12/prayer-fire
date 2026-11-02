import type { TranslationId } from './translations';

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleBookData {
  book: string; // OSIS code
  bookId: number;
  englishName: string;
  testament: 'OT' | 'NT';
  chapters: BibleChapter[];
}

export interface BibleData {
  version: string;
  name: string;
  language: string;
  license: string;
  books: BibleBookData[];
}

/**
 * Bundled, fully-offline Bible data — no runtime API calls of any kind.
 *
 * Each translation lives at src/data/bible/<id>.json and is only pulled into
 * a loaded JS chunk the first time it's actually selected (dynamic import,
 * so unselected translations never ship into the initial page load). Once
 * loaded, it's kept in an in-memory Map for the rest of the session so
 * switching back to a translation you've already viewed is instant.
 *
 * "Offline" here rides on the app's existing service worker (public/sw.js),
 * which already cache-first's every same-origin JS chunk — including
 * whichever of these gets code-split in. There is no separate native-asset
 * step needed: because capacitor.config.ts points server.url at the live
 * Vercel site, the native app's local `webDir` bundle isn't what's served at
 * runtime anyway, so offline-readiness comes from the service worker having
 * cached a translation after its first (online) use, same as every other
 * page/asset in this app.
 */
const cache = new Map<TranslationId, BibleData>();
const inflight = new Map<TranslationId, Promise<BibleData>>();

/**
 * Reading only needs ONE book at a time, so each translation is also split into one small file per book
 * (public/bible-data/v1/<id>/<OSIS>.json, made by `npm run split-bible`; about 5 to 280 KB each instead of the
 * whole 4.9 MB). loadBook / loadChapter are what the screens use. The whole translation (loadTranslation below) is
 * now only needed for searching the whole Bible, and as the fallback if a book file cannot be fetched.
 */
const BOOK_BASE = '/bible-data/v1';
const bookCache = new Map<string, BibleBookData>();
const bookInflight = new Map<string, Promise<BibleBookData | undefined>>();

export function loadBook(id: TranslationId, osis: string): Promise<BibleBookData | undefined> {
  const key = `${id}/${osis}`;
  const hit = bookCache.get(key);
  if (hit) return Promise.resolve(hit);
  // The whole translation is already in memory (after a Bible search): use it.
  const whole = cache.get(id);
  if (whole) return Promise.resolve(whole.books.find((b) => b.book === osis));
  const pending = bookInflight.get(key);
  if (pending) return pending;

  const promise = fetch(`${BOOK_BASE}/${id}/${encodeURIComponent(osis)}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Bible book ${key}: ${res.status}`);
      return res.json() as Promise<BibleBookData>;
    })
    .catch(async () => {
      // Offline, or the file is missing: fall back to the whole translation (which an older copy of the app may
      // already have cached on this phone).
      const data = await loadTranslation(id);
      return data.books.find((b) => b.book === osis);
    })
    .then((book) => {
      if (book) bookCache.set(key, book);
      return book;
    })
    .finally(() => {
      bookInflight.delete(key);
    });
  bookInflight.set(key, promise);
  return promise;
}

export async function loadChapter(id: TranslationId, osis: string, chapter: number): Promise<BibleChapter | undefined> {
  const book = await loadBook(id, osis);
  return book?.chapters.find((c) => c.chapter === chapter);
}

/** Starts fetching a book in the background (for example the one the person was last reading). Never throws. */
export function preloadBook(id: TranslationId, osis: string): void {
  loadBook(id, osis).catch(() => {});
}

async function importTranslation(id: TranslationId): Promise<BibleData> {
  switch (id) {
    case 'kjv':
      return (await import('@/data/bible/kjv.json')).default as BibleData;
    case 'asv':
      return (await import('@/data/bible/asv.json')).default as BibleData;
    case 'web':
      return (await import('@/data/bible/web.json')).default as BibleData;
    default:
      throw new Error(`Unknown Bible translation: ${id}`);
  }
}

export async function loadTranslation(id: TranslationId): Promise<BibleData> {
  const cached = cache.get(id);
  if (cached) return cached;

  const pending = inflight.get(id);
  if (pending) return pending;

  const promise = importTranslation(id)
    .then((data) => {
      cache.set(id, data);
      return data;
    })
    .finally(() => {
      inflight.delete(id);
    });

  inflight.set(id, promise);
  return promise;
}

export function getBook(data: BibleData, osis: string): BibleBookData | undefined {
  return data.books.find((b) => b.book === osis);
}

export function getChapter(data: BibleData, osis: string, chapter: number): BibleChapter | undefined {
  return getBook(data, osis)?.chapters.find((c) => c.chapter === chapter);
}
