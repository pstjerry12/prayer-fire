'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Play } from 'lucide-react';
import { useCachedJson } from '@/lib/cachedJson';
import { featureForPath, type Video } from '@/lib/videos';
import VideoPlayer from './VideoPlayer';

/**
 * A small "Watch how" link under the top bar on a feature's own page, shown only when the admin has added a tutorial for that
 * feature. It plays the tutorial in the app. Placed once, in the Navbar, so every feature page gets it without being edited.
 */
export default function WatchHowStrip() {
  const pathname = usePathname() ?? '/';
  const feature = featureForPath(pathname);
  // Not on Home (Home has its own "How to use Prayer Fire" row), and not for pages that have no tutorial slot.
  const key = feature && feature !== 'home' ? feature : null;
  const data = useCachedJson<{ videos: Video[] }>(key ? `/api/videos?kind=tutorial&feature=${key}&limit=1` : '/api/videos?kind=tutorial&feature=none&limit=1', 10 * 60 * 1000);
  const [playing, setPlaying] = useState<Video | null>(null);
  const video = key ? data?.videos?.[0] : null;
  if (!video) return null;
  return (
    <>
      <button onClick={() => setPlaying(video)} data-testid="watch-how"
        className="w-full bg-acc-soft border-b border-acc-edge text-acc-strong text-xs font-bold py-1.5 flex items-center justify-center gap-1.5 hover:bg-acc-soft-2">
        <Play className="w-3.5 h-3.5 fill-current" /> Watch how to use this
      </button>
      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </>
  );
}
