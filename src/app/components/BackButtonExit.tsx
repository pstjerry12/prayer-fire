'use client';

import { useEffect, useRef, useState } from 'react';
import { listenBackButton, exitNativeApp } from '@/lib/capacitorAlarm';

const EXIT_WINDOW_MS = 2000;

/**
 * Android hardware/gesture back button: the first press (from anywhere in
 * the app) shows a "tap again to exit" toast; a second press within
 * EXIT_WINDOW_MS actually closes the app — the standard Android
 * "double back to exit" pattern. Deliberately doesn't try to navigate back
 * within the app first — the bottom nav already covers moving between
 * sections, and mixing "sometimes goes back, sometimes exits" behavior
 * made the exit prompt feel like it wasn't showing up at all.
 */
export default function BackButtonExit() {
  const lastPressRef = useRef(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let removeListener = () => {};
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    listenBackButton(() => {
      const now = Date.now();
      if (now - lastPressRef.current < EXIT_WINDOW_MS) {
        setShowToast(false);
        exitNativeApp();
        return;
      }
      lastPressRef.current = now;
      setShowToast(true);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setShowToast(false), EXIT_WINDOW_MS);
    }).then((remove) => {
      removeListener = remove;
    });

    return () => {
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
