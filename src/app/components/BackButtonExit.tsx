'use client';

import { useEffect, useRef, useState } from 'react';

const EXIT_WINDOW_MS = 2000;

/**
 * Android hardware/gesture back button: the first press (from anywhere in
 * the app) shows a "tap again to exit" toast; a second press within
 * EXIT_WINDOW_MS actually closes the app — the standard Android
 * "double back to exit" pattern.
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full bg-black/85 text-white text-sm font-medium shadow-lg pointer-events-none safe-bottom">
      Tap back again to exit
    </div>
  );
}
