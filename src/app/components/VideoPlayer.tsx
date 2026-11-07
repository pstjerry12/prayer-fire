'use client';

import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { embedUrl, watchUrl, type Video } from '@/lib/videos';
import { useI18n } from '@/app/i18n';

/**
 * Plays a video inside the app (YouTube's privacy-friendly embed) with an "Open in YouTube" link as the way out if the phone
 * cannot play it. Back or the X closes it. Free; nothing is tracked by this app.
 */
export default function VideoPlayer({ video, onClose }: { video: Pick<Video, 'youtubeId' | 'title'>; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={video.title} data-testid="video-player" className="fixed inset-0 z-[90] bg-black/85 flex flex-col items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-white font-bold text-sm leading-snug">{video.title}</h2>
          <button onClick={onClose} aria-label={t('videoPlayer.closeVideo')} className="p-1.5 rounded-full bg-white/15 text-white flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl(video.youtubeId)}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <a href={watchUrl(video.youtubeId)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-white/90 text-xs font-semibold underline">
          <ExternalLink className="w-3.5 h-3.5" /> Open in YouTube
        </a>
      </div>
    </div>
  );
}
