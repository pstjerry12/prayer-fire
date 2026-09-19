'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { listenBackButton, exitNativeApp } from '@/lib/capacitorAlarm';

const EXIT_WINDOW_MS = 2000;

/**
 * Android hardware/gesture back button: navigate back within the app when
 * there's somewhere to go, otherwise require a second press within
 * EXIT_WINDOW_MS (with a "tap again to exit" toast) before actually
 * closing the app — the standard Android "double back to exit" pattern.
 */
export default function BackButtonExit() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const lastPressRef = useRef(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let removeListener = () => {};
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    listenBackButton(() => {
      if (pathnameRef.current !== '/') {
        router.back();
        return;
      }

      const now = Date.now();
      if (now - lastPressRef.current < EXIT_WINDOW_MS) {
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
  }, [router]);

  if (!showToast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full bg-black/85 text-white text-sm font-medium shadow-lg pointer-events-none safe-bottom">
      Tap back again to exit
    </div>
  );
}
