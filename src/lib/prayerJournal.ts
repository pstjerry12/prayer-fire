/**
 * The prayer journal: what a person is praying for, and what God answered. It lives on the phone (local-first), so
 * it works offline and nothing private leaves the device unless the person chooses to share an answered prayer as a
 * testimony. Pure logic, with no browser or React imports, so it is easy to test.
 */

export type JournalEntry = {
  id: string;
  text: string;
  /** ISO time the request was written. */
  createdAt: string;
  /** ISO time it was marked answered (absent while still waiting). */
  answeredAt?: string;
  /** What God did, in the person's words (optional). */
  answerNote?: string;
};

export const JOURNAL_KEY = 'pfm_journal';
export const MAX_ENTRIES = 500;
export const MAX_TEXT = 1000;

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

/** Reads whatever was saved; ignores anything that is not a valid entry (a damaged value never breaks the screen). */
export function parseJournal(raw: string | null | undefined): JournalEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: JournalEntry[] = [];
    for (const o of arr) {
      if (!o || typeof o !== 'object') continue;
      const text = clean((o as JournalEntry).text, MAX_TEXT);
      const id = clean((o as JournalEntry).id, 80);
      const createdAt = clean((o as JournalEntry).createdAt, 40);
      if (!text || !id || Number.isNaN(Date.parse(createdAt))) continue;
      const e: JournalEntry = { id, text, createdAt };
      const answeredAt = clean((o as JournalEntry).answeredAt, 40);
      if (answeredAt && !Number.isNaN(Date.parse(answeredAt))) e.answeredAt = answeredAt;
      const note = clean((o as JournalEntry).answerNote, MAX_TEXT);
      if (note) e.answerNote = note;
      out.push(e);
    }
    return out.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function serializeJournal(entries: JournalEntry[]): string {
  return JSON.stringify(entries.slice(0, MAX_ENTRIES));
}

export function newId(now = Date.now()): string {
  return `j${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Adds a new request at the top. Empty text is ignored. */
export function addEntry(entries: JournalEntry[], text: string, now = new Date()): JournalEntry[] {
  const t = clean(text, MAX_TEXT);
  if (!t) return entries;
  return [{ id: newId(now.getTime()), text: t, createdAt: now.toISOString() }, ...entries].slice(0, MAX_ENTRIES);
}

/** Marks a request answered today (with an optional note), or puts it back to "waiting" with `answered=false`. */
export function setAnswered(entries: JournalEntry[], id: string, answered: boolean, note = '', now = new Date()): JournalEntry[] {
  return entries.map((e) => {
    if (e.id !== id) return e;
    if (!answered) {
      const { answeredAt: _a, answerNote: _n, ...rest } = e;
      void _a; void _n;
      return rest;
    }
    const n = clean(note, MAX_TEXT);
    return { ...e, answeredAt: now.toISOString(), ...(n ? { answerNote: n } : { answerNote: undefined }) };
  });
}

export function removeEntry(entries: JournalEntry[], id: string): JournalEntry[] {
  return entries.filter((e) => e.id !== id);
}

export function editText(entries: JournalEntry[], id: string, text: string): JournalEntry[] {
  const t = clean(text, MAX_TEXT);
  if (!t) return entries;
  return entries.map((e) => (e.id === id ? { ...e, text: t } : e));
}

export function waiting(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => !e.answeredAt);
}

/** Answered ones, newest answer first. */
export function answered(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => !!e.answeredAt).sort((a, b) => Date.parse(b.answeredAt!) - Date.parse(a.answeredAt!));
}

/** "3 days" / "2 weeks" / "5 months" between asking and the answer. */
export function waitedLabel(e: JournalEntry): string {
  if (!e.answeredAt) return '';
  const days = Math.max(0, Math.round((Date.parse(e.answeredAt) - Date.parse(e.createdAt)) / 86400000));
  if (days < 1) return 'the same day';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/** "the same day" or "after 3 weeks", for a sentence. */
export function waitedPhrase(e: JournalEntry): string {
  const w = waitedLabel(e);
  return !w ? '' : w === 'the same day' ? w : `after ${w}`;
}

/** The text sent to the Testimony Page: the request, what God did, and how long it took. Never includes a name. */
export function testimonyText(e: JournalEntry): string {
  const parts = [`I prayed: ${e.text}`];
  if (e.answerNote) parts.push(`God answered: ${e.answerNote}`);
  else if (e.answeredAt) parts.push('God answered this prayer!');
  const w = waitedLabel(e);
  if (w && w !== 'the same day') parts.push(`It took ${w}, but God is faithful.`);
  return parts.join('\n\n').slice(0, 2000);
}

export function journalStats(entries: JournalEntry[]) {
  const a = entries.filter((e) => !!e.answeredAt).length;
  return { total: entries.length, answered: a, waiting: entries.length - a };
}
