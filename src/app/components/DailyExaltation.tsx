'use client';

import { useCachedJson } from '@/lib/cachedJson';
import { Play } from 'lucide-react';
import { extractYouTubeVideoId } from '../utils/youtube';
import { useI18n } from '@/app/i18n';

interface DailyVideo {
  dailyYoutubeUrl: string;
  dailyYoutubeTitle: string;
  dailyYoutubeSubtitle: string;
}

export default function DailyExaltation() {
  const { t } = useI18n();
  const data = useCachedJson<DailyVideo>('/api/social-links', 10 * 60 * 1000);

  if (!data || !(data.dailyYoutubeUrl ?? '').trim()) return null;

  const videoId = extractYouTubeVideoId(data.dailyYoutubeUrl);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <a
      href={data.dailyYoutubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-card rounded-2xl mt-4 md:mt-6 border border-edge shadow-sm hover:border-acc-edge transition-all overflow-hidden"
    >
      {thumbnail && (
        <div className="relative aspect-video bg-card-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, matches existing plain-<img> pattern in Footer.tsx */}
          <img
            src={thumbnail}
            alt={data.dailyYoutubeTitle || 'Daily Morning Exaltation'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <span className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-danger flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </span>
          </div>
        </div>
      )}
      <div className="p-4 md:p-5">
        <p className="text-danger text-[0.625rem] font-bold uppercase tracking-wider">{t('dailyExaltation.dailyMorningExaltation')}</p>
        <h3 className="text-ink font-bold text-sm md:text-base mt-1">{data.dailyYoutubeTitle || 'Watch on YouTube'}</h3>
        {data.dailyYoutubeSubtitle && (
          <p className="text-ink-muted text-[0.6875rem] md:text-sm mt-0.5">{data.dailyYoutubeSubtitle}</p>
        )}
      </div>
    </a>
  );
}
