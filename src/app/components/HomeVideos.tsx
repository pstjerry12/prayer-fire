'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Mic, Play } from 'lucide-react';
import { useCachedJson } from '@/lib/cachedJson';
import { thumbnailUrl, type Video } from '@/lib/videos';
import VideoPlayer from './VideoPlayer';

/**
 * Home: the newest podcast episode and short teachings as a swipeable row of thumbnails, with the "How to use Prayer Fire"
 * link. Shows nothing at all until the admin has added videos, so Home is unchanged until then. Free.
 */
export default function HomeVideos() {
  const podcast = useCachedJson<{ videos: Video[] }>('/api/videos?kind=podcast&limit=1', 10 * 60 * 1000);
  const teachings = useCachedJson<{ videos: Video[] }>('/api/videos?kind=teaching&limit=8', 10 * 60 * 1000);
  const tutorials = useCachedJson<{ videos: Video[] }>('/api/videos?kind=tutorial&limit=1', 10 * 60 * 1000);
  const [playing, setPlaying] = useState<Video | null>(null);

  const latestPodcast = podcast?.videos?.[0] ?? null;
  const row = [...(latestPodcast ? [latestPodcast] : []), ...(teachings?.videos ?? [])];
  const hasTutorials = (tutorials?.videos?.length ?? 0) > 0;
  if (row.length === 0 && !hasTutorials) return null;

  return (
    <section className="mt-4 md:mt-6" aria-label="Videos" data-testid="home-videos">
      {row.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif-heading font-bold text-ink">Watch and listen</h2>
            <Link href="/podcast" className="text-acc-strong text-xs font-bold flex items-center gap-0.5">All episodes <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="-mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2" role="list">
            {row.map((v) => (
              <button key={v.id} role="listitem" onClick={() => setPlaying(v)} data-testid="home-video"
                className="snap-start shrink-0 w-[72%] sm:w-64 text-left bg-card border border-edge rounded-2xl overflow-hidden hover:border-acc-edge transition-all">
                <span className="relative block aspect-video bg-card-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
                  <img src={thumbnailUrl(v.youtubeId)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <span className="w-11 h-11 rounded-full bg-danger flex items-center justify-center shadow-lg"><Play className="w-5 h-5 text-white fill-white ml-0.5" /></span>
                  </span>
                </span>
                <span className="block p-3">
                  <span className="flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong">{v.kind === 'podcast' && <Mic className="w-3 h-3" />}{v.kind === 'podcast' ? 'Podcast' : 'Short teaching'}</span>
                  <span className="block text-sm font-bold text-ink leading-snug mt-0.5 line-clamp-2">{v.title}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {hasTutorials && (
        <Link href="/how-to" data-testid="home-howto" className="mt-1 flex items-center gap-3 bg-card border border-edge rounded-2xl px-4 py-3 hover:border-acc-edge">
          <span className="w-9 h-9 rounded-full bg-acc-soft text-acc-strong flex items-center justify-center flex-shrink-0"><Play className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-ink">How to use Prayer Fire</span>
            <span className="block text-xs text-ink-muted">Short videos, one for each feature</span>
          </span>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </Link>
      )}
      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}
