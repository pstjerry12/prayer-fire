// Complete Bible structure — all 66 books with their chapter counts.
// `osis` is the book code used as the key into the bundled per-translation
// JSON files (src/data/bible/*.json — see src/lib/bible/loadTranslation.ts),
// all sourced from the same midvash/bible-data schema so this one table
// works unchanged across every bundled translation.

export interface BibleBook {
  name: string;
  slug: string;
  osis: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

export const BIBLE_BOOKS: BibleBook[] = [
  // ── Old Testament ────────────────────────────────────────────────
  { name: 'Genesis', slug: 'genesis', osis: 'Gen', chapters: 50, testament: 'OT' },
  { name: 'Exodus', slug: 'exodus', osis: 'Exod', chapters: 40, testament: 'OT' },
  { name: 'Leviticus', slug: 'leviticus', osis: 'Lev', chapters: 27, testament: 'OT' },
  { name: 'Numbers', slug: 'numbers', osis: 'Num', chapters: 36, testament: 'OT' },
  { name: 'Deuteronomy', slug: 'deuteronomy', osis: 'Deut', chapters: 34, testament: 'OT' },
  { name: 'Joshua', slug: 'joshua', osis: 'Josh', chapters: 24, testament: 'OT' },
  { name: 'Judges', slug: 'judges', osis: 'Judg', chapters: 21, testament: 'OT' },
  { name: 'Ruth', slug: 'ruth', osis: 'Ruth', chapters: 4, testament: 'OT' },
  { name: '1 Samuel', slug: '1 samuel', osis: '1Sam', chapters: 31, testament: 'OT' },
  { name: '2 Samuel', slug: '2 samuel', osis: '2Sam', chapters: 24, testament: 'OT' },
  { name: '1 Kings', slug: '1 kings', osis: '1Kgs', chapters: 22, testament: 'OT' },
  { name: '2 Kings', slug: '2 kings', osis: '2Kgs', chapters: 25, testament: 'OT' },
  { name: '1 Chronicles', slug: '1 chronicles', osis: '1Chr', chapters: 29, testament: 'OT' },
  { name: '2 Chronicles', slug: '2 chronicles', osis: '2Chr', chapters: 36, testament: 'OT' },
  { name: 'Ezra', slug: 'ezra', osis: 'Ezra', chapters: 10, testament: 'OT' },
  { name: 'Nehemiah', slug: 'nehemiah', osis: 'Neh', chapters: 13, testament: 'OT' },
  { name: 'Esther', slug: 'esther', osis: 'Esth', chapters: 10, testament: 'OT' },
  { name: 'Job', slug: 'job', osis: 'Job', chapters: 42, testament: 'OT' },
  { name: 'Psalms', slug: 'psalms', osis: 'Ps', chapters: 150, testament: 'OT' },
  { name: 'Proverbs', slug: 'proverbs', osis: 'Prov', chapters: 31, testament: 'OT' },
  { name: 'Ecclesiastes', slug: 'ecclesiastes', osis: 'Eccl', chapters: 12, testament: 'OT' },
  { name: 'Song of Solomon', slug: 'song of solomon', osis: 'Song', chapters: 8, testament: 'OT' },
  { name: 'Isaiah', slug: 'isaiah', osis: 'Isa', chapters: 66, testament: 'OT' },
  { name: 'Jeremiah', slug: 'jeremiah', osis: 'Jer', chapters: 52, testament: 'OT' },
  { name: 'Lamentations', slug: 'lamentations', osis: 'Lam', chapters: 5, testament: 'OT' },
  { name: 'Ezekiel', slug: 'ezekiel', osis: 'Ezek', chapters: 48, testament: 'OT' },
  { name: 'Daniel', slug: 'daniel', osis: 'Dan', chapters: 12, testament: 'OT' },
  { name: 'Hosea', slug: 'hosea', osis: 'Hos', chapters: 14, testament: 'OT' },
  { name: 'Joel', slug: 'joel', osis: 'Joel', chapters: 3, testament: 'OT' },
  { name: 'Amos', slug: 'amos', osis: 'Amos', chapters: 9, testament: 'OT' },
  { name: 'Obadiah', slug: 'obadiah', osis: 'Obad', chapters: 1, testament: 'OT' },
  { name: 'Jonah', slug: 'jonah', osis: 'Jonah', chapters: 4, testament: 'OT' },
  { name: 'Micah', slug: 'micah', osis: 'Mic', chapters: 7, testament: 'OT' },
  { name: 'Nahum', slug: 'nahum', osis: 'Nah', chapters: 3, testament: 'OT' },
  { name: 'Habakkuk', slug: 'habakkuk', osis: 'Hab', chapters: 3, testament: 'OT' },
  { name: 'Zephaniah', slug: 'zephaniah', osis: 'Zeph', chapters: 3, testament: 'OT' },
  { name: 'Haggai', slug: 'haggai', osis: 'Hag', chapters: 2, testament: 'OT' },
  { name: 'Zechariah', slug: 'zechariah', osis: 'Zech', chapters: 14, testament: 'OT' },
  { name: 'Malachi', slug: 'malachi', osis: 'Mal', chapters: 4, testament: 'OT' },

  // ── New Testament ────────────────────────────────────────────────
  { name: 'Matthew', slug: 'matthew', osis: 'Matt', chapters: 28, testament: 'NT' },
  { name: 'Mark', slug: 'mark', osis: 'Mark', chapters: 16, testament: 'NT' },
  { name: 'Luke', slug: 'luke', osis: 'Luke', chapters: 24, testament: 'NT' },
  { name: 'John', slug: 'john', osis: 'John', chapters: 21, testament: 'NT' },
  { name: 'Acts', slug: 'acts', osis: 'Acts', chapters: 28, testament: 'NT' },
  { name: 'Romans', slug: 'romans', osis: 'Rom', chapters: 16, testament: 'NT' },
  { name: '1 Corinthians', slug: '1 corinthians', osis: '1Cor', chapters: 16, testament: 'NT' },
  { name: '2 Corinthians', slug: '2 corinthians', osis: '2Cor', chapters: 13, testament: 'NT' },
  { name: 'Galatians', slug: 'galatians', osis: 'Gal', chapters: 6, testament: 'NT' },
  { name: 'Ephesians', slug: 'ephesians', osis: 'Eph', chapters: 6, testament: 'NT' },
  { name: 'Philippians', slug: 'philippians', osis: 'Phil', chapters: 4, testament: 'NT' },
  { name: 'Colossians', slug: 'colossians', osis: 'Col', chapters: 4, testament: 'NT' },
  { name: '1 Thessalonians', slug: '1 thessalonians', osis: '1Thess', chapters: 5, testament: 'NT' },
  { name: '2 Thessalonians', slug: '2 thessalonians', osis: '2Thess', chapters: 3, testament: 'NT' },
  { name: '1 Timothy', slug: '1 timothy', osis: '1Tim', chapters: 6, testament: 'NT' },
  { name: '2 Timothy', slug: '2 timothy', osis: '2Tim', chapters: 4, testament: 'NT' },
  { name: 'Titus', slug: 'titus', osis: 'Titus', chapters: 3, testament: 'NT' },
  { name: 'Philemon', slug: 'philemon', osis: 'Phlm', chapters: 1, testament: 'NT' },
  { name: 'Hebrews', slug: 'hebrews', osis: 'Heb', chapters: 13, testament: 'NT' },
  { name: 'James', slug: 'james', osis: 'Jas', chapters: 5, testament: 'NT' },
  { name: '1 Peter', slug: '1 peter', osis: '1Pet', chapters: 5, testament: 'NT' },
  { name: '2 Peter', slug: '2 peter', osis: '2Pet', chapters: 3, testament: 'NT' },
  { name: '1 John', slug: '1 john', osis: '1John', chapters: 5, testament: 'NT' },
  { name: '2 John', slug: '2 john', osis: '2John', chapters: 1, testament: 'NT' },
  { name: '3 John', slug: '3 john', osis: '3John', chapters: 1, testament: 'NT' },
  { name: 'Jude', slug: 'jude', osis: 'Jude', chapters: 1, testament: 'NT' },
  { name: 'Revelation', slug: 'revelation', osis: 'Rev', chapters: 22, testament: 'NT' },
];
