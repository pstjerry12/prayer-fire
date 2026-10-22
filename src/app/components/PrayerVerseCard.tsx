'use client';

import { useEffect, useState } from 'react';
import { Bookmark as BookmarkIcon, Share2, Square, Volume2 } from 'lucide-react';
import { cn } from '../utils/cn';
import type { BibleVerse } from '@/app/data/bibleVerses';
import { prayerBookmarkKey, useBookmarks } from '@/lib/bookmarks';
import { speakText, stopSpeech } from '@/lib/readAloud';
import LongPressable from './LongPressable';
import VerseActionBar from './VerseActionBar';

/**
 * One Prayer Verse. Hold it for 2 seconds and it highlights and shows
 * Copy / Bookmark; Listen and Share are always there.
 */
export default function PrayerVerseCard({ verse }: { verse: BibleVerse }) {
  const { isBookmarked, toggle } = useBookmarks();
  const [held, setHeld] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const key = prayerBookmarkKey(verse.id);
  const saved = isBookmarked(key);

  // Stop reading if this card goes away.
  useEffect(() => () => {
    if (speaking) stopSpeech();
  }, [speaking]);

  function handleSpeak() {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakText(`${verse.reference}. ${verse.text}`, {
      onEnd: () => setSpeaking(false),
    });
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        held ? 'bg-warn-soft border-warn-edge ring-2 ring-warn-edge' : 'bg-card border-edge'
      )}
    >
      <LongPressable onLongPress={() => setHeld(true)} onTap={() => held && setHeld(false)}>
        <div className="flex items-start justify-between mb-2">
          <p className="text-acc-strong text-xs font-semibold">{verse.reference}</p>
          {saved && <BookmarkIcon className="w-4 h-4 fill-current text-acc" aria-label="Bookmarked" />}
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{verse.text}&rdquo;</p>
      </LongPressable>

      {held && (
        <VerseActionBar
          copyValue={`"${verse.text}" — ${verse.reference}`}
          bookmarked={saved}
          onToggleBookmark={() =>
            toggle({ key, kind: 'prayer', reference: verse.reference, text: verse.text })
          }
          onClose={() => setHeld(false)}
        />
      )}

      <div className="flex gap-3 mt-3">
        <button
          onClick={handleSpeak}
          className={cn('flex items-center gap-1 text-xs', speaking ? 'text-acc font-bold' : 'text-ink-muted hover:text-ink')}
        >
          {speaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
          {speaking ? 'Stop' : 'Listen'}
        </button>
        {canShare && (
          <button
            onClick={() => navigator.share({ title: verse.reference, text: `"${verse.text}" — ${verse.reference}` }).catch(() => {})}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            <Share2 className="w-3 h-3" /> Share
          </button>
        )}
      </div>
    </div>
  );
}
