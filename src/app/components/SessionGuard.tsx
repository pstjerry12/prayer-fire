'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { checkSession, clearSession } from '@/lib/authClient';

export const LAST_ACTIVE_KEY = 'pfm_last_active';
export const IDLE_NOTICE_KEY = 'pfm_idle_notice';
export const IDLE_MINUTES_KEY = 'pfm_idle_minutes';

const DEFAULT_IDLE_MINUTES = 30; // used until the server's setting is known
const TOUCH_EVERY_MS = 15_000; // how often use of the app is recorded
const CHECK_EVERY_MS = 30_000; // how often an open-but-untouched app is checked
const RECHECK_SESSION_MS = 20 * 60_000; // re-verify (and count today's visit) after being away this long

function readNumber(key: string): number | null {
  try {
    const n = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Signs the person out when the app has been left alone for a while, so the
 * sign-in wall asks again (default 30 minutes; the admin can change it or turn
 * it off in Admin → Settings). "Left alone" means either the app sat in the
 * background / was closed for that long, or it stayed open without being touched.
 *
 * It also re-checks the session whenever the app comes back to the front, so a
 * phone that keeps the app alive across midnight still counts as a visit on the
 * new day in Admin → Daily activity.
 */
export default function SessionGuard() {
  const { user, setUser, signOut } = useApp();
  const signedIn = !!user;
  // signOut is re-created on every render of the provider; keep the latest in a
  // ref so the listeners below aren't torn down (and activity re-stamped) each time.
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const limitMinutesRef = useRef<number>(readNumber(IDLE_MINUTES_KEY) ?? DEFAULT_IDLE_MINUTES);
  const lastCheckRef = useRef<number>(Date.now());
  const lockingRef = useRef(false);
  // The very first idle check waits for the server's limit (or a short timeout),
  // so a changed setting applies even on a phone that has never cached it.
  const [limitReady, setLimitReady] = useState(false);

  // Learn the current idle limit from the server (cached for offline starts).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/app-version', { cache: 'no-store', signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { idleLockMinutes?: number } | null) => {
        if (cancelled || !data || typeof data.idleLockMinutes !== 'number') return;
        limitMinutesRef.current = data.idleLockMinutes;
        try { localStorage.setItem(IDLE_MINUTES_KEY, String(data.idleLockMinutes)); } catch { /* ignore */ }
      })
      .catch(() => { /* keep the cached/default limit */ })
      .finally(() => { if (!cancelled) setLimitReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!signedIn || !limitReady) return;

    const touch = () => {
      try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* ignore */ }
    };

    const isIdle = () => {
      const limit = limitMinutesRef.current;
      if (!limit || limit <= 0) return false;
      const last = readNumber(LAST_ACTIVE_KEY);
      return last !== null && Date.now() - last > limit * 60_000;
    };

    const lock = async () => {
      if (lockingRef.current) return;
      lockingRef.current = true;
      try {
        try { localStorage.setItem(IDLE_NOTICE_KEY, '1'); } catch { /* ignore */ }
        await signOutRef.current();
        try { localStorage.removeItem(LAST_ACTIVE_KEY); } catch { /* ignore */ }
      } finally {
        lockingRef.current = false;
      }
    };

    // On launch / resume: lock if the app was away too long, otherwise count
    // this as use. A fresh sign-in has no timestamp yet, so it never locks.
    if (isIdle()) { void lock(); return; }
    touch();

    let lastTouch = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch < TOUCH_EVERY_MS) return;
      lastTouch = now;
      touch();
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));

    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      if (isIdle()) { void lock(); return; }
      touch();
      // Back in the app after a while: re-verify the session and record today's visit.
      if (Date.now() - lastCheckRef.current > RECHECK_SESSION_MS) {
        lastCheckRef.current = Date.now();
        const check = await checkSession();
        if (check.status === 'ok') {
          setUser(check.user);
        } else if (check.status === 'invalid') {
          clearSession();
          setUser(null);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && isIdle()) void lock();
    }, CHECK_EVERY_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [signedIn, limitReady, setUser]);

  return null;
}
