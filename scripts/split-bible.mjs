// Splits each bundled Bible translation (src/data/bible/<id>.json, about 4.9 MB each) into one small file per book
// (public/bible-data/v1/<id>/<OSIS>.json, about 5 to 200 KB each), so the app only downloads the book being read.
// Run `npm run split-bible` after changing a translation, and bump the "v1" folder name (and BOOK_BASE in
// src/lib/bible/loadTranslation.ts) so phones fetch the new files instead of an older cached copy.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'bible-data', 'v1');
rmSync(out, { recursive: true, force: true });
let files = 0;
for (const id of ['kjv', 'asv', 'web', 'lsg', 'rv1909', 'almeida']) {
  const data = JSON.parse(readFileSync(join(root, 'src', 'data', 'bible', `${id}.json`), 'utf8'));
  mkdirSync(join(out, id), { recursive: true });
  for (const book of data.books) {
    writeFileSync(join(out, id, `${book.book}.json`), JSON.stringify(book));
    files++;
  }
}
console.log(`Wrote ${files} book files to public/bible-data/v1`);
