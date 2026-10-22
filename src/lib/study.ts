'use client';

import { useSyncExternalStore } from 'react';
import {
  emptyDoc,
  mergeDocs,
  sanitizeDoc,
  type HighlightColor,
  type PrayerBookmark,
  type Sermon,
  type SermonEntry,
  type StudyDoc,
  type StudyVerse,
} from './studyMerge';

export type { HighlightColor, PrayerBookmark, Sermon, SermonEntry, StudyDoc, StudyVerse };
export { HIGHLIGHT_COLORS } from './studyMerge';

/**
 * "My Study" on this phone: bookmarks, highlights and sermon notes.
 *
 * Everything is saved to localStorage first, so it works offline. When the
 * person is signed in, StudySync merges this with their copy on the server
 * (see /api/study) so it follows them to another phone.
 */

const STORAGE_KEY = 'pfm_study_v1';
const OLD_BOOKMARKS_KEY = 'pfm_bookmarks'; // the build-22 bookmark list, imported once
const LEGACY_FAVORITES_KEY = 'upp_bible_favorites';
const MIGRATED_KEY = 'pfm_bookmarks_migrated';
export const STUDY_CHANGED_EVENT = 'pfm-study-changed';

/** The verse being saved/highlighted/added: everything needed to show it later, even offline. */
export interface VerseInfo {
  translationId: string;
  osis: string;
  chapter: number;
  verse: number;
  reference: string; // "John 3:16"
  text: string;
}

export function verseKey(v: Pick<VerseInfo, 'translationId' | 'osis' | 'chapter' | 'verse'>): string {
  return `${v.translationId}:${v.osis}:${v.chapter}:${v.verse}`;
}

const EMPTY = emptyDoc();
let cache: StudyDoc | null = null;

function importOldBookmarks(doc: StudyDoc): StudyDoc {
  try {
    const raw = localStorage.getItem(OLD_BOOKMARKS_KEY);
    if (!raw) return doc;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return doc;
    for (const b of list) {
      if (!b || typeof b.key !== 'string') continue;
      const at = typeof b.createdAt === 'number' ? b.createdAt : Date.now();
      if (b.kind === 'prayer') {
        const id = b.key.replace(/^prayer:/, '');
        doc.prayer[id] = { id, reference: String(b.reference ?? ''), text: String(b.text ?? ''), bookmarkedAt: at, updatedAt: at };
      } else if (b.kind === 'bible' && b.osis && b.chapter && b.verse) {
        const translationId = String(b.key.split(':')[1] ?? 'kjv');
        const key = `${translationId}:${b.osis}:${b.chapter}:${b.verse}`;
        doc.verses[key] = {
          key,
          translationId,
          osis: String(b.osis),
          chapter: Number(b.chapter),
          verse: Number(b.verse),
          reference: String(b.reference ?? ''),
          text: String(b.text ?? ''),
          bookmarkedAt: at,
          highlight: null,
          highlightedAt: null,
          updatedAt: at,
        };
      }
    }
  } catch {
    // ignore unreadable old data
  }
  return doc;
}

function read(): StudyDoc {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = sanitizeDoc(JSON.parse(raw));
    } else {
      cache = importOldBookmarks(emptyDoc());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    }
  } catch {
    cache = emptyDoc();
  }
  return cache;
}

function write(next: StudyDoc, notifyChange = true) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: the in-memory copy still works this session
  }
  window.dispatchEvent(new Event('pfm-study-store'));
  if (notifyChange) window.dispatchEvent(new Event(STUDY_CHANGED_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener('pfm-study-store', onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('pfm-study-store', onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The whole study document (re-renders when it changes). */
export function useStudy(): StudyDoc {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getStudyDoc(): StudyDoc {
  return read();
}

/** Used by sync: folds the server's copy into this phone's copy. */
export function mergeRemoteDoc(remote: unknown) {
  const merged = mergeDocs(read(), sanitizeDoc(remote));
  write(merged, false);
  return merged;
}

const now = () => Date.now();

function upsertVerse(doc: StudyDoc, info: VerseInfo): StudyVerse {
  const key = verseKey(info);
  const existing = doc.verses[key];
  return (
    existing ?? {
      key,
      translationId: info.translationId,
      osis: info.osis,
      chapter: info.chapter,
      verse: info.verse,
      reference: info.reference,
      text: info.text,
      bookmarkedAt: null,
      highlight: null,
      highlightedAt: null,
      updatedAt: 0,
    }
  );
}

// ── Bookmarks and highlights ────────────────────────────────────────────

export function isVerseBookmarked(doc: StudyDoc, info: Pick<VerseInfo, 'translationId' | 'osis' | 'chapter' | 'verse'>): boolean {
  return doc.verses[verseKey(info)]?.bookmarkedAt != null;
}

/** Bookmarks every verse, or — when they are all bookmarked already — removes the bookmarks. Returns true when they are now saved. */
export function toggleBookmarks(infos: VerseInfo[]): boolean {
  const doc = read();
  const allSaved = infos.every((i) => doc.verses[verseKey(i)]?.bookmarkedAt != null);
  const t = now();
  const verses = { ...doc.verses };
  for (const info of infos) {
    const v = upsertVerse({ ...doc, verses }, info);
    verses[v.key] = { ...v, text: info.text, reference: info.reference, bookmarkedAt: allSaved ? null : v.bookmarkedAt ?? t, updatedAt: t };
  }
  write({ ...doc, verses });
  return !allSaved;
}

export function setHighlights(infos: VerseInfo[], color: HighlightColor | null) {
  const doc = read();
  const t = now();
  const verses = { ...doc.verses };
  for (const info of infos) {
    const v = upsertVerse({ ...doc, verses }, info);
    verses[v.key] = { ...v, text: info.text, reference: info.reference, highlight: color, highlightedAt: color ? t : null, updatedAt: t };
  }
  write({ ...doc, verses });
}

export function togglePrayerBookmark(id: string, reference: string, text: string): boolean {
  const doc = read();
  const existing = doc.prayer[id];
  const saved = existing?.bookmarkedAt != null;
  const t = now();
  write({
    ...doc,
    prayer: { ...doc.prayer, [id]: { id, reference, text, bookmarkedAt: saved ? null : t, updatedAt: t } },
  });
  return !saved;
}

export function isPrayerBookmarked(doc: StudyDoc, id: string): boolean {
  return doc.prayer[id]?.bookmarkedAt != null;
}

// ── Sermon notes ────────────────────────────────────────────────────────

function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${rand}`;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Starts a sermon session and makes it the active one (verses added from the reader go into it). */
export function startSermon(input: { title: string; preacher: string; date: string }): string {
  const doc = read();
  const t = now();
  const id = newId('sermon');
  const sermon: Sermon = {
    id,
    title: input.title.trim().slice(0, 200) || 'Untitled sermon',
    preacher: input.preacher.trim().slice(0, 200),
    date: input.date || todayISO(),
    createdAt: t,
    updatedAt: t,
    entries: [],
  };
  write({ ...doc, sermons: { ...doc.sermons, [id]: sermon }, activeSermonId: id, activeUpdatedAt: t });
  return id;
}

export function setActiveSermon(id: string | null) {
  const doc = read();
  write({ ...doc, activeSermonId: id, activeUpdatedAt: now() });
}

export function updateSermon(id: string, patch: Partial<Pick<Sermon, 'title' | 'preacher' | 'date'>>) {
  const doc = read();
  const sermon = doc.sermons[id];
  if (!sermon) return;
  write({
    ...doc,
    sermons: {
      ...doc.sermons,
      [id]: {
        ...sermon,
        title: patch.title !== undefined ? patch.title.slice(0, 200) : sermon.title,
        preacher: patch.preacher !== undefined ? patch.preacher.slice(0, 200) : sermon.preacher,
        date: patch.date !== undefined ? patch.date : sermon.date,
        updatedAt: now(),
      },
    },
  });
}

export function deleteSermon(id: string) {
  const doc = read();
  const sermon = doc.sermons[id];
  if (!sermon) return;
  const t = now();
  write({
    ...doc,
    sermons: { ...doc.sermons, [id]: { ...sermon, deleted: true, updatedAt: t } },
    activeSermonId: doc.activeSermonId === id ? null : doc.activeSermonId,
    activeUpdatedAt: doc.activeSermonId === id ? t : doc.activeUpdatedAt,
  });
}

/** Adds verses to a sermon, in the order given. A verse already in the sermon is not added twice. */
export function addVersesToSermon(sermonId: string, infos: VerseInfo[]): number {
  const doc = read();
  const sermon = doc.sermons[sermonId];
  if (!sermon) return 0;
  const t = now();
  const entries = [...sermon.entries];
  let added = 0;
  infos.forEach((info, i) => {
    const key = verseKey(info);
    const exists = entries.some((e) => !e.deleted && `${e.translationId}:${e.osis}:${e.chapter}:${e.verse}` === key);
    if (exists) return;
    entries.push({
      id: newId('entry'),
      translationId: info.translationId,
      osis: info.osis,
      chapter: info.chapter,
      verse: info.verse,
      reference: info.reference,
      text: info.text,
      note: '',
      addedAt: t + i, // keeps the order the verses were added in
      updatedAt: t,
    });
    added++;
  });
  if (added > 0) {
    write({ ...doc, sermons: { ...doc.sermons, [sermonId]: { ...sermon, entries, updatedAt: t } } });
  }
  return added;
}

export function updateEntryNote(sermonId: string, entryId: string, note: string) {
  const doc = read();
  const sermon = doc.sermons[sermonId];
  if (!sermon) return;
  const t = now();
  write({
    ...doc,
    sermons: {
      ...doc.sermons,
      [sermonId]: {
        ...sermon,
        entries: sermon.entries.map((e) => (e.id === entryId ? { ...e, note: note.slice(0, 5000), updatedAt: t } : e)),
        updatedAt: t,
      },
    },
  });
}

export function removeSermonEntry(sermonId: string, entryId: string) {
  const doc = read();
  const sermon = doc.sermons[sermonId];
  if (!sermon) return;
  const t = now();
  write({
    ...doc,
    sermons: {
      ...doc.sermons,
      [sermonId]: {
        ...sermon,
        entries: sermon.entries.map((e) => (e.id === entryId ? { ...e, deleted: true, updatedAt: t } : e)),
        updatedAt: t,
      },
    },
  });
}

// ── Reading helpers ─────────────────────────────────────────────────────

export function liveSermons(doc: StudyDoc): Sermon[] {
  return Object.values(doc.sermons)
    .filter((s) => !s.deleted)
    .sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
}

export function liveEntries(sermon: Sermon): SermonEntry[] {
  return sermon.entries.filter((e) => !e.deleted).sort((a, b) => a.addedAt - b.addedAt);
}

export function activeSermon(doc: StudyDoc): Sermon | null {
  const s = doc.activeSermonId ? doc.sermons[doc.activeSermonId] : null;
  return s && !s.deleted ? s : null;
}

/** "John 3:16 (KJV) - For God so loved…" — the format used whenever a verse is copied or shared. */
export function formatVerse(reference: string, translationShort: string, text: string): string {
  return `${reference} (${translationShort}) - ${text}`;
}

/** One-time import of the old Prayer Verses hearts. `verses` is the full prayer verse list. */
export function migrateLegacyFavorites(verses: { id: string; reference: string; text: string }[]) {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    localStorage.setItem(MIGRATED_KEY, '1');
    const raw = localStorage.getItem(LEGACY_FAVORITES_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids) || ids.length === 0) return;
    const doc = read();
    const prayer = { ...doc.prayer };
    let changed = false;
    const t = now();
    for (const id of ids) {
      const verse = verses.find((v) => v.id === id);
      if (verse && !prayer[id]) {
        prayer[id] = { id, reference: verse.reference, text: verse.text, bookmarkedAt: t, updatedAt: t };
        changed = true;
      }
    }
    if (changed) write({ ...doc, prayer });
  } catch {
    // ignore: favorites simply stay where they were
  }
}
