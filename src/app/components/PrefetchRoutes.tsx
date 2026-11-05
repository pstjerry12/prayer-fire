'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context';
import { isLowData } from '@/lib/lowData';

// The screens people open most. Their data is fetched in the background once the first screen has settled, so the tap
// that follows finds it ready.
const ROUTES = ['/bible', '/workshop', '/startup', '/prayer-verses', '/study', '/schedule', '/scripture', '/network', '/fasting', '/groups', '/partner'];

export default function PrefetchRoutes() {
  const router = useRouter();
  const { user, authChecked } = useApp();
  const ready = authChecked && !!user;

  useEffect(() => {
    if (!ready) return;
    // Respect people who turned on low-data mode, who save data, or who are on a very slow connection.
    if (isLowData()) return;
    const timers: number[] = [];
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (n: number) => void;
    };
    const kick = () => {
      ROUTES.forEach((route, i) => {
        timers.push(window.setTimeout(() => {
          try { router.prefetch(route); } catch { /* ignore */ }
        }, i * 250));
      });
    };
    const useIdle = typeof w.requestIdleCallback === 'function';
    const start = useIdle ? w.requestIdleCallback!(kick, { timeout: 4000 }) : window.setTimeout(kick, 2500);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (useIdle) w.cancelIdleCallback?.(start);
      else window.clearTimeout(start);
    };
  }, [ready, router]);

  return null;
}
