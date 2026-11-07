'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Mic, Play } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import VideoPlayer from '@/app/components/VideoPlayer';
import { useCachedJson } from '@/lib/cachedJson';
import { thumbnailUrl, type Video } from '@/lib/videos';
import { useI18n } from '@/app/i18n';

/** The Prayer Fire podcast and short teachings, newest first. Free. */
export default function PodcastPage() {
  const { t } = useI18n();
  const podcast = useCachedJson<{ videos: Video[] }>('/api/videos?kind=podcast&limit=60', 5 * 60 * 1000);
  const teachings = useCachedJson<{ videos: Video[] }>('/api/videos?kind=teaching&limit=60', 5 * 60 * 1000);
  const [playing, setPlaying] = useState<Video | null>(null);
  const items = [...(podcast?.videos ?? []), ...(teachings?.videos ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const loading = podcast === null || teachings === null;
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-acc flex items-center justify-center"><Mic className="w-6 h-6 text-on-acc" /></div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">{t('podcast.podcastAndTeachings')}</h1>
            <p className="text-xs text-ink-muted">{t('podcast.shortTeachingsToGrowYour')}</p>
          </div>
        </div>
        {loading && items.length === 0 ? (
          <p className="text-ink-muted text-sm">{t('globalAlerts.loading')}</p>
        ) : items.length === 0 ? (
          <div className="bg-card rounded-2xl border border-edge p-8 text-center"><p className="text-ink-muted text-sm">{t('podcast.theFirstEpisodeIsComing')}</p></div>
        ) : (
          <ul className="space-y-3">
            {items.map((v) => (
              <li key={v.id}>
                <button onClick={() => setPlaying(v)} data-testid="podcast-item" className="w-full flex gap-3 text-left bg-card border border-edge rounded-2xl p-3 hover:border-acc-edge">
                  <span className="relative w-32 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-card-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
                    <img src={thumbnailUrl(v.youtubeId)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/20 flex items-center justify-center"><Play className="w-6 h-6 text-white fill-white" /></span>
                  </span>
                  <span className="min-w-0 flex-1 self-center">
                    <span className="block text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong">{v.kind === 'podcast' ? 'Podcast' : 'Short teaching'} · {new Date(v.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="block text-sm font-bold text-ink leading-snug mt-0.5">{v.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </>
  );
}
