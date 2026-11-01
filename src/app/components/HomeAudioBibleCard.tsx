'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { loadTranslation, getChapter, type BibleVerse } from '@/lib/bible/loadTranslation';
import { getSelectedTranslation } from '@/lib/bible/translations';
import { FIRST_PLACE, getLastPlace, nextChapter, placeLabel, saveLastPlace, type LastPlace } from '@/lib/bibleLastPlace';
import { readItems, type ReadController, type ReaderState } from '@/lib/readAloud';

/**
 * Home screen: the "Audio Bible" tile. One tap starts reading aloud straight away, from where the person stopped
 * (or John 1 the first time); tap again to pause or resume. Everything is on the phone: the Bible text is bundled and
 * the voice is the phone's own, so it works without internet. The tile is a grid item (the home screen's 2x2 grid).
 */
export default function HomeAudioBibleCard() {
  const [place, setPlace] = useState<LastPlace | null>(null);
  const [state, setState] = useState<ReaderState>('idle');
  const [nowVerse, setNowVerse] = useState<number | null>(null);
  const [problem, setProblem] = useState(false);
  const controller = useRef<ReadController | null>(null);
  // The chapter text for the saved place, loaded ahead of time so the first tap can start speaking at once.
  const loaded = useRef<{ key: string; verses: BibleVerse[] } | null>(null);

  const current = place ?? FIRST_PLACE;

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
          // Finished the chapter: the tile now offers the next one.
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

  const reading = state !== 'idle';
  const title = reading ? (state === 'playing' ? 'Pause' : 'Resume') : 'Audio Bible';
  const detail = reading
    ? `${placeLabel(current)}${nowVerse ? `:${nowVerse}` : ''}`
    : place
      ? placeLabel(current)
      : `Start at ${placeLabel(FIRST_PLACE)}`;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => (state === 'playing' ? controller.current?.pause() : state === 'paused' ? controller.current?.resume() : play())}
          aria-label={
            reading
              ? state === 'playing' ? 'Pause the Bible reading' : 'Resume the Bible reading'
              : place ? `Audio Bible, continue ${placeLabel(current)}` : 'Audio Bible, start listening'
          }
          className="flex h-full min-h-[3.75rem] w-full items-center gap-3 rounded-2xl bg-card border border-edge p-3 text-left active:scale-[0.98] transition-transform"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acc text-on-acc">
            {state === 'playing' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-bold leading-tight text-heading">{title}</span>
            <span className="block truncate text-xs font-semibold text-ink-muted">{detail}</span>
          </span>
        </button>
        {reading && (
          <button
            onClick={() => controller.current?.stop()}
            aria-label="Stop the Bible reading"
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-ink text-page active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>
      {problem && (
        <p role="alert" className="col-span-2 text-xs text-danger">
          Could not play right now. Open the Bible to read, or check the phone&apos;s text-to-speech voice.
        </p>
      )}
    </>
  );
}
