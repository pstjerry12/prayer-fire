'use client';

import type { ReadController, ReaderState } from './readAloud';

/**
 * The app side of premium Bible voices (subscribers). Plays one chapter at a time: from the phone's offline copy if the person
 * downloaded it, otherwise from the link the server returns (generating the chapter first if nobody has listened to it yet).
 * Downloads are PER CHAPTER or per BOOK (one chapter after another), never the whole Bible at once, and live in the browser's
 * Cache Storage so they play with no internet.
 */
const VOICE_KEY = 'pfm_premium_voice';
const CACHE_NAME = 'pfm-bible-audio';

export interface VoiceInfo {
  id: string;
  label: string;
  description: string;
}

export interface ChapterRef {
  voice: string;
  translation: string;
  book: string; // OSIS code
  chapter: number;
}

export function getPremiumVoice(): string | null {
  try {
    return localStorage.getItem(VOICE_KEY) || null;
  } catch {
    return null;
  }
}

export function setPremiumVoice(id: string | null): void {
  try {
    if (id) localStorage.setItem(VOICE_KEY, id);
    else localStorage.removeItem(VOICE_KEY);
  } catch {
    // storage unavailable: the choice just does not stick
  }
}

const cacheKey = (r: ChapterRef) => `/offline-bible-audio/v1/${r.voice}/${r.translation}/${r.book}/${r.chapter}`;
const query = (r: ChapterRef) => `voice=${encodeURIComponent(r.voice)}&translation=${encodeURIComponent(r.translation)}&book=${encodeURIComponent(r.book)}&chapter=${r.chapter}`;

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches !== 'undefined' ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null;
  }
}

export async function isChapterDownloaded(r: ChapterRef): Promise<boolean> {
  const c = await openCache();
  return !!c && !!(await c.match(cacheKey(r)));
}

export async function removeChapterDownload(r: ChapterRef): Promise<void> {
  const c = await openCache();
  await c?.delete(cacheKey(r));
}

export type FetchResult = { ok: true; url: string } | { ok: false; message: string };

/** Asks the server for the chapter's audio link, waiting while it is prepared (the first listener of a chapter waits a little). */
export async function fetchChapterUrl(r: ChapterRef, signal?: AbortSignal): Promise<FetchResult> {
  for (let attempt = 0; attempt < 14; attempt++) {
    let res: Response;
    try {
      res = await fetch(`/api/bible-audio?${query(r)}`, { cache: 'no-store', signal });
    } catch {
      return { ok: false, message: 'No connection. Check your internet and try again.' };
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string; url?: string; message?: string; retryAfterSeconds?: number };
    if (data.status === 'ready' && data.url) return { ok: true, url: data.url };
    if (data.status === 'preparing') {
      await new Promise((ok) => setTimeout(ok, (data.retryAfterSeconds ?? 6) * 1000));
      continue;
    }
    return { ok: false, message: data.message || 'The premium voice is not available right now.' };
  }
  return { ok: false, message: 'The chapter is still being prepared. Please try again in a minute.' };
}

/** Saves a chapter on the phone for offline listening. */
export async function downloadChapter(r: ChapterRef, signal?: AbortSignal): Promise<{ ok: true } | { ok: false; message: string }> {
  const cache = await openCache();
  if (!cache) return { ok: false, message: 'This phone cannot save audio for offline use.' };
  if (await cache.match(cacheKey(r))) return { ok: true };
  const link = await fetchChapterUrl(r, signal);
  if (!link.ok) return link;
  try {
    const res = await fetch(link.url, { signal });
    if (!res.ok) throw new Error(String(res.status));
    await cache.put(cacheKey(r), res);
    return { ok: true };
  } catch {
    return { ok: false, message: 'The download did not finish. Check your internet and try again.' };
  }
}

/** Plays one chapter in a premium voice with the same pause / resume / stop controls as the phone voice. */
export function playPremiumChapter(
  r: ChapterRef,
  cb: { onStateChange: (s: ReaderState) => void; onEnd: (reason: 'done' | 'stopped' | 'error', detail?: string) => void }
): ReadController {
  const audio = new Audio();
  const abort = new AbortController();
  let objectUrl: string | null = null;
  let finished = false;

  const finish = (reason: 'done' | 'stopped' | 'error', detail?: string) => {
    if (finished) return;
    finished = true;
    abort.abort();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    cb.onStateChange('idle');
    cb.onEnd(reason, detail);
  };

  audio.onended = () => finish('done');
  audio.onerror = () => finish('error', 'the audio could not be played');
  audio.onplay = () => cb.onStateChange('playing');
  audio.onpause = () => {
    if (!finished && !audio.ended) cb.onStateChange('paused');
  };

  cb.onStateChange('playing'); // shows the player straight away while the chapter is fetched
  (async () => {
    try {
      const cache = await openCache();
      const saved = cache ? await cache.match(cacheKey(r)) : undefined;
      if (saved) {
        objectUrl = URL.createObjectURL(await saved.blob());
        audio.src = objectUrl;
      } else {
        const link = await fetchChapterUrl(r, abort.signal);
        if (finished) return;
        if (!link.ok) return finish('error', link.message);
        audio.src = link.url;
      }
      await audio.play();
    } catch (e) {
      if (!finished) finish('error', e instanceof Error && e.name !== 'AbortError' ? 'the audio could not be played' : undefined);
    }
  })();

  return {
    pause: () => audio.pause(),
    resume: () => void audio.play().catch(() => {}),
    stop: () => finish('stopped'),
  };
}
