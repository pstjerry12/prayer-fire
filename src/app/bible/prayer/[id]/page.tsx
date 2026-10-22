'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bookmark as BookmarkIcon, Check, ChevronLeft, ChevronRight, Copy, Square, Volume2 } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import LongPressable from '@/app/components/LongPressable';
import ReadAloudBar from '@/app/components/ReadAloudBar';
import VerseActionSheet from '@/app/components/VerseActionSheet';
import { PRAYER_VERSE_PATH } from '@/app/components/PrayerVerseCard';
import { KJV_BIBLE_CATEGORIES, KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { copyText } from '@/lib/clipboard';
import { formatVerse, isPrayerBookmarked, togglePrayerBookmark, useStudy } from '@/lib/study';
import { useReadAloud } from '@/lib/useReadAloud';
import { BOOKMARK_BG } from '@/lib/highlightStyles';

/** One Prayer Verse on its own full page: large, easy-to-read text that scrolls. */
export default function PrayerVersePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const study = useStudy();
  const reader = useReadAloud();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const id = decodeURIComponent(params.id ?? '');
  const verse = KJV_BIBLE_VERSES.find((v) => v.id === id);
  const category = verse ? KJV_BIBLE_CATEGORIES.find((c) => c.id === verse.category) : undefined;
  const siblings = verse ? KJV_BIBLE_VERSES.filter((v) => v.category === verse.category) : [];
  const position = verse ? siblings.findIndex((v) => v.id === verse.id) : -1;
  const previous = position > 0 ? siblings[position - 1] : null;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null;
  const bookmarked = verse ? isPrayerBookmarked(study, verse.id) : false;

  async function handleCopy() {
    if (!verse) return;
    if (await copyText(formatVerse(verse.reference, 'KJV', verse.text))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function readAloud() {
    if (!verse) return;
    if (reader.reading) reader.stop();
    else reader.start([{ id: verse.id, text: `${verse.reference}. ${verse.text}` }]);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 md:pb-12">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-acc mb-5">
          <ChevronLeft className="w-5 h-5" /> {category ? category.name : 'Back'}
        </button>

        {!verse ? (
          <div className="bg-card rounded-2xl border border-edge p-8 text-center">
            <p className="text-ink-muted text-sm">That prayer verse could not be found.</p>
            <button onClick={() => router.push('/bible')} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
              Back to the Bible
            </button>
          </div>
        ) : (
          <article className="bg-card rounded-3xl border border-edge shadow-sm overflow-hidden">
            <header className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
              <div>
                {category && (
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {category.icon} {category.name}
                  </p>
                )}
                <h1 className="font-serif-heading text-2xl font-bold text-acc-strong mt-1">{verse.reference}</h1>
                <p className="text-xs text-ink-muted mt-0.5">King James Version</p>
              </div>
              {bookmarked && <BookmarkIcon className="w-6 h-6 fill-current text-warn shrink-0" aria-label="Bookmarked" />}
            </header>

            <LongPressable
              onLongPress={() => setMenuOpen(true)}
              style={bookmarked ? { background: BOOKMARK_BG } : undefined}
              className="px-6 py-6 mx-2 rounded-2xl"
            >
              <p className="font-serif-heading text-[1.65rem] leading-[1.75] text-ink">&ldquo;{verse.text}&rdquo;</p>
            </LongPressable>
            <p className="px-6 pt-2 text-[0.6875rem] text-ink-faint">Hold the verse for a menu: copy, read aloud, bookmark</p>

            {reader.problem && (
              <p className="mx-6 mt-3 rounded-lg bg-warn-soft border border-warn-edge px-3 py-2 text-xs text-ink-soft">
                Read aloud isn&apos;t available on this device. Check that a text-to-speech voice is installed in your phone&apos;s settings.
              </p>
            )}

            <div className="px-6 py-5 flex flex-wrap gap-2.5">
              <button
                onClick={readAloud}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold',
                  reader.reading ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-soft hover:bg-card-3'
                )}
              >
                {reader.reading ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                {reader.reading ? 'Stop' : 'Read Aloud'}
              </button>
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-2 text-ink-soft text-sm font-bold hover:bg-card-3">
                {copied ? <Check className="w-4 h-4 text-acc" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => togglePrayerBookmark(verse.id, verse.reference, verse.text)}
                aria-pressed={bookmarked}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold',
                  bookmarked ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-soft hover:bg-card-3'
                )}
              >
                <BookmarkIcon className={cn('w-4 h-4', bookmarked && 'fill-current')} />
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>

            <nav className="grid grid-cols-2 border-t border-edge">
              <button
                onClick={() => previous && router.replace(PRAYER_VERSE_PATH(previous.id))}
                disabled={!previous}
                className="flex items-center justify-center gap-1 py-4 text-sm font-bold text-acc-strong hover:bg-card-2 disabled:text-ink-ghost disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => next && router.replace(PRAYER_VERSE_PATH(next.id))}
                disabled={!next}
                className="flex items-center justify-center gap-1 py-4 text-sm font-bold text-acc-strong hover:bg-card-2 border-l border-edge disabled:text-ink-ghost disabled:hover:bg-transparent"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          </article>
        )}
      </main>
      <Footer />

      <ReadAloudBar state={reader.state} label={verse ? `Reading ${verse.reference}` : 'Reading'} onPause={reader.pause} onResume={reader.resume} onStop={reader.stop} />

      {menuOpen && verse && (
        <VerseActionSheet
          title={verse.reference}
          onClose={() => setMenuOpen(false)}
          onCopy={() => copyText(formatVerse(verse.reference, 'KJV', verse.text))}
          onReadAloud={() => reader.start([{ id: verse.id, text: `${verse.reference}. ${verse.text}` }])}
          bookmarked={bookmarked}
          onToggleBookmark={() => togglePrayerBookmark(verse.id, verse.reference, verse.text)}
        />
      )}
    </>
  );
}
