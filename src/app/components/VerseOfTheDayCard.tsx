'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Sparkles, Square } from 'lucide-react';
import { cn } from '../utils/cn';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { loadTranslation, getChapter } from '@/lib/bible/loadTranslation';
import { parseReferenceInput } from '@/lib/bible/reference';
import { getSelectedTranslation, getTranslationMeta, DEFAULT_TRANSLATION, type TranslationId } from '@/lib/bible/translations';
import { useReadAloud } from '@/lib/useReadAloud';
import ReadAloudBar from './ReadAloudBar';

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

// Same keys the Bible reader uses to remember where it was (see BibleReader / bible page).
const POSITION_KEY = 'pfm_bible_position';
const TAB_KEY = 'pfm_bible_tab';

/**
 * Today's verse (the same one as the daily pop-up) in the chosen translation, with a
 * "Read" button (opens its chapter in the Bible) and a "Listen" button (reads it aloud).
 * `showRead={false}` is for the Bible page itself, where the reader is already on screen.
 */
export default function VerseOfTheDayCard({ showRead = true }: { showRead?: boolean }) {
  const router = useRouter();
  const reader = useReadAloud();
  const verse = useMemo(() => KJV_BIBLE_VERSES[dayOfYear(new Date()) % KJV_BIBLE_VERSES.length], []);
  const parsed = useMemo(() => parseReferenceInput(verse.reference), [verse.reference]);

  const [translationId, setTranslationId] = useState<TranslationId>(DEFAULT_TRANSLATION);
  const [loaded, setLoaded] = useState<{ id: TranslationId; text: string } | null>(null);

  useEffect(() => {
    // The saved translation is only readable on the client, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslationId(getSelectedTranslation());
  }, []);

  useEffect(() => {
    if (!parsed || parsed.chapter === null || parsed.verse === null) return;
    const { chapter, verse: start } = parsed;
    const end = parsed.verseEnd ?? start;
    let cancelled = false;
    loadTranslation(translationId)
      .then((data) => {
        if (cancelled) return;
        const ch = getChapter(data, parsed.book.osis, chapter);
        const text = ch?.verses.filter((v) => v.number >= start && v.number <= end).map((v) => v.text).join(' ');
        if (text) setLoaded({ id: translationId, text });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [parsed, translationId]);

  const text = loaded && loaded.id === translationId ? loaded.text : verse.text;
  const shown = loaded && loaded.id === translationId ? getTranslationMeta(translationId).shortName : 'KJV';

  function open() {
    if (parsed?.chapter && parsed.verse) router.push(`/bible/verse/${parsed.book.osis}/${parsed.chapter}/${parsed.verse}`);
  }

  // Opens the Bible reader on this verse's chapter, with the verse selected.
  function readInBible() {
    if (!parsed?.chapter) return;
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ step: 3, book: parsed.book.name, chapter: parsed.chapter, verse: parsed.verse ?? undefined }));
      sessionStorage.setItem(TAB_KEY, 'read');
    } catch {
      // ignore: the Bible then simply opens at its last place
    }
    router.push('/bible');
  }

  return (
    <section className="mb-5 rounded-2xl border border-warn-edge bg-gradient-to-br from-warn-soft to-acc-soft p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-warn-strong mb-2">
        <Sparkles className="w-3.5 h-3.5" /> Verse of the Day
      </p>
      <button onClick={open} className="block w-full text-left">
        <p className="font-serif-heading text-base leading-relaxed text-ink italic">&ldquo;{text}&rdquo;</p>
        <p className="mt-1.5 text-xs font-bold text-acc-strong">
          {verse.reference} <span className="text-ink-muted font-medium">· {shown}</span>
        </p>
      </button>
      <div className="mt-3 flex gap-2">
        {showRead && (
          <button
            onClick={readInBible}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border border-acc-edge bg-card text-acc-strong text-sm font-bold active:scale-95"
          >
            <BookOpen className="w-4 h-4" /> Read
          </button>
        )}
        <button
          onClick={() => (reader.reading ? reader.stop() : reader.start([{ id: 'votd', text: `${verse.reference}. ${text}` }]))}
          aria-label={reader.reading ? 'Stop listening' : 'Listen to the verse of the day'}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-white text-sm font-bold active:scale-95',
            reader.reading ? 'bg-ink' : 'bg-emerald-600 hover:bg-emerald-500'
          )}
        >
          {reader.reading ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          {reader.reading ? 'Stop' : 'Listen'}
        </button>
      </div>
      <ReadAloudBar state={reader.state} label="Reading the verse of the day" onPause={reader.pause} onResume={reader.resume} onStop={reader.stop} />
    </section>
  );
}
