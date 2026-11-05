import type { Lang } from './languages';

/**
 * Names of the 66 books in French, Spanish and Portuguese, in Bible order, to match the Bible text in that language.
 * Other languages use the English names (their Bible is English). Looked up by the English name the app uses
 * everywhere inside (saved places, references), so only what is shown on screen changes.
 */
export const ENGLISH_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew',
  'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
  'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter',
  '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
] as const;

const FR = [
  'Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome', 'Josué', 'Juges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Rois', '2 Rois', '1 Chroniques', '2 Chroniques', 'Esdras', 'Néhémie', 'Esther', 'Job', 'Psaumes', 'Proverbes',
  'Ecclésiaste', 'Cantique des cantiques', 'Ésaïe', 'Jérémie', 'Lamentations', 'Ézéchiel', 'Daniel', 'Osée', 'Joël', 'Amos',
  'Abdias', 'Jonas', 'Michée', 'Nahum', 'Habacuc', 'Sophonie', 'Aggée', 'Zacharie', 'Malachie', 'Matthieu',
  'Marc', 'Luc', 'Jean', 'Actes', 'Romains', '1 Corinthiens', '2 Corinthiens', 'Galates', 'Éphésiens', 'Philippiens',
  'Colossiens', '1 Thessaloniciens', '2 Thessaloniciens', '1 Timothée', '2 Timothée', 'Tite', 'Philémon', 'Hébreux', 'Jacques', '1 Pierre',
  '2 Pierre', '1 Jean', '2 Jean', '3 Jean', 'Jude', 'Apocalypse',
];

const ES = [
  'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio', 'Josué', 'Jueces', 'Rut', '1 Samuel', '2 Samuel',
  '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras', 'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios',
  'Eclesiastés', 'Cantares', 'Isaías', 'Jeremías', 'Lamentaciones', 'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
  'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Hageo', 'Zacarías', 'Malaquías', 'Mateo',
  'Marcos', 'Lucas', 'Juan', 'Hechos', 'Romanos', '1 Corintios', '2 Corintios', 'Gálatas', 'Efesios', 'Filipenses',
  'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses', '1 Timoteo', '2 Timoteo', 'Tito', 'Filemón', 'Hebreos', 'Santiago', '1 Pedro',
  '2 Pedro', '1 Juan', '2 Juan', '3 Juan', 'Judas', 'Apocalipsis',
];

const PT = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
  '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
  'Eclesiastes', 'Cantares de Salomão', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós',
  'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias', 'Mateus',
  'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses',
  'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro',
  '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse',
];

const TABLES: Partial<Record<Lang, string[]>> = { fr: FR, es: ES, pt: PT };

/** The book name to show for `englishName` in `lang` (the English name if there is no translation of the names). */
export function bookLabel(englishName: string, lang: Lang): string {
  const table = TABLES[lang];
  if (!table) return englishName;
  const i = (ENGLISH_BOOKS as readonly string[]).indexOf(englishName);
  return i >= 0 ? table[i] ?? englishName : englishName;
}

/** True when the book names are shown in `lang` (so a heading like "Jean 3" can replace "John 3"). */
export function hasBookNames(lang: Lang): boolean {
  return !!TABLES[lang];
}

/** Table lengths, for the unit test. */
export const BOOK_TABLE_SIZES = { fr: FR.length, es: ES.length, pt: PT.length, en: ENGLISH_BOOKS.length };

/** Lower-case, accents removed, only letters and digits: "Éxodo" and "exodo" compare equal. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let local: Map<string, string> | null = null;

function localNames(): Map<string, string> {
  if (local) return local;
  const map = new Map<string, string>();
  for (const table of [FR, ES, PT]) {
    table.forEach((name, i) => {
      const key = normalizeName(name);
      if (key && !map.has(key)) map.set(key, ENGLISH_BOOKS[i]);
    });
  }
  local = map;
  return map;
}

/**
 * The English book name for a French, Spanish or Portuguese name someone typed ("Genese", "1 Reyes", "joao"), or null.
 * An exact match wins; otherwise a typed start of a name (3+ letters) works when it points to only one book.
 */
export function findLocalBook(typed: string): string | null {
  const key = normalizeName(typed);
  if (!key) return null;
  const names = localNames();
  const exact = names.get(key);
  if (exact) return exact;
  if (key.length < 3) return null;
  const hits = new Set<string>();
  for (const [k, english] of names) if (k.startsWith(key)) hits.add(english);
  return hits.size === 1 ? [...hits][0] : null;
}
