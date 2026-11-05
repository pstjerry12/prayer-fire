import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGUAGES, detectLanguage, isLang, ttsTagFor } from '../src/lib/i18n/languages.ts';
import { EN, MESSAGES, translate, type MessageKey } from '../src/lib/i18n/messages.ts';
import { BOOK_TABLE_SIZES, ENGLISH_BOOKS, bookLabel, findLocalBook, hasBookNames, normalizeName } from '../src/lib/i18n/bookNames.ts';

// ── languages ──
assert.deepEqual(LANGUAGES.map((l) => l.code), ['en', 'fr', 'es', 'pt', 'sw', 'ko', 'tl']);
assert.equal(detectLanguage(['fr-CA', 'en']), 'fr');
assert.equal(detectLanguage(['de-DE', 'es-MX']), 'es');
assert.equal(detectLanguage(['pt-BR']), 'pt');
assert.equal(detectLanguage(['fil-PH']), 'tl');
assert.equal(detectLanguage(['sw']), 'sw');
assert.equal(detectLanguage(['ko-KR']), 'ko');
assert.equal(detectLanguage(['ja-JP']), 'en', 'unsupported phone language: English');
assert.equal(detectLanguage([]), 'en');
assert.equal(detectLanguage(undefined), 'en');
assert.ok(isLang('fr') && !isLang('xx') && !isLang(null));
assert.equal(ttsTagFor('pt'), 'pt-BR');

// ── messages: every language has every key, no blanks, and keeps the {slots} of the English text ──
const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
for (const lang of LANGUAGES.map((l) => l.code)) {
  for (const key of Object.keys(EN) as MessageKey[]) {
    const v = MESSAGES[lang][key];
    assert.ok(typeof v === 'string' && v.trim().length > 0, `${lang} is missing ${key}`);
    assert.equal(slots(v!), slots(EN[key]), `${lang}.${key} has different {slots}`);
  }
  const extra = Object.keys(MESSAGES[lang]).filter((k) => !(k in EN));
  assert.deepEqual(extra, [], `${lang} has keys that English does not`);
}
assert.equal(translate('fr', 'nav.home'), 'Accueil');
assert.equal(translate('en', 'nav.home'), 'Home');
assert.equal(translate('ko', 'bible.fallbackNote', { language: '한국어' }), '앱에 아직 한국어 성경이 없어서 성경은 영어로 표시됩니다.');
// a missing wording falls back to English
const saved = MESSAGES.sw['home.badge'];
delete MESSAGES.sw['home.badge'];
assert.equal(translate('sw', 'home.badge'), EN['home.badge']);
MESSAGES.sw['home.badge'] = saved;
// bottom tab labels must stay short so seven fit on a phone
for (const lang of LANGUAGES.map((l) => l.code)) {
  for (const k of ['nav.home', 'nav.write', 'nav.startUp', 'nav.bible', 'nav.scripture', 'nav.partners', 'nav.fasting'] as MessageKey[]) {
    assert.ok(translate(lang, k).length <= 12, `${lang} ${k} too long for the tab bar: ${translate(lang, k)}`);
  }
}

// ── book names ──
assert.deepEqual(BOOK_TABLE_SIZES, { fr: 66, es: 66, pt: 66, en: 66 });
for (const lang of ['fr', 'es', 'pt'] as const) assert.equal(new Set(ENGLISH_BOOKS.map((b) => bookLabel(b, lang))).size, 66, `${lang} book names are all different`);
assert.equal(bookLabel('John', 'fr'), 'Jean');
assert.equal(bookLabel('Psalms', 'es'), 'Salmos');
assert.equal(bookLabel('Revelation', 'pt'), 'Apocalipse');
assert.equal(bookLabel('John', 'sw'), 'John', 'no name table: English');
assert.equal(bookLabel('Nonsense', 'fr'), 'Nonsense');
assert.ok(hasBookNames('fr') && !hasBookNames('ko'));
// the names match the Bible files' own book order
const kjv = JSON.parse(readFileSync(new URL('../src/data/bible/kjv.json', import.meta.url), 'utf8'));
assert.deepEqual(kjv.books.map((b: { englishName: string }) => b.englishName).map((n: string) => (n === 'Psalm' ? 'Psalms' : n)), [...ENGLISH_BOOKS], 'book order matches the bundled Bible');

// typing local names
assert.equal(normalizeName('Éxodo'), 'exodo');
assert.equal(findLocalBook('Genèse'), 'Genesis');
assert.equal(findLocalBook('genese'), 'Genesis');
assert.equal(findLocalBook('1 Reyes'), '1 Kings');
assert.equal(findLocalBook('Joao'), 'John');
assert.equal(findLocalBook('Jean'), 'John');
assert.equal(findLocalBook('Mateo'), 'Matthew');
assert.equal(findLocalBook('Apoc'), 'Revelation', 'unique start of a name');
assert.equal(findLocalBook('xyz'), null);
assert.equal(findLocalBook('ab'), null);

// ── the Bibles: all 66 books and the same verse numbers as the KJV ──
// Reina-Valera folds 18 verses into the verse before (different versification), so those numbers are absent.
for (const [id, language, expected] of [['lsg', 'fr', 31102], ['rv1909', 'es', 31084], ['almeida', 'pt', 31102]] as const) {
  const d = JSON.parse(readFileSync(new URL(`../src/data/bible/${id}.json`, import.meta.url), 'utf8'));
  assert.equal(d.language, language);
  assert.equal(d.books.length, 66);
  let verses = 0;
  d.books.forEach((b: { book: string; chapters: { chapter: number; verses: { number: number; text: string }[] }[] }, i: number) => {
    assert.equal(b.book, kjv.books[i].book, `${id} book ${i}`);
    assert.equal(b.chapters.length, kjv.books[i].chapters.length, `${id} ${b.book} chapters`);
    for (const c of b.chapters) for (const v of c.verses) {
      verses++;
      assert.ok(v.text.length > 0, `${id} ${b.book} ${c.chapter}:${v.number} is empty`);
      assert.ok(!v.text.includes("''"), `${id} ${b.book} ${c.chapter}:${v.number} has doubled apostrophes`);
    }
  });
  assert.equal(verses, expected, `${id} verse count`);
}
const lsg = JSON.parse(readFileSync(new URL('../src/data/bible/lsg.json', import.meta.url), 'utf8'));
assert.match(lsg.books[42].chapters[2].verses[15].text, /^Car Dieu a tant aimé le monde/);

console.log('i18n + Bibles: all checks passed');
