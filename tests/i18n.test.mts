import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { LANGUAGES, detectLanguage, isLang, ttsTagFor } from '../src/lib/i18n/languages.ts';
import { EN, MESSAGES, translate, translateText, type MessageKey } from '../src/lib/i18n/messages.ts';
import { BOOK_TABLE_SIZES, ENGLISH_BOOKS, bookLabel, findLocalBook, hasBookNames, normalizeName } from '../src/lib/i18n/bookNames.ts';

// ── languages: English, French, Spanish, Portuguese only ──
assert.deepEqual(LANGUAGES.map((l) => l.code), ['en', 'fr', 'es', 'pt']);
assert.deepEqual(LANGUAGES.map((l) => l.native), ['English', 'Français', 'Español', 'Português']);
assert.equal(detectLanguage(['fr-CA', 'en']), 'fr');
assert.equal(detectLanguage(['de-DE', 'es-MX']), 'es', 'first supported language in the phone list');
assert.equal(detectLanguage(['pt-BR']), 'pt');
assert.equal(detectLanguage(['sw']), 'en', 'no longer offered: English');
assert.equal(detectLanguage(['ko-KR']), 'en');
assert.equal(detectLanguage(['ja-JP']), 'en', 'unsupported phone language: English');
assert.equal(detectLanguage([]), 'en');
assert.equal(detectLanguage(undefined), 'en');
assert.ok(isLang('fr') && !isLang('xx') && !isLang('sw') && !isLang(null));
assert.equal(ttsTagFor('pt'), 'pt-BR');

// ── locale files: locales/en.json, fr.json, es.json, pt.json have the same keys, no blanks, the same {slots} ──
const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
const files = Object.fromEntries(['en', 'fr', 'es', 'pt'].map((c) => [c, JSON.parse(readFileSync(new URL(`../locales/${c}.json`, import.meta.url), 'utf8')) as Record<string, string>]));
assert.deepEqual(Object.keys(files.en), Object.keys(files.en).slice().sort(), 'keys are kept sorted');
for (const lang of LANGUAGES.map((l) => l.code)) {
  assert.deepEqual(Object.keys(files[lang]), Object.keys(files.en), `${lang}.json has the same keys as en.json`);
  for (const key of Object.keys(EN) as MessageKey[]) {
    const v = MESSAGES[lang][key];
    assert.ok(typeof v === 'string' && v.trim().length > 0, `${lang} is missing ${key}`);
    assert.equal(slots(v!), slots(EN[key]), `${lang}.${key} has different {slots}`);
    if (lang !== 'en' && key !== 'featDesc.language' && EN[key].length > 25 && /[a-z]{4}/.test(EN[key])) assert.notEqual(v, EN[key], `${lang}.${key} was left in English`);
  }
}
assert.ok(Object.keys(EN).length > 800, 'the whole app is in the locale files');
// the app name, in each language (the Play Store name stays "Prayer Fire")
assert.equal(translate('en', 'app.name'), 'Prayer Fire');
assert.equal(translate('fr', 'app.name'), 'Feu de Prière');
assert.equal(translate('es', 'app.name'), 'Fuego de Oración');
assert.equal(translate('pt', 'app.name'), 'Fogo de Oração');
assert.equal(translate('fr', 'nav.home'), 'Accueil');
assert.equal(translate('en', 'nav.home'), 'Home');
assert.equal(translate('es', 'language.button'), 'Idioma');
// a missing wording falls back to English
const saved = MESSAGES.fr['nav.home'];
delete MESSAGES.fr['nav.home'];
assert.equal(translate('fr', 'nav.home'), EN['nav.home']);
MESSAGES.fr['nav.home'] = saved;
// text built from data is looked up by its English wording; unknown text comes back unchanged
assert.equal(translateText('fr', 'Mercy Prayer'), 'Prière de miséricorde');
assert.equal(translateText('pt', 'Praise & Worship'), 'Louvor e adoração');
assert.equal(translateText('en', 'Mercy Prayer'), 'Mercy Prayer');
assert.equal(translateText('es', 'Some text nobody translated'), 'Some text nobody translated');
// bottom tab labels must stay short so seven fit on a phone
for (const lang of LANGUAGES.map((l) => l.code)) {
  for (const k of ['nav.home', 'nav.write', 'nav.startUp', 'nav.bible', 'nav.scripture', 'nav.partners', 'nav.fasting'] as MessageKey[]) {
    assert.ok(translate(lang, k).length <= 12, `${lang} ${k} too long for the tab bar: ${translate(lang, k)}`);
  }
}
// the Home feature cards: every one has a name and a one-line description in every language
for (const lang of LANGUAGES.map((l) => l.code)) {
  for (const key of Object.keys(EN).filter((k) => k.startsWith('feat.') || k.startsWith('featDesc.'))) assert.ok(MESSAGES[lang][key].length > 1, `${lang}.${key}`);
}
// no screen file may use a key that does not exist
const used = new Set<string>();
const walk = (dir: URL) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) walk(u);
    else if (/\.tsx?$/.test(e.name)) for (const m of readFileSync(u, 'utf8').matchAll(/\bt\('([\w.-]+)'/g)) used.add(m[1]);
  }
};
walk(new URL('../src/', import.meta.url));
for (const k of used) assert.ok(k in EN, `screens use the key ${k} but locales/en.json does not have it`);

// ── book names ──
assert.deepEqual(BOOK_TABLE_SIZES, { fr: 66, es: 66, pt: 66, en: 66 });
for (const lang of ['fr', 'es', 'pt'] as const) assert.equal(new Set(ENGLISH_BOOKS.map((b) => bookLabel(b, lang))).size, 66, `${lang} book names are all different`);
assert.equal(bookLabel('John', 'fr'), 'Jean');
assert.equal(bookLabel('Psalms', 'es'), 'Salmos');
assert.equal(bookLabel('Revelation', 'pt'), 'Apocalipse');
assert.equal(bookLabel('Nonsense', 'fr'), 'Nonsense');
assert.ok(hasBookNames('fr') && hasBookNames('es') && hasBookNames('pt') && !hasBookNames('en'));
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
