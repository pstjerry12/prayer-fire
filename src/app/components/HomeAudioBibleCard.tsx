'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Headphones, Pause, Play, Square } from 'lucide-react';
import { cn } from '../utils/cn';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { loadTranslation, getChapter, type BibleVerse } from '@/lib/bible/loadTranslation';
import { getSelectedTranslation } from '@/lib/bible/translations';
import { FIRST_PLACE, getLastPlace, nextChapter, placeLabel, saveLastPlace, type LastPlace } from '@/lib/bibleLastPlace';
import { readItems, type ReadController, type ReaderState } from '@/lib/readAloud';

// The same keys the Bible reader uses to open on a given chapter (see BibleReader / VerseOfTheDayCard).
const POSITION_KEY = 'pfm_bible_position';
const TAB_KEY = 'pfm_bible_tab';

/**
 * Home screen: listen to the Bible. The main button starts reading aloud straight away, from where the person
 * stopped (or John 1 the first time). Everything is on the phone: the Bible text is bundled and the voice is the
 * phone's own, so it works without internet. "Bible" opens the full reader on the same chapter.
 */
export default function HomeAudioBibleCard() {
  const router = useRouter();
  const [place, setPlace] = useState<LastPlace | null>(null);
  const [state, setState] = useState<ReaderState>('idle');
  const [nowVerse, setNowVerse] = useState<number | null>(null);
  const [problem, setProblem] = useState(false);
  const controller = useRef<ReadController | null>(null);
  // The chapter text for the saved place, loaded ahead of time so the first tap can start speaking at once.
  const loaded = useRef<{ key: string; verses: BibleVerse[] } | null>(null);

  const current = place ?? FIRST_PLACE;
  const key = `${current.book}|${current.chapter}`;

  const loadChapter = useCallback(async (p: LastPlace) => {
    const book = BIBLE_BOOKS.find((b) => b.name === p.book);
    if (!book) return null;
    const data = await loadTranslation(getSelectedTranslation());
    const verses = getChapter(data, book.osis, p.chapter)?.verses ?? null;
    if (verses) loaded.current = { key: `${p.book}|${p.chapter}`, verses };
    return verses;
  }, []);

  useEffect(() => {
    // The saved place is only readable on the client, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlace(getLastPlace());
  }, []);

  useEffect(() => {
    loadChapter(current).catch(() => {});
  }, [current, loadChapter]);

  // Stop reading if the person leaves the home screen.
  useEffect(() => () => controller.current?.stop(), []);

  async function play() {
    setProblem(false);
    const start = place ?? FIRST_PLACE;
    let verses = loaded.current?.key === `${start.book}|${start.chapter}` ? loaded.current.verses : null;
    if (!verses) verses = await loadChapter(start).catch(() => null);
    if (!verses || verses.length === 0) {
      setProblem(true);
      return;
    }
    // Resume at the verse they stopped on (a little before it is not needed: the verse is read whole).
    const from = start.verse && start.verse > 1 ? start.verse : 0;
    const items = verses.filter((v) => v.number >= from).map((v) => ({ id: v.number, text: v.text }));
    if (!from) items.unshift({ id: 0, text: `${start.book} chapter ${start.chapter}.` });

    controller.current = readItems(items, {
      onItemStart: (_i, item) => {
        const n = typeof item.id === 'number' ? item.id : 0;
        setNowVerse(n > 0 ? n : null);
        if (n > 0) saveLastPlace({ book: start.book, chapter: start.chapter, verse: n });
      },
      onStateChange: setState,
      onEnd: (reason) => {
        setNowVerse(null);
        controller.current = null;
        if (reason === 'done') {
          // Finished the chapter: "Continue" now offers the next one.
          const next = nextChapter(start);
          if (next) {
            saveLastPlace(next);
            setPlace(next);
          }
        } else if (reason === 'unsupported' || reason === 'error') {
          setProblem(true);
        }
      },
    });
  }

  function openBible() {
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ step: 3, book: current.book, chapter: current.chapter, verse: current.verse }));
      sessionStorage.setItem(TAB_KEY, 'read');
    } catch {
      // ignore: the Bible then opens where it last was
    }
    router.push('/bible');
  }

  const reading = state !== 'idle';
  const detail = reading
    ? `${state === 'paused' ? 'Paused' : 'Reading'} ${current.book} ${current.chapter}${nowVerse ? `:${nowVerse}` : ''}`
    : place
      ? placeLabel(current)
      : `Start with ${placeLabel(FIRST_PLACE)}`;

  return (
    <section className="rounded-2xl border border-warn-edge bg-gradient-to-br from-warn-soft to-card px-3 pt-2.5 pb-3 shadow-sm" aria-label="Audio Bible">
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-warn-strong">
        <Headphones className="w-3.5 h-3.5" /> Listen to the Bible
        <span className="normal-case tracking-normal font-semibold text-ink-muted">· works offline</span>
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => (state === 'playing' ? controller.current?.pause() : state === 'paused' ? controller.current?.resume() : play())}
          aria-label={reading ? (state === 'playing' ? 'Pause the Bible reading' : 'Resume the Bible reading') : place ? 'Continue where you stopped' : 'Start listening to the Bible'}
          className="flex-1 min-w-0 flex items-center gap-2.5 h-[3.25rem] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white pl-2.5 pr-3 text-left active:scale-[0.98]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20">
            {state === 'playing' ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight truncate">{reading ? (state === 'playing' ? 'Pause' : 'Resume') : place ? 'Continue where you stopped' : 'Listen to the Bible'}</span>
            <span className="block text-xs font-semibold text-white/85 leading-tight truncate">{detail}</span>
          </span>
        </button>
        {reading && (
          <button onClick={() => controller.current?.stop()} aria-label="Stop" className="grid h-[3.25rem] w-11 shrink-0 place-items-center rounded-xl bg-ink text-white active:scale-95">
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
        <button
          onClick={openBible}
          aria-label="Open the full Bible"
          className={cn('flex h-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-acc-edge bg-card text-acc-strong text-xs font-bold active:scale-95', reading ? 'w-14' : 'w-[4.5rem]')}
        >
          <BookOpen className="w-4 h-4" /> Bible
        </button>
      </div>
      {problem && <p role="alert" className="mt-1.5 text-xs text-danger">Could not play right now. Open the Bible to read, or check the phone&apos;s text-to-speech voice.</p>}
    </section>
  );
}
