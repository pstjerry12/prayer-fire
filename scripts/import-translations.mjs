// Builds the extra Bible translations used by the language switcher: src/data/bible/<id>.json in the same shape as
// kjv.json (then run `npm run split-bible`). The source files are downloaded by hand first (see docs/BIBLE-TRANSLATIONS.md):
//   lsg    Louis Segond 1910        midvash/bible-data versions/fr/lsg/lsg.json                         (public domain)
//   almeida Bíblia Livre (Almeida)  midvash/bible-data versions/pt/almeida-livre/almeida-livre.json     (CC BY 4.0 BR: credit required)
//   rv1909 Reina-Valera 1909        scrollmapper/bible_databases formats/json/SpaRV.json                (public domain)
// Usage: node scripts/import-translations.mjs <folder holding lsg.json alm.json rv1909.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('Give the folder with the downloaded files'); process.exit(1); }
const kjv = JSON.parse(readFileSync(join(root, 'src/data/bible/kjv.json'), 'utf8'));

function check(id, data) {
  if (data.books.length !== 66) throw new Error(`${id}: ${data.books.length} books`);
  let missing = 0, extra = 0, chapterDiff = 0;
  data.books.forEach((b, i) => {
    const k = kjv.books[i];
    if (b.book !== k.book) throw new Error(`${id}: book ${i} is ${b.book}, expected ${k.book}`);
    if (b.chapters.length !== k.chapters.length) chapterDiff++;
    for (const kc of k.chapters) {
      const c = b.chapters.find((x) => x.chapter === kc.chapter);
      if (!c) { missing += kc.verses.length; continue; }
      const have = new Set(c.verses.map((v) => v.number));
      for (const kv of kc.verses) if (!have.has(kv.number)) missing++;
      const kn = new Set(kc.verses.map((v) => v.number));
      for (const n of have) if (!kn.has(n)) extra++;
    }
  });
  const verses = data.books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0);
  console.log(`${id}: ${data.books.length} books, ${verses} verses, ${chapterDiff} books with a different chapter count, ${missing} KJV verses absent, ${extra} extra`);
}

// Some source files carry SQL-style doubled apostrophes ("qu''il"): make them single.
function tidy(data) {
  for (const b of data.books) {
    for (const c of b.chapters) {
      for (const v of c.verses) v.text = String(v.text).replace(/''/g, "'").replace(/\s+/g, ' ').trim();
      // Some versifications fold a verse into the one before it (the source then holds an empty placeholder): leave it out.
      c.verses = c.verses.filter((v) => v.text.length > 0);
    }
  }
  return data;
}

function write(id, data) {
  tidy(data);
  check(id, data);
  writeFileSync(join(root, 'src/data/bible', `${id}.json`), JSON.stringify(data));
}

// Already in our shape (midvash).
for (const [file, id, name, language, license] of [
  ['lsg.json', 'lsg', 'Louis Segond 1910', 'fr', 'public-domain'],
  ['alm.json', 'almeida', 'Bíblia Livre (Almeida 1819, revisão 2018)', 'pt', 'cc-by'],
]) {
  const d = JSON.parse(readFileSync(join(src, file), 'utf8'));
  write(id, { version: id, name, language, license, books: d.books });
}

// scrollmapper shape: books in the standard order with {name, chapters:[{chapter, verses:[{verse, text}]}]}.
const sp = JSON.parse(readFileSync(join(src, 'rv1909.json'), 'utf8'));
if (sp.books.length !== 66) throw new Error(`rv1909: ${sp.books.length} books`);
write('rv1909', {
  version: 'rv1909',
  name: 'Reina-Valera 1909',
  language: 'es',
  license: 'public-domain',
  books: sp.books.map((b, i) => ({
    book: kjv.books[i].book,
    bookId: kjv.books[i].bookId,
    englishName: kjv.books[i].englishName,
    testament: kjv.books[i].testament,
    chapters: b.chapters.map((c) => ({
      chapter: c.chapter,
      verses: c.verses.map((v) => ({ number: v.verse, text: String(v.text).replace(/\s+/g, ' ').trim() })),
    })),
  })),
});
