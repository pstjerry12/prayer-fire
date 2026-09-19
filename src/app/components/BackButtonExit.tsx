'use client';

import { useEffect, useRef, useState } from 'react';

const EXIT_WINDOW_MS = 2000;

// TEMP diagnostic badge — shows exactly where back-button registration
// stands on-device (plugin import / listener registration / event
// delivery), so a report of "exit doesn't work" can be pinned to a
// specific stage instead of guessed at blind. Remove once confirmed
// working.
const SHOW_DEBUG_BADGE = true;

/**
 * Android hardware/gesture back button: the first press (from anywhere in
 * the app) shows a "tap again to exit" toast; a second press within
 * EXIT_WINDOW_MS actually closes the app — the standard Android
 * "double back to exit" pattern.
 *
 * Deliberately doesn't gate on isCapacitorNative() first: that flag read
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
  const [debugStatus, setDebugStatus] = useState('init');

  useEffect(() => {
    let removed = false;
    let removeListener = () => {};
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    setDebugStatus('importing @capacitor/app…');

    import('@capacitor/app')
      .then(({ App }) => {
        setDebugStatus('registering listener…');
        return App.addListener('backButton', () => {
          setDebugStatus('event fired @ ' + new Date().toLocaleTimeString());
          const now = Date.now();
          if (now - lastPressRef.current < EXIT_WINDOW_MS) {
            setShowToast(false);
            setDebugStatus('calling App.exitApp()…');
            App.exitApp().catch((err) => setDebugStatus('exitApp error: ' + String(err)));
            return;
          }
          lastPressRef.current = now;
          setShowToast(true);
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setShowToast(false), EXIT_WINDOW_MS);
        });
      })
      .then((listener) => {
        if (removed) {
          listener.remove();
          return;
        }
        removeListener = () => listener.remove();
        setDebugStatus('ready — press back to test');
      })
      .catch((err) => {
        setDebugStatus('registration FAILED: ' + String(err));
      });

    return () => {
      removed = true;
      removeListener();
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  return (
    <>
      {SHOW_DEBUG_BADGE && (
        <div className="fixed top-2 right-2 z-[9999] max-w-[70vw] px-2 py-1 rounded bg-black/70 text-white text-[10px] font-mono pointer-events-none safe-top break-words">
          back: {debugStatus}
        </div>
      )}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full bg-black/85 text-white text-sm font-medium shadow-lg pointer-events-none safe-bottom">
          Tap back again to exit
        </div>
      )}
    </>
  );
}
