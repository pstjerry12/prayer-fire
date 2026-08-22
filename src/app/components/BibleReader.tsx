'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, Volume2, Square, Loader2, Copy, Check, Heart, Share2, WifiOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { speakText, stopSpeech } from '@/lib/clientUtils';

interface BibleVerseText {
  verse: number;
  text: string;
}

const CACHE_KEY = (slug: string, chapter: number) => `upp_bible_kjv_${slug}_${chapter}`;

function cacheGet(slug: string, chapter: number): BibleVerseText[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(slug, chapter));
    return raw ? (JSON.parse(raw) as BibleVerseText[]) : null;
  } catch {
    return null;
  }
}

function cacheSet(slug: string, chapter: number, verses: BibleVerseText[]) {
  try {
    localStorage.setItem(CACHE_KEY(slug, chapter), JSON.stringify(verses));
  } catch {
    // ignore quota errors
  }
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export default function BibleReader() {
  const [book, setBook] = useState<string>('John');
  const [chapter, setChapter] = useState(3);
  const [verses, setVerses] = useState<BibleVerseText[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testament, setTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [offline, setOffline] = useState(false);

  const currentBook = BIBLE_BOOKS.find((b) => b.name === book) ?? BIBLE_BOOKS[42];

  const loadChapter = useCallback(async (slug: string, ch: number) => {
    setLoading(true);
    setError('');
    setOffline(false);
    setVerses(null);

    // 1. Try the local cache first (works offline).
    const cached = cacheGet(slug, ch);
    if (cached) {
      setVerses(cached);
      setLoading(false);
      return;
    }

    // 2. Fetch from the public-domain KJV API.
    try {
      const res = await fetch(
        `https://bible-api.com/${encodeURIComponent(slug)}+${ch}?translation=kjv`
      );
      if (!res.ok) throw new Error('not found');
      const data = (await res.json()) as {
        verses?: { verse: number; text: string }[];
      };
      const list: BibleVerseText[] = (data.verses ?? []).map((v) => ({
        verse: v.verse,
        text: (v.text || '').replace(/\s+/g, ' ').trim(),
      }));
      if (list.length === 0) throw new Error('empty');
      setVerses(list);
      cacheSet(slug, ch, list);
    } catch {
      setError("Couldn't load this chapter. Check your internet connection and try again.");
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (book) loadChapter(currentBook.slug, chapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter]);

  function selectBook(name: string) {
    const b = BIBLE_BOOKS.find((x) => x.name === name);
    setBook(name);
    setChapter(1);
    if (b) loadChapter(b.slug, 1);
  }

  function prevChapter() {
    if (chapter > 1) setChapter(chapter - 1);
  }
  function nextChapter() {
    if (chapter < currentBook.chapters) setChapter(chapter + 1);
  }

  function readChapter() {
    if (!verses) return;
    const text = verses.map((v) => `${v.verse}. ${v.text}`).join(' ');
    speakText(`${book} chapter ${chapter}. ${text}`);
  }

  const books = BIBLE_BOOKS.filter((b) => testament === 'ALL' || b.testament === testament);

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      {/* ── Book list ─────────────────────────────────────────────── */}
      <aside className="bg-card rounded-2xl border border-edge p-3 md:max-h-[70vh] md:overflow-y-auto">
        <div className="flex gap-1 mb-2">
          {(['ALL', 'OT', 'NT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTestament(t)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                testament === t ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-muted'
              )}
            >
              {t === 'ALL' ? 'All' : t}
            </button>
          ))}
        </div>
        <div className="space-y-0.5">
          {books.map((b) => (
            <button
              key={b.name}
              onClick={() => selectBook(b.name)}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-all',
                book === b.name ? 'bg-acc-soft text-acc-strong font-semibold' : 'text-ink-soft hover:bg-card-2'
              )}
            >
              <span className="truncate">{b.name}</span>
              <span className="text-[10px] text-ink-faint ml-1">{b.chapters}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chapter reading pane ──────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-edge p-5">
        <div className="flex items-center justify-between gap-2 border-b border-edge pb-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-acc-soft text-acc shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif-heading text-lg font-bold text-ink truncate">
                {book} {chapter}
              </h2>
              <p className="text-[11px] text-ink-muted">King James Version</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevChapter} disabled={chapter === 1} className="p-2 text-ink-muted hover:text-acc disabled:opacity-30" title="Previous chapter">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-ink-muted whitespace-nowrap">
              {chapter}/{currentBook.chapters}
            </span>
            <button onClick={nextChapter} disabled={chapter === currentBook.chapters} className="p-2 text-ink-muted hover:text-acc disabled:opacity-30 rotate-180" title="Next chapter">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chapter picker */}
        <div className="flex flex-wrap gap-1 mb-4">
          {range(currentBook.chapters).map((c) => (
            <button
              key={c}
              onClick={() => setChapter(c)}
              className={cn(
                'grid h-7 min-w-7 px-1 place-items-center rounded-md text-[11px] font-semibold transition-all',
                c === chapter ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-muted hover:text-ink'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading {book} {chapter}…</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <WifiOff className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-ink-muted text-sm">{error}</p>
            <button onClick={() => loadChapter(currentBook.slug, chapter)} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
              Retry
            </button>
          </div>
        ) : verses ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {verses.map((v) => (
              <VerseRow key={v.verse} verse={v.verse} text={v.text} />
            ))}
            <button onClick={readChapter} className="w-full py-2.5 bg-card-2 text-ink-soft rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-card-3 mt-2">
              <Volume2 className="w-4 h-4" /> Read this chapter aloud
            </button>
          </div>
        ) : null}

        {offline && verses && (
          <p className="flex items-center gap-1.5 text-[11px] text-warn-strong mt-3">
            <WifiOff className="w-3.5 h-3.5" /> Showing saved copy (offline)
          </p>
        )}
      </div>
    </div>
  );
}

function VerseRow({ verse, text }: { verse: number; text: string }) {
  const [copied, setCopied] = useState(false);
  const [fav, setFav] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(`${verse}. ${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function speak() {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
    } else {
      speakText(`${verse}. ${text}`);
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), 12000);
    }
  }

  return (
    <div className="group rounded-xl px-1 -mx-1 hover:bg-card-2">
      <p className="text-[15px] leading-relaxed text-ink-soft">
        <sup className="mr-1.5 font-serif-heading font-bold text-acc-strong">{verse}</sup>
        {text}
      </p>
      <div className="flex gap-3 mt-0.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink">
          {copied ? <Check className="w-3 h-3 text-acc" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={speak} className={cn('flex items-center gap-1 text-[11px]', speaking ? 'text-acc' : 'text-ink-muted hover:text-ink')}>
          {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />} {speaking ? 'Stop' : 'Listen'}
        </button>
        <button onClick={() => setFav((f) => !f)} className={cn('flex items-center gap-1 text-[11px]', fav ? 'text-danger' : 'text-ink-muted hover:text-ink')}>
          <Heart className={cn('w-3 h-3', fav && 'fill-red-500')} /> {fav ? 'Saved' : 'Save'}
        </button>
        <button onClick={() => navigator.share?.({ title: `Bible`, text: `${verse}. ${text}` })} className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink">
          <Share2 className="w-3 h-3" /> Share
        </button>
      </div>
    </div>
  );
}
