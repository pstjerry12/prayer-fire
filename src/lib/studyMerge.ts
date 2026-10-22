/**
 * The "My Study" data model and the rules for merging two copies of it.
 *
 * Pure TypeScript with no browser or database code, so the phone (to merge what
 * it has with what the server has) and the server (to combine uploads from two
 * devices) use exactly the same logic. Every record carries `updatedAt`; when
 * the same record exists in both copies the newer one wins, so edits on one
 * phone never wipe out different edits made on another.
 */

export type HighlightColor = 'orange' | 'green' | 'blue' | 'pink' | 'purple';
export const HIGHLIGHT_COLORS: HighlightColor[] = ['orange', 'green', 'blue', 'pink', 'purple'];

export interface StudyVerse {
  key: string; // `${translationId}:${osis}:${chapter}:${verse}`
  translationId: string;
  osis: string;
  chapter: number;
  verse: number;
  reference: string; // "John 3:16"
  text: string;
  bookmarkedAt: number | null;
  highlight: HighlightColor | null;
  highlightedAt: number | null;
  updatedAt: number;
}

export interface PrayerBookmark {
  id: string;
  reference: string;
  text: string;
  bookmarkedAt: number | null;
  updatedAt: number;
}

export interface SermonEntry {
  id: string;
  translationId: string;
  osis: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  note: string;
  addedAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
  entries: SermonEntry[];
}

export interface StudyDoc {
  v: 1;
  verses: Record<string, StudyVerse>;
  prayer: Record<string, PrayerBookmark>;
  sermons: Record<string, Sermon>;
  activeSermonId: string | null;
  activeUpdatedAt: number;
}

export function emptyDoc(): StudyDoc {
  return { v: 1, verses: {}, prayer: {}, sermons: {}, activeSermonId: null, activeUpdatedAt: 0 };
}

function newer<T extends { updatedAt: number }>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}

function mergeRecords<T extends { updatedAt: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const winner = newer(a[key], b[key]);
    if (winner) out[key] = winner;
  }
  return out;
}

function mergeEntries(a: SermonEntry[], b: SermonEntry[]): SermonEntry[] {
  const byId: Record<string, SermonEntry> = {};
  for (const entry of [...a, ...b]) {
    const winner = newer(byId[entry.id], entry);
    if (winner) byId[entry.id] = winner;
  }
  return Object.values(byId).sort((x, y) => x.addedAt - y.addedAt);
}

function mergeSermons(a: Record<string, Sermon>, b: Record<string, Sermon>): Record<string, Sermon> {
  const out: Record<string, Sermon> = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id];
    const y = b[id];
    if (!x || !y) {
      out[id] = (x ?? y) as Sermon;
      continue;
    }
    const meta = newer(x, y) as Sermon;
    out[id] = { ...meta, entries: mergeEntries(x.entries, y.entries) };
  }
  return out;
}

export function mergeDocs(a: StudyDoc, b: StudyDoc): StudyDoc {
  const activeFromB = b.activeUpdatedAt > a.activeUpdatedAt;
  return {
    v: 1,
    verses: mergeRecords(a.verses, b.verses),
    prayer: mergeRecords(a.prayer, b.prayer),
    sermons: mergeSermons(a.sermons, b.sermons),
    activeSermonId: activeFromB ? b.activeSermonId : a.activeSermonId,
    activeUpdatedAt: Math.max(a.activeUpdatedAt, b.activeUpdatedAt),
  };
}

// ── Validation (used on everything that comes from outside: storage, network) ──

const MAX_VERSES = 20000;
const MAX_PRAYER = 2000;
const MAX_SERMONS = 500;
const MAX_ENTRIES = 2000;

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanColor(v: unknown): HighlightColor | null {
  return HIGHLIGHT_COLORS.includes(v as HighlightColor) ? (v as HighlightColor) : null;
}

/** Turns anything into a well-formed StudyDoc (dropping what doesn't fit) so bad data can never break the app. */
export function sanitizeDoc(input: unknown): StudyDoc {
  const doc = emptyDoc();
  if (!isObj(input)) return doc;

  if (isObj(input.verses)) {
    for (const [key, raw] of Object.entries(input.verses).slice(0, MAX_VERSES)) {
      if (!isObj(raw)) continue;
      doc.verses[key.slice(0, 80)] = {
        key: key.slice(0, 80),
        translationId: str(raw.translationId, 12),
        osis: str(raw.osis, 12),
        chapter: num(raw.chapter),
        verse: num(raw.verse),
        reference: str(raw.reference, 80),
        text: str(raw.text, 3000),
        bookmarkedAt: raw.bookmarkedAt == null ? null : num(raw.bookmarkedAt),
        highlight: cleanColor(raw.highlight),
        highlightedAt: raw.highlightedAt == null ? null : num(raw.highlightedAt),
        updatedAt: num(raw.updatedAt),
      };
    }
  }

  if (isObj(input.prayer)) {
    for (const [id, raw] of Object.entries(input.prayer).slice(0, MAX_PRAYER)) {
      if (!isObj(raw)) continue;
      doc.prayer[id.slice(0, 80)] = {
        id: id.slice(0, 80),
        reference: str(raw.reference, 80),
        text: str(raw.text, 3000),
        bookmarkedAt: raw.bookmarkedAt == null ? null : num(raw.bookmarkedAt),
        updatedAt: num(raw.updatedAt),
      };
    }
  }

  if (isObj(input.sermons)) {
    for (const [id, raw] of Object.entries(input.sermons).slice(0, MAX_SERMONS)) {
      if (!isObj(raw)) continue;
      const entries: SermonEntry[] = [];
      if (Array.isArray(raw.entries)) {
        for (const e of raw.entries.slice(0, MAX_ENTRIES)) {
          if (!isObj(e) || typeof e.id !== 'string') continue;
          entries.push({
            id: e.id.slice(0, 80),
            translationId: str(e.translationId, 12),
            osis: str(e.osis, 12),
            chapter: num(e.chapter),
            verse: num(e.verse),
            reference: str(e.reference, 80),
            text: str(e.text, 3000),
            note: str(e.note, 5000),
            addedAt: num(e.addedAt),
            updatedAt: num(e.updatedAt),
            ...(e.deleted === true ? { deleted: true } : {}),
          });
        }
      }
      doc.sermons[id.slice(0, 80)] = {
        id: id.slice(0, 80),
        title: str(raw.title, 200),
        preacher: str(raw.preacher, 200),
        date: str(raw.date, 10),
        createdAt: num(raw.createdAt),
        updatedAt: num(raw.updatedAt),
        ...(raw.deleted === true ? { deleted: true } : {}),
        entries,
      };
    }
  }

  doc.activeSermonId = typeof input.activeSermonId === 'string' ? input.activeSermonId.slice(0, 80) : null;
  doc.activeUpdatedAt = num(input.activeUpdatedAt);
  return doc;
}
