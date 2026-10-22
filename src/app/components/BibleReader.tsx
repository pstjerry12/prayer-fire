'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, ChevronLeft, Volume2, Square, Loader2, BookMarked, ListOrdered, AlertTriangle, ChevronDown, Bookmark as BookmarkIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { pushBackHandler } from '@/lib/backHandlerStack';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { speakText, stopSpeech } from '@/lib/readAloud';
import { bibleBookmarkKey, useBookmarks } from '@/lib/bookmarks';
import LongPressable from './LongPressable';
import VerseActionBar from './VerseActionBar';
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

// 3-step reading flow: Book → Chapters → Verses. Every step stays tappable at
// all times (e.g. Book → pick again → jump straight back to Chapters/Verses).
type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Book' },
  { n: 2, label: 'Chapters' },
  { n: 3, label: 'Verses' },
];

// Where the reader was, kept for this session only, so coming back from a
// verse page (or the Bookmarks tab) lands on the same chapter instead of the book list.
const POSITION_KEY = 'pfm_bible_position';

interface SavedPosition {
  step: Step;
  book: string;
  chapter: number;
  verse: number | null;
}

function readPosition(): SavedPosition | null {
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedPosition;
    if (!BIBLE_BOOKS.some((b) => b.name === p.book)) return null;
    return p;
  } catch {
    return null;
  }
}

export default function BibleReader() {
  const router = useRouter();
  const { isBookmarked, toggle } = useBookmarks();
  const [heldVerse, setHeldVerse] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [restoredVerse, setRestoredVerse] = useState<number | null>(null);
  const [speechProblem, setSpeechProblem] = useState(false);
  // True once the saved reading position (if any) has been applied; until then we
  // must not overwrite it with the default Genesis 1 screen.
  const [positionLoaded, setPositionLoaded] = useState(false);
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
    const saved = readPosition();
    if (saved) {
      setBook(saved.book);
      setChapter(saved.chapter);
      setStep(saved.step);
      setRestoredVerse(saved.verse);
    }
    setPositionLoaded(true);
  }, []);

  // Stop reading when leaving the page.
  useEffect(() => () => stopSpeech(), []);

  function savePosition(verse: number | null) {
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ step, book, chapter, verse } satisfies SavedPosition));
    } catch {
      // ignore
    }
  }

  // Remember the step/book/chapter whenever they change.
  useEffect(() => {
    if (positionLoaded) savePosition(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionLoaded, step, book, chapter]);

  const currentBook = BIBLE_BOOKS.find((b) => b.name === book) ?? BIBLE_BOOKS[0];
  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');
  const translationMeta = getTranslationMeta(translationId);

  const loadChapter = useCallback(async (osis: string, ch: number, translation: TranslationId) => {
    setLoading(true);
    setUnavailable(false);
    setVerses(null);
    setSelectedVerse(null);
    setHeldVerse(null);
    stopSpeech();
    setSpeaking(false);

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

  // Coming back from a verse page: scroll to the verse that was opened.
  useEffect(() => {
    if (!verses || restoredVerse == null) return;
    setSelectedVerse(restoredVerse);
    const t = setTimeout(() => {
      verseRefs.current[restoredVerse]?.scrollIntoView({ block: 'center' });
    }, 50);
    setRestoredVerse(null);
    return () => clearTimeout(t);
  }, [verses, restoredVerse]);

  // Let the hardware/gesture back button step back through Verses → Chapters
  // → Book one level at a time instead of falling straight through to the
  // app-wide exit prompt — this stays registered only while there's
  // somewhere to go (step > 1); at the Book screen it releases the press so
  // it acts on the rest of the app normally.
  useEffect(() => {
    if (step === 1) return;
    return pushBackHandler(() => {
      setStep((s) => (s - 1) as Step);
      return true;
    });
  }, [step]);

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
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    const text = verses.map((v) => `${v.number}. ${v.text}`).join(' ');
    setSpeaking(true);
    speakText(`${book} chapter ${chapter}. ${text}`, {
      onEnd: (reason) => {
        setSpeaking(false);
        if (reason === 'unsupported' || reason === 'error') {
          setSpeechProblem(true);
        }
      },
    });
    setSpeechProblem(false);
  }

  function openVerse(n: number) {
    stopSpeech();
    savePosition(n);
    router.push(`/bible/verse/${currentBook.osis}/${chapter}/${n}`);
  }

  function bookmarkFor(v: BibleVerse) {
    return {
      key: bibleBookmarkKey(translationId, currentBook.osis, chapter, v.number),
      kind: 'bible' as const,
      reference: `${book} ${chapter}:${v.number}`,
      text: v.text,
      translation: translationMeta.shortName,
      osis: currentBook.osis,
      chapter,
      verse: v.number,
    };
  }

  return (
    <div className="space-y-4">
      {/* ── Translation picker ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-card rounded-2xl border border-edge px-4 py-3">
        <span className="text-xs font-semibold text-ink-muted">Translation</span>
        <div className="relative min-w-0">
          <select
            value={translationId}
            onChange={(e) => changeTranslation(e.target.value as TranslationId)}
            className="appearance-none bg-card-2 border border-edge-strong rounded-lg pl-3 pr-8 py-2 max-w-full truncate text-sm font-bold text-acc-strong cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {BIBLE_TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.shortName} — {t.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
        </div>
      </div>

      {/* ── Step indicator ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1.5">
            <button
              onClick={() => setStep(s.n)}
              aria-current={step === s.n ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                step === s.n
                  ? 'bg-emerald-600 text-white'
                  : 'bg-acc-soft text-acc-strong hover:brightness-95 active:scale-95'
              )}
            >
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronLeft className="w-3.5 h-3.5 text-ink-faint rotate-180" />}
          </div>
        ))}
      </div>

      {/* ── PAGE 1: Choose a book ────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-card rounded-2xl border border-edge p-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1">
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
          <p className="text-[0.6875rem] text-ink-muted mt-3">Tap a book to see its chapters.</p>
        </div>
      )}

      {/* ── PAGE 2: Chapters by numbers ──────────────────────────── */}
      {step === 2 && (
        <div className="bg-card rounded-2xl border border-edge p-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
              <ChevronLeft className="w-4 h-4" /> Books
            </button>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
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
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
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
                  <p className="text-[0.6875rem] text-ink-muted">{translationMeta.name}</p>
                </div>
              </div>
              {verses && !loading && (
                <button
                  onClick={readChapter}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold',
                    speaking ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-soft hover:bg-card-3'
                  )}
                >
                  {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  {speaking ? 'Stop' : 'Read aloud'}
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
              <>
              {speechProblem && (
                <p className="mb-3 rounded-lg bg-warn-soft border border-warn-edge px-3 py-2 text-xs text-ink-soft">
                  Read aloud isn&apos;t available on this device. Check that a text-to-speech voice is installed in your phone&apos;s settings.
                </p>
              )}
              <p className="mb-3 text-[0.6875rem] text-ink-muted">
                Tap a verse to open it · hold a verse for 2 seconds to copy or bookmark it
              </p>
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {verses.map((v) => {
                  const held = heldVerse === v.number;
                  const saved = isBookmarked(bibleBookmarkKey(translationId, currentBook.osis, chapter, v.number));
                  return (
                    <div
                      key={v.number}
                      ref={(el) => {
                        verseRefs.current[v.number] = el;
                      }}
                    >
                      <LongPressable
                        onTap={() => {
                          if (held) setHeldVerse(null);
                          else openVerse(v.number);
                        }}
                        onLongPress={() => setHeldVerse(v.number)}
                        className={cn(
                          'rounded-xl px-3 py-2 -mx-1 transition-colors',
                          held
                            ? 'bg-warn-soft ring-2 ring-warn-edge'
                            : selectedVerse === v.number
                              ? 'bg-warn-soft ring-1 ring-warn-edge'
                              : 'hover:bg-card-2'
                        )}
                      >
                        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                          <sup className="mr-1.5 font-serif-heading font-bold text-acc-strong">{v.number}</sup>
                          {v.text}
                          {saved && <BookmarkIcon className="inline-block ml-1.5 w-3.5 h-3.5 fill-current text-acc align-text-bottom" />}
                        </p>
                      </LongPressable>
                      {held && (
                        <div className="px-2 pb-1">
                          <VerseActionBar
                            copyValue={`"${v.text}" — ${book} ${chapter}:${v.number} (${translationMeta.shortName})`}
                            bookmarked={saved}
                            onToggleBookmark={() => toggle(bookmarkFor(v))}
                            onClose={() => setHeldVerse(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
