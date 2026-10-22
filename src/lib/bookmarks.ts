'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Saved verses ("bookmarks"), kept on the phone in localStorage.
 *
 * A bookmark is either a verse from the Bible reader (kind 'bible', which can be
 * reopened on its own page) or one of the themed Prayer Verses (kind 'prayer').
 * The older Prayer Verses "favorites" (heart) are migrated in once — see
 * migrateLegacyFavorites().
 */
export interface Bookmark {
  key: string;
  kind: 'bible' | 'prayer';
  reference: string; // "John 3:16"
  text: string;
  translation?: string; // "KJV" (bible bookmarks)
  osis?: string; // bible bookmarks: book code, for reopening the verse page
  chapter?: number;
  verse?: number;
  createdAt: number;
}

const STORAGE_KEY = 'pfm_bookmarks';
const LEGACY_FAVORITES_KEY = 'upp_bible_favorites';
const MIGRATED_KEY = 'pfm_bookmarks_migrated';
const CHANGE_EVENT = 'pfm-bookmarks-changed';

const EMPTY: Bookmark[] = [];
let cache: Bookmark[] | null = null;

function read(): Bookmark[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Bookmark[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full/blocked — the in-memory copy still works for this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null; // another tab changed it
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function bibleBookmarkKey(translationId: string, osis: string, chapter: number, verse: number): string {
  return `bible:${translationId}:${osis}:${chapter}:${verse}`;
}

export function prayerBookmarkKey(verseId: string): string {
  return `prayer:${verseId}`;
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, read, () => EMPTY);

  const isBookmarked = useCallback((key: string) => bookmarks.some((b) => b.key === key), [bookmarks]);

  /** Adds the bookmark, or removes it if already saved. Returns true when it is now saved. */
  const toggle = useCallback((bookmark: Omit<Bookmark, 'createdAt'>): boolean => {
    const current = read();
    if (current.some((b) => b.key === bookmark.key)) {
      write(current.filter((b) => b.key !== bookmark.key));
      return false;
    }
    write([{ ...bookmark, createdAt: Date.now() }, ...current]);
    return true;
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((b) => b.key !== key));
  }, []);

  return { bookmarks, isBookmarked, toggle, remove };
}

/** One-time import of the old Prayer Verses hearts. `verses` is the full prayer verse list. */
export function migrateLegacyFavorites(verses: { id: string; reference: string; text: string }[]) {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    localStorage.setItem(MIGRATED_KEY, '1');
    const raw = localStorage.getItem(LEGACY_FAVORITES_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids) || ids.length === 0) return;
    const current = read();
    const have = new Set(current.map((b) => b.key));
    const imported: Bookmark[] = [];
    for (const id of ids) {
      const verse = verses.find((v) => v.id === id);
      const key = prayerBookmarkKey(id);
      if (verse && !have.has(key)) {
        imported.push({ key, kind: 'prayer', reference: verse.reference, text: verse.text, createdAt: Date.now() });
      }
    }
    if (imported.length) write([...imported, ...current]);
  } catch {
    // ignore — favorites simply stay where they were
  }
}
