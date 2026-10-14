// Builds src/app/data/bibleVersesExtra.ts: extra "Prayer Verses" so every
// category has 50 verses. Only the *references* are chosen here; the wording is
// copied word for word from the KJV that is already bundled in the app
// (src/data/bible/kjv.json), so nothing is retyped by hand.
//
// Run:  node scripts/generate-prayer-verses.mjs
//
// The hand-written verses in src/app/data/bibleVerses.ts stay as they are and
// come first in each category; this file tops each category up to TARGET.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 50;

// More candidates than needed, in priority order: duplicates (of the existing
// verses, or of an earlier category) are skipped automatically.
const REFS = {
  faith: [
    'Romans 1:17', 'Romans 4:20-21', 'Romans 5:1', 'Romans 10:9-10', 'Romans 12:3', 'Romans 8:24-25',
    '2 Corinthians 5:7', '2 Corinthians 4:18', 'Galatians 2:20', 'Galatians 3:26', 'Ephesians 2:8-9',
    'Ephesians 6:16', '1 John 5:4', 'Matthew 9:29', 'Matthew 17:20', 'Matthew 21:21-22', 'Matthew 8:10',
    'Matthew 15:28', 'Matthew 6:30', 'Mark 9:23', 'Mark 5:36', 'Mark 10:52', 'Mark 11:22-23',
    'Luke 17:5-6', 'Luke 1:37', 'Luke 1:45', 'Luke 7:50', 'John 20:29', 'John 3:16', 'John 11:25-26',
    'Hebrews 10:23', 'Hebrews 10:38', 'Hebrews 12:2', 'Hebrews 11:8', 'Hebrews 11:7',
    'James 2:17', 'James 2:26', 'James 1:6', '1 Peter 1:7', '1 Peter 1:8-9', '2 Timothy 1:12',
    '2 Timothy 4:7', '1 Timothy 6:12', 'Habakkuk 2:4', 'Genesis 15:6', 'Psalm 56:3', 'Psalm 37:5',
    'Psalm 27:13', '2 Chronicles 20:20', 'Acts 3:16', 'Colossians 2:6-7', '1 Corinthians 2:5',
    'Romans 15:13', 'Philippians 1:6', 'Isaiah 43:2', 'Jeremiah 29:11', 'Proverbs 3:5',
  ],
  protection: [
    'Psalm 91:2', 'Psalm 91:3-4', 'Psalm 91:5-6', 'Psalm 91:7', 'Psalm 91:9-10', 'Psalm 91:14-16',
    'Psalm 121:1-2', 'Psalm 121:3', 'Psalm 27:1', 'Psalm 27:5', 'Psalm 23:4', 'Psalm 34:7', 'Psalm 34:19',
    'Psalm 18:2', 'Psalm 18:30', 'Psalm 32:7', 'Psalm 61:3', 'Psalm 62:6-7', 'Psalm 3:3', 'Psalm 4:8',
    'Psalm 5:11', 'Psalm 9:9', 'Psalm 57:1', 'Psalm 62:2', 'Psalm 125:2', 'Psalm 138:7', 'Psalm 144:2',
    'Psalm 20:1', 'Proverbs 1:33', 'Proverbs 3:25-26', 'Proverbs 29:25', 'Isaiah 54:17', 'Isaiah 59:19',
    'Isaiah 12:2', 'Nahum 1:7', 'Deuteronomy 31:6', 'Deuteronomy 33:27', 'Deuteronomy 20:4',
    'Exodus 14:14', '2 Samuel 22:3', '2 Kings 6:16', 'Zechariah 2:5', 'Luke 10:19', 'Romans 8:31',
    'Romans 8:38-39', 'Ephesians 6:11', 'John 10:28', 'John 17:15', '2 Timothy 4:18', '1 John 4:4',
    '1 Peter 5:7', 'Matthew 28:20', 'Psalm 46:2', 'Psalm 37:39-40', 'Psalm 40:11', 'Psalm 118:6',
  ],
  healing: [
    'Psalm 147:3', 'Psalm 107:20', 'Psalm 30:2', 'Psalm 41:3', 'Psalm 6:2', 'Exodus 23:25',
    'Deuteronomy 7:15', 'Deuteronomy 32:39', '2 Kings 20:5', 'Jeremiah 30:17', 'Jeremiah 33:6',
    'Malachi 4:2', 'Isaiah 58:8', 'Isaiah 57:18-19', 'Isaiah 33:24', 'Proverbs 4:20-22', 'Proverbs 3:7-8',
    'Proverbs 16:24', 'Proverbs 17:22', 'Proverbs 12:18', 'Matthew 8:17', 'Matthew 9:22', 'Matthew 4:23',
    'Matthew 10:1', 'Matthew 8:3', 'Matthew 8:8', 'Mark 5:34', 'Mark 16:17-18', 'Luke 6:19', 'Luke 9:11',
    'Luke 8:48', 'Luke 4:18', 'Acts 10:38', 'Acts 5:16', '1 Peter 2:24', '3 John 1:2', 'Romans 8:11',
    'Hebrews 13:8', 'Job 5:18', '2 Corinthians 12:9', 'Revelation 21:4', 'Psalm 118:17', 'Psalm 103:3-5',
    '2 Chronicles 7:14', 'Isaiah 61:1', 'Hosea 6:1', 'Psalm 91:10', 'Psalm 34:17', 'Psalm 116:8',
    'Isaiah 38:16', 'Psalm 146:8', 'Psalm 142:3', 'Mark 10:52', 'Matthew 15:30', 'Acts 3:6', 'Isaiah 53:4',
  ],
  strength: [
    'Exodus 15:2', 'Joshua 1:9', 'Nehemiah 8:10', '1 Chronicles 16:11', '1 Chronicles 29:12',
    '2 Chronicles 16:9', 'Psalm 18:32', 'Psalm 18:1', 'Psalm 27:14', 'Psalm 29:11', 'Psalm 31:24',
    'Psalm 68:35', 'Psalm 73:26', 'Psalm 119:28', 'Psalm 138:3', 'Psalm 84:5-7', 'Isaiah 40:29',
    'Isaiah 41:13', 'Isaiah 30:15', 'Habakkuk 3:19', 'Zechariah 4:6', 'Ephesians 3:16', 'Ephesians 6:10',
    '2 Corinthians 12:9-10', '2 Corinthians 4:16', 'Colossians 1:11', '2 Timothy 1:7', '2 Timothy 4:17',
    'Galatians 6:9', 'Hebrews 12:1', 'Romans 8:37', '1 Corinthians 15:58', '1 Corinthians 16:13',
    '1 Corinthians 10:13', '2 Samuel 22:33', '2 Samuel 22:40', 'Job 17:9', 'Proverbs 24:10',
    'Proverbs 24:16', 'Micah 7:8', 'John 15:5', 'Matthew 11:28-30', 'Deuteronomy 33:25',
    'Deuteronomy 31:8', 'Psalm 46:1', 'Psalm 59:16', 'Psalm 119:116', 'Isaiah 40:28', 'Psalm 37:24',
    'Psalm 55:22', 'Psalm 62:7', 'Nahum 1:7', 'Isaiah 50:7',
  ],
  peace: [
    'Numbers 6:24-26', 'Psalm 4:8', 'Psalm 29:11', 'Psalm 34:14', 'Psalm 37:11', 'Psalm 37:37',
    'Psalm 85:8', 'Psalm 119:165', 'Psalm 122:6-7', 'Psalm 55:22', 'Psalm 23:2-3', 'Psalm 94:19',
    'Psalm 62:1', 'Psalm 46:10', 'Psalm 131:2', 'Proverbs 3:2', 'Proverbs 3:17', 'Proverbs 12:20',
    'Proverbs 16:7', 'Isaiah 9:6', 'Isaiah 32:17-18', 'Isaiah 48:18', 'Isaiah 54:10', 'Isaiah 54:13',
    'Isaiah 55:12', 'Isaiah 57:19', 'Isaiah 66:12', 'Jeremiah 29:7', 'Micah 5:5', 'Haggai 2:9',
    'Luke 1:79', 'Luke 2:14', 'Luke 24:36', 'John 14:1', 'Romans 5:1', 'Romans 8:6', 'Romans 12:18',
    'Romans 14:19', 'Romans 15:13', '1 Corinthians 14:33', '2 Corinthians 13:11', 'Galatians 5:22-23',
    'Ephesians 2:14', 'Ephesians 4:3', 'Colossians 3:15', '2 Thessalonians 3:16', 'Hebrews 12:14',
    '1 Peter 3:11', 'Matthew 5:9', 'Matthew 11:28', 'Mark 4:39', 'Job 22:21', 'Judges 6:23',
    'James 3:17-18', '1 Peter 5:14', 'Isaiah 26:12', 'Psalm 72:7', 'Psalm 125:5',
  ],
  provision: [
    'Genesis 22:14', 'Genesis 26:12', 'Deuteronomy 8:18', 'Deuteronomy 28:12', 'Deuteronomy 2:7',
    '1 Kings 17:14', 'Psalm 23:5', 'Psalm 34:10', 'Psalm 37:3-4', 'Psalm 37:25', 'Psalm 84:11',
    'Psalm 81:10', 'Psalm 107:9', 'Psalm 111:5', 'Psalm 145:15-16', 'Psalm 132:15', 'Psalm 65:11',
    'Proverbs 3:9-10', 'Proverbs 10:22', 'Proverbs 11:24-25', 'Proverbs 13:22', 'Proverbs 22:9',
    'Proverbs 10:4', 'Proverbs 21:5', 'Isaiah 1:19', 'Isaiah 58:11', 'Isaiah 65:24', 'Joel 2:26',
    'Haggai 2:8', 'Malachi 3:11', 'Matthew 6:26', 'Matthew 6:31-32', 'Matthew 7:11', 'Luke 6:38',
    'Luke 12:24', 'Luke 12:32', 'John 10:10', '2 Corinthians 9:6', '2 Corinthians 9:8',
    '2 Corinthians 9:10-11', '2 Corinthians 8:9', '1 Timothy 6:17', 'Hebrews 13:5', 'Romans 8:32',
    'Ephesians 3:20', 'Jeremiah 29:11', 'Deuteronomy 8:3', 'Genesis 12:2', 'Psalm 104:14',
    'Psalm 36:8', 'Psalm 68:19', 'Proverbs 28:27', 'Ecclesiastes 5:19', '1 Chronicles 29:12',
    'Isaiah 55:10-11', 'Matthew 6:25', 'Proverbs 19:17', 'Philippians 4:12-13',
  ],
  wisdom: [
    'Proverbs 1:7', 'Proverbs 2:2-5', 'Proverbs 3:13-14', 'Proverbs 3:7', 'Proverbs 4:5-7', 'Proverbs 4:23',
    'Proverbs 8:11', 'Proverbs 8:17', 'Proverbs 9:10', 'Proverbs 11:2', 'Proverbs 11:14', 'Proverbs 12:15',
    'Proverbs 13:20', 'Proverbs 15:22', 'Proverbs 15:33', 'Proverbs 16:3', 'Proverbs 16:9', 'Proverbs 16:16',
    'Proverbs 18:15', 'Proverbs 19:20-21', 'Proverbs 24:3-4', 'Proverbs 27:17', 'Psalm 19:7',
    'Psalm 25:4-5', 'Psalm 32:8', 'Psalm 111:10', 'Psalm 119:11', 'Psalm 119:130', 'Psalm 90:12',
    'Daniel 2:20-21', 'Daniel 12:3', 'James 3:17', 'Colossians 2:3', 'Colossians 3:16', 'Colossians 1:9-10',
    'Ephesians 1:17', 'Ephesians 5:15-16', '1 Corinthians 1:30', 'Job 28:28', 'Isaiah 11:2',
    'Isaiah 30:21', 'Isaiah 33:6', 'Luke 2:52', 'Matthew 7:24', 'Romans 11:33', 'Romans 12:2',
    '2 Timothy 3:16-17', '2 Timothy 2:15', '1 Kings 3:9', 'Proverbs 3:21-22', 'Proverbs 14:15',
    'Proverbs 19:8', 'Proverbs 20:5', 'Ecclesiastes 7:12', 'Psalm 37:30', 'Proverbs 10:14',
  ],
  prayer: [
    'Psalm 5:3', 'Psalm 17:6', 'Psalm 34:15', 'Psalm 34:17', 'Psalm 55:17', 'Psalm 66:18-19',
    'Psalm 86:5-7', 'Psalm 102:17', 'Psalm 116:1-2', 'Psalm 141:2', 'Psalm 145:18', 'Psalm 50:15',
    'Psalm 62:8', 'Psalm 4:3', 'Psalm 40:1', '2 Chronicles 7:14', '1 Chronicles 4:10', 'Isaiah 58:9',
    'Isaiah 59:1', 'Isaiah 56:7', 'Isaiah 55:6', 'Jeremiah 29:12-13', 'Matthew 6:6', 'Matthew 6:9-13',
    'Matthew 21:22', 'Matthew 26:41', 'Mark 1:35', 'Mark 11:25', 'Luke 11:9-10', 'Luke 18:1', 'Luke 11:13',
    'Luke 5:16', 'Luke 6:12', 'John 14:13-14', 'John 15:7', 'John 15:16', 'John 16:24', 'Acts 1:14',
    'Acts 2:42', 'Acts 4:31', 'Acts 12:5', 'Romans 8:26', 'Romans 12:12', 'Ephesians 6:18',
    'Colossians 4:2', '1 Timothy 2:1', '1 Timothy 2:8', 'Hebrews 4:16', 'James 5:16', 'James 4:8',
    '1 Peter 3:12', '1 Peter 4:7', '1 John 3:22', '1 John 5:15', 'Jude 1:20', 'Zechariah 12:10',
    'Lamentations 3:25', 'Psalm 18:6', 'Psalm 91:15',
  ],
  family: [
    'Genesis 2:24', 'Genesis 18:19', 'Exodus 20:12', 'Deuteronomy 6:6-7', 'Deuteronomy 5:16',
    'Deuteronomy 11:19', 'Ruth 1:16', '1 Samuel 1:27', 'Psalm 68:6', 'Psalm 78:4', 'Psalm 103:13',
    'Psalm 103:17', 'Psalm 112:1-2', 'Psalm 127:1', 'Psalm 127:4-5', 'Psalm 128:1-3', 'Psalm 133:1',
    'Psalm 145:4', 'Proverbs 14:1', 'Proverbs 14:26', 'Proverbs 15:20', 'Proverbs 17:6', 'Proverbs 17:17',
    'Proverbs 18:22', 'Proverbs 19:14', 'Proverbs 20:7', 'Proverbs 23:24-25', 'Proverbs 29:17',
    'Proverbs 31:10', 'Proverbs 31:25-28', 'Ecclesiastes 4:9-10', 'Ecclesiastes 4:12', 'Malachi 4:6',
    'Isaiah 59:21', 'Matthew 19:5-6', 'Matthew 19:14', 'Mark 10:14', 'Acts 2:39', 'Ephesians 5:25',
    'Ephesians 5:33', 'Ephesians 6:1-3', 'Ephesians 6:4', 'Colossians 3:18-21', '1 Timothy 5:8',
    '1 Timothy 3:4-5', '1 Peter 3:7', '2 Timothy 1:5', '3 John 1:4', 'Hebrews 13:4', 'Genesis 1:28',
    '2 Timothy 3:15', 'Proverbs 1:8-9', 'Job 1:5', 'Luke 2:51-52', 'Psalm 144:12', 'Joel 2:28',
    'Proverbs 13:24', 'Genesis 28:15',
  ],
  thanksgiving: [
    'Psalm 9:1', 'Psalm 30:12', 'Psalm 34:1', 'Psalm 35:18', 'Psalm 50:14', 'Psalm 69:30', 'Psalm 75:1',
    'Psalm 92:1-2', 'Psalm 95:2', 'Psalm 100:1-3', 'Psalm 103:1-2', 'Psalm 105:1', 'Psalm 106:1',
    'Psalm 107:8', 'Psalm 116:12-13', 'Psalm 118:1', 'Psalm 118:24', 'Psalm 119:62', 'Psalm 136:1',
    'Psalm 138:1', 'Psalm 139:14', 'Psalm 145:1-2', 'Psalm 147:7', 'Psalm 150:6', 'Psalm 79:13',
    'Psalm 86:12', 'Psalm 111:1', 'Psalm 126:3', '1 Chronicles 16:8', '1 Chronicles 16:34',
    '1 Chronicles 29:13', '2 Chronicles 20:21', 'Ezra 3:11', 'Jonah 2:9', 'Lamentations 3:22-23',
    'Luke 17:16', '2 Corinthians 9:15', '2 Corinthians 2:14', '1 Corinthians 15:57', 'Ephesians 5:20',
    'Ephesians 1:16', 'Philippians 1:3', 'Colossians 2:7', 'Hebrews 13:15', '1 Timothy 4:4-5',
    'Revelation 7:12', 'Revelation 11:17', 'Habakkuk 3:18', 'Hebrews 12:28', 'James 1:17',
    '1 Thessalonians 1:2', '2 Thessalonians 1:3', '1 Timothy 1:12', 'Psalm 57:9', 'Psalm 147:1',
    'Psalm 148:1', 'Psalm 33:1', 'Psalm 66:1-2',
  ],
};

// ---- read the bundled KJV ---------------------------------------------------
const kjv = JSON.parse(fs.readFileSync(path.join(root, 'src/data/bible/kjv.json'), 'utf8'));
const books = new Map(kjv.books.map((b) => [b.englishName, b]));

function lookup(ref) {
  const m = /^(.*?)\s+(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) throw new Error(`Cannot parse reference: "${ref}"`);
  const name = m[1] === 'Psalm' ? 'Psalms' : m[1];
  const book = books.get(name);
  if (!book) throw new Error(`Unknown book in "${ref}"`);
  const chapter = book.chapters.find((c) => c.chapter === Number(m[2]));
  if (!chapter) throw new Error(`No such chapter: "${ref}"`);
  const from = Number(m[3]);
  const to = m[4] ? Number(m[4]) : from;
  const verses = chapter.verses.filter((v) => v.number >= from && v.number <= to);
  if (verses.length !== to - from + 1) throw new Error(`Missing verse(s): "${ref}"`);
  return verses.map((v) => v.text.trim()).join(' ');
}

// ---- what is already in the hand-written file -------------------------------
const baseSrc = fs.readFileSync(path.join(root, 'src/app/data/bibleVerses.ts'), 'utf8');
const baseStart = baseSrc.indexOf('const BASE_PRAYER_VERSES') >= 0
  ? baseSrc.indexOf('const BASE_PRAYER_VERSES')
  : baseSrc.indexOf('export const KJV_BIBLE_VERSES');
const baseEnd = baseSrc.indexOf('export interface ScriptureCard');
const baseSeg = baseSrc.slice(baseStart, baseEnd);
const existing = {};
const seen = new Set();
for (const m of baseSeg.matchAll(/category: '(\w+)',\s*reference: '([^']+)'/g)) {
  (existing[m[1]] ||= []).push(m[2]);
  seen.add(m[2]);
}

// ---- build ------------------------------------------------------------------
const out = [];
const problems = [];
for (const [cat, refs] of Object.entries(REFS)) {
  const have = existing[cat]?.length ?? 0;
  const need = TARGET - have;
  let added = 0;
  for (const ref of refs) {
    if (added >= need) break;
    if (ref.includes('...')) continue; // placeholder, ignore
    if (seen.has(ref)) continue;
    const text = lookup(ref); // throws on a bad reference
    seen.add(ref);
    added += 1;
    out.push({ id: `${cat}-${have + added}`, category: cat, reference: ref, text });
  }
  if (added < need) problems.push(`${cat}: only ${have + added} of ${TARGET}`);
}
if (problems.length) {
  console.error('Not enough unique references:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const body = out
  .map(
    (v) =>
      `  { id: ${JSON.stringify(v.id)}, category: ${JSON.stringify(v.category)}, reference: ${JSON.stringify(v.reference)}, text: ${JSON.stringify(v.text)} },`
  )
  .join('\n');

fs.writeFileSync(
  path.join(root, 'src/app/data/bibleVersesExtra.ts'),
  `// GENERATED by scripts/generate-prayer-verses.mjs — do not edit by hand.
// Extra Prayer Verses (KJV, copied word for word from src/data/bible/kjv.json)
// that top every category up to ${TARGET} together with the verses in bibleVerses.ts.
import type { BibleVerse } from './bibleVerses';

export const EXTRA_PRAYER_VERSES: BibleVerse[] = [
${body}
];
`
);
console.log(`Wrote ${out.length} verses to src/app/data/bibleVersesExtra.ts`);
