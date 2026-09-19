'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { consumeBackPress } from '@/lib/backHandlerStack';

const EXIT_WINDOW_MS = 2000;

/**
 * Android hardware/gesture back button.
 *
 * 1. First offered to any in-page drill-down that registered itself on the
 *    back handler stack (e.g. the Bible reader's Book → Chapters → Verses
 *    steps) — if one claims it, that's the entire press: no toast, no exit.
 * 2. Otherwise: the first press (from anywhere) shows a "tap again to
 *    exit" toast; a second press within EXIT_WINDOW_MS actually closes
 *    the app — the standard Android "double back to exit" pattern.
 *
 * Deliberately doesn't gate on isCapacitorNative() first: that flag reads
 * as false at this component's very early mount time even inside the
 * real native app (a timing race against the bridge injection specific to
 * this app's server.url/remote-reload setup), which meant the listener
 * never even attempted to register. @capacitor/app's web fallback is a
 * documented no-op/rejects-gracefully for these calls, so attempting
 * registration unconditionally is safe in a plain browser too.
 */
export default function BackButtonExit() {
  const lastPressRef = useRef(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let removed = false;
    let removeListener = () => {};
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('backButton', () => {
          if (consumeBackPress()) return;

          const now = Date.now();
          if (now - lastPressRef.current < EXIT_WINDOW_MS) {
            setShowToast(false);
            App.exitApp().catch(() => {});
            return;
          }
          lastPressRef.current = now;
          setShowToast(true);
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setShowToast(false), EXIT_WINDOW_MS);
        })
      )
      .then((listener) => {
        if (removed) {
          listener.remove();
          return;
        }
        removeListener = () => listener.remove();
      })
      .catch(() => {
        // Not running inside Capacitor (plain browser) — nothing to do.
      });

    return () => {
      removed = true;
      removeListener();
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  if (!showToast) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[9999] flex justify-center px-4 pointer-events-none safe-bottom">
      <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-ink text-page shadow-2xl border border-white/10 animate-[toast-in_0.22s_ease-out]">
        <LogOut className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm font-semibold">Tap back again to exit</span>
      </div>
    </div>
  );
}
