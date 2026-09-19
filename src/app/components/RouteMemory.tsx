'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LAST_PATH_KEY = 'pfm_last_path';
const LAST_PATH_AT_KEY = 'pfm_last_path_at';
const RESUME_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Restores the screen the user was on when the app's process gets killed
 * while backgrounded — routine on Android (especially lower-RAM devices,
 * or with aggressive OEM battery/memory management), and something a
 * Capacitor WebView wrapper doesn't get for free the way a fully-native
 * app's own instance-state saving does: after a process kill, Capacitor
 * always reloads the configured server.url's root path ('/') on next
 * launch, with no memory of where the user actually was. Persisting the
 * current path to localStorage (survives a process kill, unlike
 * sessionStorage/in-memory state) and redirecting back to it once, on
 * boot, closes that gap.
 *
 * Only acts once per JS runtime lifetime (the ref guard) — later,
 * genuinely user-driven navigation is never touched. The time window
 * avoids resuming into a days-old screen after a long, intentional gap.
 */
export default function RouteMemory() {
  const pathname = usePathname();
  const router = useRouter();
  const restoreCheckedRef = useRef(false);

  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;

    try {
      const lastPath = localStorage.getItem(LAST_PATH_KEY);
      const lastAt = Number(localStorage.getItem(LAST_PATH_AT_KEY) || 0);
      const withinWindow = Date.now() - lastAt < RESUME_WINDOW_MS;
      if (lastPath && lastPath !== pathname && withinWindow) {
        router.replace(lastPath);
      }
    } catch {
      // ignore
    }
    // Only ever run this restore check once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_PATH_KEY, pathname);
      localStorage.setItem(LAST_PATH_AT_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}
