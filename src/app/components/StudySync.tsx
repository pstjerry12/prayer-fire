'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '../context';
import { getStoredToken } from '@/lib/authClient';
import { getStudyDoc, mergeRemoteDoc, STUDY_CHANGED_EVENT } from '@/lib/study';

const DEBOUNCE_MS = 2500; // wait for a burst of edits to settle
const RESYNC_AFTER_MS = 60_000; // when the app comes back to the front

/**
 * Keeps "My Study" (bookmarks, highlights, sermon notes) backed up and shared
 * across phones for signed-in users. The phone's own copy is always the source
 * of truth and works offline; this just merges it with the server copy when
 * there's a connection, and quietly does nothing when there isn't.
 */
export default function StudySync() {
  const { user } = useApp();
  const userId = user?.id ?? null;
  const running = useRef(false);
  const again = useRef(false);
  const lastRun = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function sync() {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      try {
        const token = getStoredToken();
        const res = await fetch('/api/study', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ doc: getStudyDoc() }),
        });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { doc?: unknown };
          if (data.doc) mergeRemoteDoc(data.doc);
        }
      } catch {
        // offline or server unavailable: try again on the next change or return to the app
      } finally {
        running.current = false;
        lastRun.current = Date.now();
        if (again.current && !cancelled) {
          again.current = false;
          schedule();
        }
      }
    }

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(sync, DEBOUNCE_MS);
    }

    const onChange = () => schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRun.current > RESYNC_AFTER_MS) sync();
    };

    sync();
    window.addEventListener(STUDY_CHANGED_EVENT, onChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(STUDY_CHANGED_EVENT, onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  return null;
}
