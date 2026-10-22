import type { BibleData } from './loadTranslation';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';

export interface SearchHit {
  osis: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/** Words typed, lower-cased; a verse must contain all of them. Punctuation is ignored. */
export function searchWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Finds verses in the loaded translation that contain every word of the query.
 * Stops after `limit` hits; `total` says whether there were more than shown.
 */
export function searchBible(data: BibleData, query: string, limit = 60): { hits: SearchHit[]; more: boolean } {
  const words = searchWords(query);
  if (words.length === 0 || (words.length === 1 && words[0].length < 2)) return { hits: [], more: false };

  const hits: SearchHit[] = [];
  for (const meta of BIBLE_BOOKS) {
    const book = data.books.find((b) => b.book === meta.osis);
    if (!book) continue;
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const lower = verse.text.toLowerCase();
        if (words.every((w) => lower.includes(w))) {
          if (hits.length >= limit) return { hits, more: true };
          hits.push({ osis: meta.osis, book: meta.name, chapter: chapter.chapter, verse: verse.number, text: verse.text });
        }
      }
    }
  }
  return { hits, more: false };
}
