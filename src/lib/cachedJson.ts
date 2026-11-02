import { useEffect, useState } from 'react';

/**
 * Small "show what you had, then refresh" cache for data that rarely changes (social links, announcements ...).
 * The last answer is kept on the phone, so a screen shows it at once on the next visit instead of waiting for the
 * network; it is fetched again only when it is older than `maxAgeMs`. Two components asking for the same URL at the
 * same time share ONE request.
 */
const PREFIX = 'pfm_cj:';
const inflight = new Map<string, Promise<unknown>>();

function read<T>(url: string): { t: number; d: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + url);
    return raw ? (JSON.parse(raw) as { t: number; d: T }) : null;
  } catch {
    return null;
  }
}

function write(url: string, d: unknown): void {
  try {
    localStorage.setItem(PREFIX + url, JSON.stringify({ t: Date.now(), d }));
  } catch {
    // storage full or unavailable: it simply is not cached
  }
}

function fetchShared<T>(url: string): Promise<T> {
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json() as Promise<T>;
    })
    .then((d) => {
      write(url, d);
      return d;
    })
    .finally(() => {
      inflight.delete(url);
    });
  inflight.set(url, p);
  return p;
}

/** The data for `url`: the saved copy straight after mount, then the fresh one. null until there is something. */
export function useCachedJson<T>(url: string, maxAgeMs = 5 * 60 * 1000): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const hit = read<T>(url);
    if (hit) {
      // (the saved copy is only readable on the client, after mount)
      setData(hit.d);
      if (Date.now() - hit.t < maxAgeMs) return () => { alive = false; };
    }
    fetchShared<T>(url)
      .then((d) => { if (alive) setData(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url, maxAgeMs]);
  return data;
}
