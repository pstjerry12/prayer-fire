'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NAV_START_EVENT } from '@/lib/navFeedback';

/**
 * A thin bar along the top of the screen that starts the moment a link is tapped and finishes when the new screen is
 * in place, so a tap ALWAYS shows that something is happening (a slow connection no longer looks like a frozen app).
 */
export default function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const running = useRef(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // A tap on a link to another screen, or code that calls router.push (see announceNavigation).
  useEffect(() => {
    const start = () => {
      if (running.current) return;
      running.current = true;
      clear();
      setVisible(true);
      setWidth(12);
      later(30, () => setWidth(55));
      later(600, () => setWidth(75));
      later(2500, () => setWidth(88));
      // Never leave the bar hanging if the navigation was cancelled.
      later(12000, () => {
        running.current = false;
        setVisible(false);
        setWidth(0);
      });
    };
    const onClick = (e: MouseEvent) => {
      // (Next's own <Link> calls preventDefault() to take over the navigation, so that is not checked here.)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    window.addEventListener('click', onClick);
    window.addEventListener(NAV_START_EVENT, start);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener(NAV_START_EVENT, start);
      clear();
    };
  }, []);

  // The new screen arrived.
  useEffect(() => {
    if (!running.current) return;
    running.current = false;
    clear();
    later(0, () => setWidth(100));
    later(220, () => setVisible(false));
    later(450, () => setWidth(0));
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 z-[200] h-[3px]"
      style={{ top: 'env(safe-area-inset-top)', opacity: visible ? 1 : 0, transition: 'opacity 200ms' }}
    >
      <div
        className="h-full bg-acc"
        style={{ width: `${width}%`, transition: width === 0 ? 'none' : 'width 350ms ease-out', boxShadow: '0 0 8px var(--acc)' }}
      />
    </div>
  );
}
