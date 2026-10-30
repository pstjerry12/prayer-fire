'use client';

import { useEffect, useState } from 'react';
import { getNativePlatform } from './capacitorAlarm';

/**
 * True only inside the Android app (the Capacitor wrapper), never in a browser.
 * Starts false so the server render and the first client render match, then checks.
 * The app loads its page from the live site, so the native bridge can report "web" for the
 * first instants after launch: a "not Android yet" answer is re-checked a few times, never trusted.
 */
export function useAndroidApp(): boolean {
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const check = async () => {
      let isAndroid = getNativePlatform() === 'android';
      if (!isAndroid) {
        try {
          const { Capacitor } = await import('@capacitor/core');
          isAndroid = Capacitor.getPlatform() === 'android';
        } catch {
          isAndroid = false;
        }
      }
      if (cancelled) return;
      if (isAndroid) {
        setAndroid(true);
      } else if (tries++ < 5) {
        setTimeout(check, 400);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return android;
}
