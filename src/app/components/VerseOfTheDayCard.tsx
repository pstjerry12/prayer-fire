'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Square, Volume2 } from 'lucide-react';
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

/** Today's verse (the same one as the daily pop-up), shown at the top of the Bible in the chosen translation. */
export default function VerseOfTheDayCard() {
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

  return (
    <section className="mb-5 rounded-2xl border border-warn-edge bg-warn-soft p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-warn-strong">
          <Sparkles className="w-3.5 h-3.5" /> Verse of the Day
        </p>
        <button
          onClick={() => (reader.reading ? reader.stop() : reader.start([{ id: 'votd', text: `${verse.reference}. ${text}` }]))}
          aria-label={reader.reading ? 'Stop reading' : 'Read the verse of the day aloud'}
          className={cn('grid h-8 w-8 place-items-center rounded-lg', reader.reading ? 'bg-emerald-600 text-white' : 'bg-card text-ink-soft border border-edge')}
        >
          {reader.reading ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
      <button onClick={open} className="block w-full text-left">
        <p className="font-serif-heading text-base leading-relaxed text-ink italic">&ldquo;{text}&rdquo;</p>
        <p className="mt-1.5 text-xs font-bold text-acc-strong">
          {verse.reference} <span className="text-ink-muted font-medium">· {shown}</span>
        </p>
      </button>
      <ReadAloudBar state={reader.state} label="Reading the verse of the day" onPause={reader.pause} onResume={reader.resume} onStop={reader.stop} />
    </section>
  );
}
