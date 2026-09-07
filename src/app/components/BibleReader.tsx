'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronLeft, Volume2, Loader2, BookMarked, ListOrdered, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { speakText } from '@/lib/clientUtils';
import { loadTranslation, getChapter, type BibleVerse } from '@/lib/bible/loadTranslation';
import {
  BIBLE_TRANSLATIONS,
  DEFAULT_TRANSLATION,
  getSelectedTranslation,
  setSelectedTranslation,
  getTranslationMeta,
  type TranslationId,
} from '@/lib/bible/translations';

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

// 3-step reading flow: Book → Chapters → Verses
type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Book' },
  { n: 2, label: 'Chapters' },
  { n: 3, label: 'Verses' },
];

export default function BibleReader() {
  const [step, setStep] = useState<Step>(1);
  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Default to KJV on first load; getSelectedTranslation() only reads
  // localStorage client-side, so this stays DEFAULT_TRANSLATION during SSR.
  const [translationId, setTranslationId] = useState<TranslationId>(DEFAULT_TRANSLATION);

  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setTranslationId(getSelectedTranslation());
  }, []);

  const currentBook = BIBLE_BOOKS.find((b) => b.name === book) ?? BIBLE_BOOKS[0];
  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');
  const translationMeta = getTranslationMeta(translationId);

  const loadChapter = useCallback(async (osis: string, ch: number, translation: TranslationId) => {
    setLoading(true);
    setUnavailable(false);
    setVerses(null);
    setSelectedVerse(null);

    try {
      const data = await loadTranslation(translation);
      const chapterData = getChapter(data, osis, ch);
      if (!chapterData) throw new Error('chapter not found');
      setVerses(chapterData.verses);
    } catch {
      // Bundled local JSON failed to load/parse — a packaging problem, not a
      // network one, since there's no external API involved anymore.
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3) loadChapter(currentBook.osis, chapter, translationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, book, chapter, translationId]);

  function selectBook(name: string) {
    const b = BIBLE_BOOKS.find((x) => x.name === name);
    if (!b) return;
    setBook(name);
    setChapter(1);
    setStep(2); // go to the chapters page
  }

  function selectChapter(c: number) {
    setChapter(c);
    setStep(3); // go to the verses page
  }

  function changeTranslation(id: TranslationId) {
    setTranslationId(id);
    setSelectedTranslation(id);
  }

  function jumpToVerse(n: number) {
    setSelectedVerse(n);
    const el = verseRefs.current[n];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function readChapter() {
    if (!verses) return;
    const text = verses.map((v) => `${v.number}. ${v.text}`).join(' ');
    speakText(`${book} chapter ${chapter}. ${text}`);
  }

  return (
    <div className="space-y-4">
      {/* ── Translation picker ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-card rounded-2xl border border-edge px-4 py-3">
        <span className="text-xs font-semibold text-ink-muted">Translation</span>
        <div className="relative">
          <select
            value={translationId}
            onChange={(e) => changeTranslation(e.target.value as TranslationId)}
            className="appearance-none bg-card-2 border border-edge-strong rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-acc-strong cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {BIBLE_TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.shortName} — {t.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
        </div>
      </div>

      {/* ── Step indicator ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1.5">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                step === s.n
                  ? 'bg-emerald-600 text-white'
                  : s.n < step
                    ? 'bg-acc-soft text-acc-strong'
                    : 'bg-card-2 text-ink-muted'
              )}
            >
              <span>{s.n}</span> {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronLeft className="w-3.5 h-3.5 text-ink-faint rotate-180" />}
          </div>
        ))}
      </div>

      {/* ── PAGE 1: Choose a book ────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-card rounded-2xl border border-edge p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1">
            <BookMarked className="w-3.5 h-3.5" /> Choose a book
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Old Testament</span>
              <select
                value={currentBook.testament === 'OT' ? book : 'Genesis'}
                onChange={(e) => selectBook(e.target.value)}
                className="mt-1.5 w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {otBooks.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">New Testament</span>
              <select
                value={currentBook.testament === 'NT' ? book : ''}
                onChange={(e) => e.target.value && selectBook(e.target.value)}
                className="mt-1.5 w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="" disabled>Select book…</option>
                {ntBooks.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-ink-muted mt-3">Tap a book to see its chapters.</p>
        </div>
      )}

      {/* ── PAGE 2: Chapters by numbers ──────────────────────────── */}
      {step === 2 && (
        <div className="bg-card rounded-2xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
              <ChevronLeft className="w-4 h-4" /> Books
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
              <ListOrdered className="w-3.5 h-3.5" /> Chapters of {book}
            </p>
            <span className="text-xs font-semibold text-ink-muted">{currentBook.chapters} chapters</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
            {range(currentBook.chapters).map((c) => (
              <button
                key={c}
                onClick={() => selectChapter(c)}
                className="grid h-10 place-items-center rounded-lg bg-card-2 text-ink-soft text-sm font-bold transition-all hover:bg-acc-soft hover:text-acc-strong"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PAGE 3: Verses by numbers + reading pane ─────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Verses as numbers */}
          <div className="bg-card rounded-2xl border border-edge p-5">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
                <ChevronLeft className="w-4 h-4" /> Chapters
              </button>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" /> Verses in {book} {chapter}
              </p>
              <span className="text-xs font-semibold text-ink-muted">{verses?.length ?? '…'} verses</span>
            </div>
            {verses && !loading ? (
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                {verses.map((v) => (
                  <button
                    key={v.number}
                    onClick={() => jumpToVerse(v.number)}
                    className={cn(
                      'grid h-9 place-items-center rounded-lg text-xs font-bold transition-all',
                      selectedVerse === v.number ? 'bg-warn text-white' : 'bg-card-2 text-ink-muted hover:text-ink hover:bg-card-3'
                    )}
                  >
                    {v.number}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Loading verse numbers…</p>
            )}
          </div>

          {/* Reading pane */}
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
                  <p className="text-[11px] text-ink-muted">{translationMeta.name}</p>
                </div>
              </div>
              {verses && !loading && (
                <button onClick={readChapter} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-card-2 text-ink-soft rounded-lg text-xs font-bold hover:bg-card-3">
                  <Volume2 className="w-4 h-4" /> Read aloud
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Loading {book} {chapter}…</p>
              </div>
            ) : unavailable ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-8 h-8 text-warn mx-auto mb-2" />
                <p className="text-ink-muted text-sm">This translation is unavailable, please reinstall the app.</p>
                <button onClick={() => loadChapter(currentBook.osis, chapter, translationId)} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
                  Retry
                </button>
              </div>
            ) : verses ? (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {verses.map((v) => (
                  <div
                    key={v.number}
                    ref={(el) => {
                      verseRefs.current[v.number] = el;
                    }}
                    className={cn(
                      'rounded-xl px-3 py-2 -mx-1 transition-colors',
                      selectedVerse === v.number ? 'bg-warn-soft ring-1 ring-warn-edge' : 'hover:bg-card-2'
                    )}
                  >
                    <p className="text-[15px] leading-relaxed text-ink-soft">
                      <sup className="mr-1.5 font-serif-heading font-bold text-acc-strong">{v.number}</sup>
                      {v.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
