'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark as BookmarkIcon, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import type { BibleVerse } from '@/app/data/bibleVerses';
import { copyText } from '@/lib/clipboard';
import { shareVerse } from '@/lib/shareVerse';
import { formatVerse, isPrayerBookmarked, togglePrayerBookmark, useStudy } from '@/lib/study';
import { useReadAloud } from '@/lib/useReadAloud';
import { BOOKMARK_BG } from '@/lib/highlightStyles';
import LongPressable from './LongPressable';
import ReadAloudBar from './ReadAloudBar';
import VerseActionSheet from './VerseActionSheet';

export const PRAYER_VERSE_PATH = (id: string) => `/bible/prayer/${encodeURIComponent(id)}`;

/**
 * One Prayer Verse in a list. Tap it to open it on its own page; hold it for the
 * menu (Copy, Read Aloud, Bookmark).
 */
export default function PrayerVerseCard({ verse }: { verse: BibleVerse }) {
  const router = useRouter();
  const study = useStudy();
  const reader = useReadAloud();
  const [menuOpen, setMenuOpen] = useState(false);
  const bookmarked = isPrayerBookmarked(study, verse.id);

  return (
    <>
      <LongPressable
        onTap={() => router.push(PRAYER_VERSE_PATH(verse.id))}
        onLongPress={() => setMenuOpen(true)}
        style={bookmarked ? { background: BOOKMARK_BG } : undefined}
        className={cn('rounded-xl border border-edge p-4 transition-colors', !bookmarked && 'bg-card hover:bg-card-2 active:bg-card-2')}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-acc-strong text-xs font-semibold">{verse.reference}</p>
          <span className="flex items-center gap-1 text-ink-faint">
            {bookmarked && <BookmarkIcon className="w-4 h-4 fill-current text-warn" aria-label="Bookmarked" />}
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{verse.text}&rdquo;</p>
      </LongPressable>

      <ReadAloudBar state={reader.state} label={`Reading ${verse.reference}`} onPause={reader.pause} onResume={reader.resume} onStop={reader.stop} />

      {menuOpen && (
        <VerseActionSheet
          title={verse.reference}
          onClose={() => setMenuOpen(false)}
          onCopy={() => copyText(formatVerse(verse.reference, 'KJV', verse.text))}
          onReadAloud={() => reader.start([{ id: verse.id, text: `${verse.reference}. ${verse.text}` }])}
          onShare={() => shareVerse(formatVerse(verse.reference, 'KJV', verse.text))}
          bookmarked={bookmarked}
          onToggleBookmark={() => togglePrayerBookmark(verse.id, verse.reference, verse.text)}
        />
      )}
    </>
  );
}
