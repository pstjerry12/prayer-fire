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
