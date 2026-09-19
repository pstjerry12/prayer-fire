'use client';

import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

const PULL_THRESHOLD = 70;
const MAX_PULL = 100;

/**
 * Standard mobile "pull down from the top to refresh" gesture. Beyond just
 * reloading the page, it also clears the service worker's cache first —
 * a plain reload alone can still serve stale JS/CSS chunks from that
 * cache (stale-while-revalidate only updates them in the background for
 * the *next* load), which is exactly the "still on the old version" cache
 * problem this app has repeatedly hit. This gives users a one-gesture way
 * to force a genuinely fresh load instead of force-stop + clear
 * cache + reopen.
 */
export default function PullToRefresh({ children }: { children: ReactNode }) {
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    if (refreshing || window.scrollY > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Damped so it feels resistive rather than tracking the finger 1:1.
    setPullDistance(Math.min(MAX_PULL, delta * 0.5));
  };

  const onTouchEnd = async () => {
    setDragging(false);
    if (startYRef.current === null) return;
    startYRef.current = null;

    if (pullDistance < PULL_THRESHOLD) {
      setPullDistance(0);
      return;
    }

    setRefreshing(true);
    setPullDistance(PULL_THRESHOLD);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Reloading below still helps even if the cache clear itself fails.
    }
    window.location.reload();
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden',
          !dragging && 'transition-[height] duration-200 ease-out'
        )}
        style={{ height: pullDistance }}
      >
        <RefreshCw
          className={cn('w-5 h-5 text-acc', refreshing && 'animate-spin')}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)` }
          }
        />
      </div>
      {children}
    </div>
  );
}
