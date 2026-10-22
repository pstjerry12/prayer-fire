import { BIBLE_BOOKS, type BibleBook } from '@/app/data/bibleBooks';

/** A place in the Bible typed by a person, e.g. "John 3:16", "1 cor 13", "Ps 23". */
export interface ParsedReference {
  book: BibleBook;
  chapter: number | null;
  verse: number | null;
  /** Last verse of a range like "John 3:16-18" (null for a single verse). */
  verseEnd: number | null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Common short forms people type, on top of the full names and the OSIS codes.
const EXTRA_ALIASES: Record<string, string> = {
  ex: 'Exodus', exo: 'Exodus', lv: 'Leviticus', nm: 'Numbers', nu: 'Numbers', dt: 'Deuteronomy', deu: 'Deuteronomy',
  jos: 'Joshua', jdg: 'Judges', rth: 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel', '1ki': '1 Kings', '2ki': '2 Kings',
  '1ch': '1 Chronicles', '2ch': '2 Chronicles', ezr: 'Ezra', est: 'Esther', psa: 'Psalms', psalm: 'Psalms', pss: 'Psalms',
  pr: 'Proverbs', pro: 'Proverbs', ecc: 'Ecclesiastes', sos: 'Song of Solomon', songofsongs: 'Song of Solomon',
  sng: 'Song of Solomon', isa: 'Isaiah', jr: 'Jeremiah', eze: 'Ezekiel', dn: 'Daniel', hs: 'Hosea', jl: 'Joel', am: 'Amos',
  ob: 'Obadiah', jon: 'Jonah', mi: 'Micah', na: 'Nahum', hb: 'Habakkuk', zep: 'Zephaniah', hg: 'Haggai', zec: 'Zechariah',
  ml: 'Malachi', mt: 'Matthew', mat: 'Matthew', mk: 'Mark', mrk: 'Mark', lk: 'Luke', luk: 'Luke', jn: 'John', joh: 'John',
  ac: 'Acts', ro: 'Romans', rm: 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians', ga: 'Galatians', ep: 'Ephesians',
  php: 'Philippians', pp: 'Philippians', cl: 'Colossians', '1th': '1 Thessalonians', '2th': '2 Thessalonians',
  '1ti': '1 Timothy', '2ti': '2 Timothy', tit: 'Titus', phm: 'Philemon', philem: 'Philemon', he: 'Hebrews',
  jm: 'James', jam: 'James', '1pe': '1 Peter', '2pe': '2 Peter', '1jn': '1 John', '2jn': '2 John', '3jn': '3 John',
  '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', jud: 'Jude', re: 'Revelation', rv: 'Revelation', revelations: 'Revelation',
};

let aliasMap: Map<string, BibleBook> | null = null;

function aliases(): Map<string, BibleBook> {
  if (aliasMap) return aliasMap;
  const map = new Map<string, BibleBook>();
  for (const b of BIBLE_BOOKS) {
    map.set(norm(b.name), b);
    map.set(norm(b.osis), b);
    map.set(norm(b.slug), b);
  }
  for (const [alias, name] of Object.entries(EXTRA_ALIASES)) {
    const book = BIBLE_BOOKS.find((b) => b.name === name);
    if (book && !map.has(alias)) map.set(alias, book);
  }
  aliasMap = map;
  return map;
}

/** Finds a book from what was typed: exact name/abbreviation, or a prefix that points to only one book. */
export function findBook(typed: string): BibleBook | null {
  const key = norm(typed);
  if (!key) return null;
  const exact = aliases().get(key);
  if (exact) return exact;
  if (key.length < 3) return null;
  const matches = BIBLE_BOOKS.filter((b) => norm(b.name).startsWith(key));
  return matches.length === 1 ? matches[0] : null;
}

/**
 * "John 3:16", "jn 3 16", "1 cor 13:4-7", "Psalm 23", "revelation" → a place in the Bible.
 * Returns null when the text isn't a Bible reference (so it can be treated as a word search).
 */
export function parseReferenceInput(input: string): ParsedReference | null {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  // book (may start with 1/2/3 and contain spaces) + optional chapter + optional verse
  const m = text.match(/^((?:[123]\s*)?[a-zA-Z][a-zA-Z .]*?)\s*(?:(\d{1,3})(?:\s*[:. ]\s*(\d{1,3}))?(?:\s*[-–]\s*(\d{1,3}))?)?$/);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  let chapter = m[2] ? parseInt(m[2], 10) : null;
  const verse = m[3] ? parseInt(m[3], 10) : null;
  const verseEnd = m[4] ? parseInt(m[4], 10) : null;
  if (chapter !== null) chapter = Math.min(Math.max(chapter, 1), book.chapters);
  return { book, chapter, verse, verseEnd: verse !== null && verseEnd !== null && verseEnd > verse ? verseEnd : null };
}
