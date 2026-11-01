'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bookmark as BookmarkIcon, Check, ChevronLeft, ChevronRight, Copy, Loader2, Share2, Square, Volume2 } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { loadTranslation, getChapter } from '@/lib/bible/loadTranslation';
import { getSelectedTranslation, getTranslationMeta, type TranslationId } from '@/lib/bible/translations';
import { formatVerse, isVerseBookmarked, toggleBookmarks, useStudy, type VerseInfo } from '@/lib/study';
import { copyText } from '@/lib/clipboard';
import { useReadAloud } from '@/lib/useReadAloud';
import ReadAloudBar from '@/app/components/ReadAloudBar';

/** One verse on its own page — opened by tapping a verse in the Bible reader. */
export default function VersePage() {
  const params = useParams<{ osis: string; chapter: string; verse: string }>();
  const router = useRouter();
  const study = useStudy();
  const reader = useReadAloud();

  const osis = decodeURIComponent(params.osis ?? '');
  const chapter = parseInt(params.chapter ?? '', 10);
  const verseNumber = parseInt(params.verse ?? '', 10);
  const book = BIBLE_BOOKS.find((b) => b.osis === osis);

  const [translationId, setTranslationId] = useState<TranslationId>('kjv');
  const [verseCount, setVerseCount] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // The saved translation is only readable on the client, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslationId(getSelectedTranslation());
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Reset for the newly selected verse before its text loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState('loading');
    loadTranslation(translationId)
      .then((data) => {
        if (cancelled) return;
        const ch = getChapter(data, osis, chapter);
        const v = ch?.verses.find((x) => x.number === verseNumber);
        if (!ch || !v) {
          setState('missing');
          return;
        }
        setVerseCount(ch.verses.length);
        setText(v.text);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [translationId, osis, chapter, verseNumber]);

  const reference = book ? `${book.name} ${chapter}:${verseNumber}` : '';
  const shortName = getTranslationMeta(translationId).shortName;
  const info: VerseInfo | null = text
    ? { translationId, osis, chapter, verse: verseNumber, reference, text }
    : null;
  const saved = isVerseBookmarked(study, { translationId, osis, chapter, verse: verseNumber });

  function goToVerse(n: number) {
    router.replace(`/bible/verse/${osis}/${chapter}/${n}`);
  }

  function handleSpeak() {
    if (!text) return;
    if (reader.reading) reader.stop();
    else reader.start([{ id: verseNumber, text: `${reference}. ${text}` }]);
  }

  async function handleCopy() {
    if (!text) return;
    if (await copyText(formatVerse(reference, shortName, text))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function handleBookmark() {
    if (info) toggleBookmarks([info]);
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> {book ? `${book.name} ${chapter}` : 'Back'}
        </button>

        {!book || !Number.isFinite(chapter) || !Number.isFinite(verseNumber) || state === 'missing' ? (
          <div className="bg-card rounded-2xl border border-edge p-8 text-center">
            <p className="text-ink-muted text-sm">That verse could not be found.</p>
            <button onClick={() => router.push('/bible')} className="mt-4 px-4 py-2 bg-acc text-on-acc rounded-lg text-sm font-bold">
              Open the Bible
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-edge flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-serif-heading text-xl font-bold text-ink truncate">{reference}</h1>
                <p className="text-[0.6875rem] text-ink-muted">{getTranslationMeta(translationId).name}</p>
              </div>
              <button
                onClick={handleBookmark}
                aria-pressed={saved}
                aria-label={saved ? 'Remove bookmark' : 'Bookmark this verse'}
                className={cn(
                  'shrink-0 p-2.5 rounded-xl border transition-all active:scale-95',
                  saved ? 'bg-acc text-on-acc border-acc' : 'bg-card-2 text-ink-soft border-edge hover:bg-card-3'
                )}
              >
                <BookmarkIcon className={cn('w-5 h-5', saved && 'fill-current')} />
              </button>
            </div>

            <div className="px-6 py-8">
              {state === 'loading' ? (
                <div className="flex justify-center py-8 text-ink-muted">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <p className="font-serif-heading text-xl leading-relaxed text-ink">&ldquo;{text}&rdquo;</p>
              )}
            </div>

            {reader.problem && (
              <p className="mx-5 mb-3 rounded-lg bg-acc-soft border border-acc-edge px-3 py-2 text-xs text-ink-soft">
                Read aloud couldn&apos;t start on this device. Check that a text-to-speech voice is installed and your media volume is up.
                <span className="block mt-1 text-[0.6875rem] text-ink-muted break-words">Details: {reader.problemDetail ?? 'no voice available'}</span>
              </p>
            )}

            <div className="px-5 pb-5 flex flex-wrap gap-2">
              <button
                onClick={handleSpeak}
                disabled={state !== 'ready'}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold disabled:opacity-50',
                  reader.reading ? 'bg-acc text-on-acc' : 'bg-card-2 text-ink-soft hover:bg-card-3'
                )}
              >
                {reader.reading ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                {reader.reading ? 'Stop' : 'Read Aloud'}
              </button>
              <button
                onClick={handleCopy}
                disabled={state !== 'ready'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card-2 text-ink-soft text-xs font-bold hover:bg-card-3 disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-acc-strong" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {canShare && (
                <button
                  onClick={() => text && navigator.share({ title: reference, text: formatVerse(reference, shortName, text) }).catch(() => {})}
                  disabled={state !== 'ready'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card-2 text-ink-soft text-xs font-bold hover:bg-card-3 disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 border-t border-edge">
              <button
                onClick={() => goToVerse(verseNumber - 1)}
                disabled={verseNumber <= 1}
                className="flex items-center justify-center gap-1 py-3.5 text-sm font-bold text-acc-strong hover:bg-card-2 disabled:text-ink-ghost disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" /> Previous verse
              </button>
              <button
                onClick={() => goToVerse(verseNumber + 1)}
                disabled={verseCount === null || verseNumber >= verseCount}
                className="flex items-center justify-center gap-1 py-3.5 text-sm font-bold text-acc-strong hover:bg-card-2 border-l border-edge disabled:text-ink-ghost disabled:hover:bg-transparent"
              >
                Next verse <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <ReadAloudBar state={reader.state} label={`Reading ${reference}`} onPause={reader.pause} onResume={reader.resume} onStop={reader.stop} />
    </>
  );
}
