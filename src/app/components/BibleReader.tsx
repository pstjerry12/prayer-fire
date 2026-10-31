'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronLeft, Volume2, Square, Play, Loader2, BookMarked, ListOrdered, AlertTriangle, Bookmark as BookmarkIcon, BookOpenText, X, Minus, Plus,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { pushBackHandler } from '@/lib/backHandlerStack';
import { BIBLE_BOOKS } from '@/app/data/bibleBooks';
import { readItems, stopSpeech, type ReadController, type ReaderState } from '@/lib/readAloud';
import { copyText } from '@/lib/clipboard';
import { saveLastPlace, touchLastPlace } from '@/lib/bibleLastPlace';
import { shareVerse } from '@/lib/shareVerse';
import {
  activeSermon,
  addVersesToSermon,
  formatVerse,
  getStudyDoc,
  setActiveSermon,
  setHighlights,
  toggleBookmarks,
  useStudy,
  verseKey,
  type VerseInfo,
} from '@/lib/study';
import { BOOKMARK_BG, HIGHLIGHT_STYLES, READING_BG } from '@/lib/highlightStyles';
import { loadTranslation, getChapter, type BibleVerse } from '@/lib/bible/loadTranslation';
import {
  BIBLE_TRANSLATIONS,
  DEFAULT_TRANSLATION,
  getSelectedTranslation,
  setSelectedTranslation,
  getTranslationMeta,
  type TranslationId,
} from '@/lib/bible/translations';
import LongPressable from './LongPressable';
import VerseActionSheet from './VerseActionSheet';
import SermonStartModal from './SermonStartModal';
import ReadAloudBar from './ReadAloudBar';
import BibleSearchBar from './BibleSearchBar';

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

// Where the reader was, kept for this session only, so coming back from another
// page lands on the same chapter instead of the book list.
const POSITION_KEY = 'pfm_bible_position';
const FONT_KEY = 'pfm_bible_font';
const FONT_MIN = 13;
const FONT_MAX = 26;
const FONT_DEFAULT = 16;
const HOLD_MS = 1000; // press-and-hold time for the verse menu

interface SavedPosition {
  step: Step;
  book: string;
  chapter: number;
  /** Set by the Verse of the Day "Read" button: select and scroll to this verse once, then forget it. */
  verse?: number;
}

const LISTEN_TIP_KEY = 'pfm_listen_tip_seen';

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
  const study = useStudy();
  const sermon = activeSermon(study);

  const [step, setStep] = useState<Step>(1);
  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Default to KJV on first load; getSelectedTranslation() only reads
  // localStorage client-side, so this stays DEFAULT_TRANSLATION during SSR.
  const [translationId, setTranslationId] = useState<TranslationId>(DEFAULT_TRANSLATION);

  // Soft-highlighted verses (tap to add/remove). Read Aloud starts from these.
  const [selected, setSelected] = useState<number[]>([]);
  // The long-press menu and what it applies to.
  const [menu, setMenu] = useState<number[] | null>(null);
  const [sermonStart, setSermonStart] = useState<{ infos: VerseInfo[] } | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [fontSize, setFontSize] = useState(FONT_DEFAULT);

  // Read aloud
  const [readerState, setReaderState] = useState<ReaderState>('idle');
  const [readingVerse, setReadingVerse] = useState<number | null>(null);
  const [speechProblem, setSpeechProblem] = useState<string | null>(null);
  const controllerRef = useRef<ReadController | null>(null);
  // One-time hint pointing at the Listen button, and "Listen was tapped before a chapter was open".
  const [showListenTip, setShowListenTip] = useState(false);
  const autoListenRef = useRef(false);

  // A verse to select and scroll to once its chapter has loaded (search/jump, or coming back).
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);
  // True once the saved reading position (if any) has been applied; until then we
  // must not overwrite it with the default Genesis 1 screen.
  const [positionLoaded, setPositionLoaded] = useState(false);

  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const currentBook = BIBLE_BOOKS.find((b) => b.name === book) ?? BIBLE_BOOKS[0];
  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === 'NT');
  const translationMeta = getTranslationMeta(translationId);

  useEffect(() => {
    // These saved values are only readable on the client, after mount.
    setTranslationId(getSelectedTranslation());
    try {
      const f = parseInt(localStorage.getItem(FONT_KEY) ?? '', 10);
      if (f >= FONT_MIN && f <= FONT_MAX) setFontSize(f);
    } catch {
      // ignore
    }
    const saved = readPosition();
    if (saved) {
      setBook(saved.book);
      setChapter(saved.chapter);
      setStep(saved.step);
      if (saved.verse) setPendingVerse(saved.verse);
    }
    try {
      setShowListenTip(localStorage.getItem(LISTEN_TIP_KEY) !== '1');
    } catch {
      // ignore
    }
    setPositionLoaded(true);
  }, []);

  // Stop reading when leaving the page.
  useEffect(() => () => stopSpeech(), []);

  // Remember the step/book/chapter whenever they change.
  useEffect(() => {
    if (!positionLoaded) return;
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ step, book, chapter } satisfies SavedPosition));
    } catch {
      // ignore
    }
    // Also remember the chapter on the phone itself, for "Continue where you stopped" on the home screen.
    if (step === 3) touchLastPlace(book, chapter);
  }, [positionLoaded, step, book, chapter]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToast({ id, message });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2200);
  }, []);

  const stopReading = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    stopSpeech();
    setReaderState('idle');
    setReadingVerse(null);
  }, []);

  const loadChapter = useCallback(async (osis: string, ch: number, translation: TranslationId) => {
    setLoading(true);
    setUnavailable(false);
    setVerses(null);
    setSelected([]);
    setMenu(null);
    stopReading();

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
  }, [stopReading]);

  useEffect(() => {
    if (step === 3) loadChapter(currentBook.osis, chapter, translationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, book, chapter, translationId]);

  // Select and scroll to a verse requested by search / jump once its chapter is on screen.
  useEffect(() => {
    if (!verses || pendingVerse == null) return;
    const wanted = pendingVerse;
    setPendingVerse(null);
    if (!verses.some((v) => v.number === wanted)) return;
    setSelected([wanted]);
    const t = setTimeout(() => verseRefs.current[wanted]?.scrollIntoView({ block: 'center' }), 60);
    return () => clearTimeout(t);
  }, [verses, pendingVerse]);

  // Let the hardware/gesture back button step back through Verses → Chapters
  // → Book one level at a time instead of falling straight through to the
  // app-wide exit prompt — this stays registered only while there's
  // somewhere to go (step > 1); at the Book screen it releases the press so
  // it acts on the rest of the app normally.
  useEffect(() => {
    if (step === 1) return;
    return pushBackHandler(() => {
      if (menu) {
        setMenu(null);
        return true;
      }
      setStep((s) => (s - 1) as Step);
      return true;
    });
  }, [step, menu]);

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

  function goTo(target: { osis: string; chapter: number; verse: number | null }) {
    const b = BIBLE_BOOKS.find((x) => x.osis === target.osis);
    if (!b) return;
    setBook(b.name);
    setChapter(target.chapter);
    setStep(3);
    setPendingVerse(target.verse);
  }

  function jumpToVerse(n: number) {
    setSelected([n]);
    verseRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function toggleSelected(n: number) {
    setSelected((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b)));
  }

  function changeFont(delta: number) {
    setFontSize((cur) => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, cur + delta));
      try {
        localStorage.setItem(FONT_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const infoFor = useCallback(
    (v: BibleVerse): VerseInfo => ({
      translationId,
      osis: currentBook.osis,
      chapter,
      verse: v.number,
      reference: `${book} ${chapter}:${v.number}`,
      text: v.text,
    }),
    [translationId, currentBook.osis, chapter, book]
  );

  const versesFor = useCallback(
    (numbers: number[]): BibleVerse[] => {
      if (!verses) return [];
      return [...numbers].sort((a, b) => a - b).map((n) => verses.find((v) => v.number === n)).filter((v): v is BibleVerse => !!v);
    },
    [verses]
  );

  // ── Read aloud ────────────────────────────────────────────────────────
  // Highlighted verses are read in order; with nothing highlighted the whole
  // chapter is read from verse 1. One utterance per verse, so the verse being
  // read can be highlighted and scrolled into view.
  function startReading(numbers: number[] | null) {
    if (!verses) return;
    const list = numbers && numbers.length > 0 ? versesFor(numbers) : verses;
    const items = list.map((v) => ({ id: v.number, text: v.text }));
    if (!numbers || numbers.length === 0) items.unshift({ id: 0, text: `${book} chapter ${chapter}.` });

    setSpeechProblem(null);
    controllerRef.current = readItems(items, {
      onItemStart: (_i, item) => {
        const n = typeof item.id === 'number' ? item.id : 0;
        setReadingVerse(n > 0 ? n : null);
        if (n > 0) {
          verseRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          saveLastPlace({ book, chapter, verse: n });
        }
      },
      onStateChange: setReaderState,
      onEnd: (reason, detail) => {
        setReadingVerse(null);
        controllerRef.current = null;
        if (reason === 'unsupported' || reason === 'error') setSpeechProblem(detail || 'no voice available');
      },
    });
  }

  const reading = readerState !== 'idle';

  const readingLabel = readingVerse ? `Reading ${book} ${chapter}:${readingVerse}` : `Reading ${book} ${chapter}`;

  // "Listen" tapped on the book/chapter list: open the chapter, then read it from verse 1 once it has loaded.
  useEffect(() => {
    if (!autoListenRef.current || !verses || loading) return;
    autoListenRef.current = false;
    startReading(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses, loading]);

  // The hint fades by itself after a while; it is shown only once per device.
  useEffect(() => {
    if (!showListenTip) return;
    const t = setTimeout(dismissListenTip, 12000);
    return () => clearTimeout(t);
  }, [showListenTip]);

  function dismissListenTip() {
    setShowListenTip(false);
    try {
      localStorage.setItem(LISTEN_TIP_KEY, '1');
    } catch {
      // ignore
    }
  }

  function onListen() {
    dismissListenTip();
    if (reading) return;
    if (step === 3) {
      startReading(selected);
    } else {
      autoListenRef.current = true;
      setStep(3);
    }
  }


  // ── Menu actions ──────────────────────────────────────────────────────
  const menuVerses = menu ? versesFor(menu) : [];
  const menuInfos = menuVerses.map(infoFor);
  const menuTitle =
    menuVerses.length === 1
      ? `${book} ${chapter}:${menuVerses[0].number}`
      : `${book} ${chapter}:${menuVerses.map((v) => v.number).join(', ')}`;
  const menuAllBookmarked = menuInfos.length > 0 && menuInfos.every((i) => study.verses[verseKey(i)]?.bookmarkedAt != null);
  const menuHighlight = menuInfos.length > 0 ? study.verses[verseKey(menuInfos[0])]?.highlight ?? null : null;

  function addToSermon(infos: VerseInfo[], sermonId: string) {
    const added = addVersesToSermon(sermonId, infos);
    // Read the title fresh: a sermon created a moment ago isn't in this render's snapshot yet.
    const title = getStudyDoc().sermons[sermonId]?.title;
    showToast(added > 0 ? `Added ${added} verse${added === 1 ? '' : 's'} to ${title ?? 'your sermon notes'}` : 'Already in your sermon notes');
  }

  return (
    <div className="space-y-4">
      {/* ── Search & quick jump ──────────────────────────────────── */}
      <BibleSearchBar translationId={translationId} onGoTo={goTo} />

      {/* ── Translation: one chip each, the chosen one filled green ── */}
      <div role="radiogroup" aria-label="Bible translation" className="flex gap-2">
        {BIBLE_TRANSLATIONS.map((t) => {
          const chosen = t.id === translationId;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={chosen}
              aria-label={t.name}
              onClick={() => changeTranslation(t.id)}
              className={cn(
                'h-11 min-w-[4.5rem] rounded-full px-5 text-sm font-bold transition-colors active:scale-95',
                chosen ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-muted hover:text-acc-strong'
              )}
            >
              {t.shortName}
            </button>
          );
        })}
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
        <div className="bg-card rounded-2xl p-5">
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
        <div className="bg-card rounded-2xl p-5">
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
          <div className="bg-card rounded-2xl p-5">
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
                      selected.includes(v.number) ? 'bg-warn text-white' : 'bg-card-2 text-ink-muted hover:text-ink hover:bg-card-3'
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
          <div className="bg-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 border-b border-edge pb-3 mb-3">
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
                  onClick={() => (reading ? stopReading() : startReading(selected))}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold',
                    reading ? 'bg-emerald-600 text-white' : 'bg-card-2 text-ink-soft hover:bg-card-3'
                  )}
                >
                  {reading ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  {reading ? 'Stop' : selected.length > 0 ? `Read ${selected.length === 1 ? 'verse' : `${selected.length} verses`}` : 'Read Aloud'}
                </button>
              )}
            </div>

            {/* Tools: text size, sermon session, selection */}
            {verses && !loading && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center rounded-lg bg-card-2 border border-edge" role="group" aria-label="Text size">
                  <button onClick={() => changeFont(-1)} disabled={fontSize <= FONT_MIN} aria-label="Smaller text" className="grid h-8 w-8 place-items-center text-ink-soft disabled:opacity-40">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-1 text-xs font-bold text-ink-muted tabular-nums">Aa {fontSize}</span>
                  <button onClick={() => changeFont(1)} disabled={fontSize >= FONT_MAX} aria-label="Larger text" className="grid h-8 w-8 place-items-center text-ink-soft disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {sermon ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-warn-soft border border-warn-edge pl-2.5 pr-1 py-1 text-xs font-bold text-warn-strong max-w-full">
                    <BookOpenText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Sermon: {sermon.title}</span>
                    <button onClick={() => setActiveSermon(null)} aria-label="End sermon session" className="p-1 rounded-md hover:bg-warn-soft-2">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setSermonStart({ infos: [] })}
                    className="flex items-center gap-1.5 rounded-lg bg-card-2 border border-edge px-2.5 py-1.5 text-xs font-bold text-ink-soft hover:bg-card-3"
                  >
                    <BookOpenText className="w-3.5 h-3.5" /> Sermon session
                  </button>
                )}
                {selected.length > 0 && (
                  <button onClick={() => setSelected([])} className="ml-auto text-xs font-bold text-acc hover:underline">
                    Clear {selected.length} selected
                  </button>
                )}
              </div>
            )}

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
                    Read aloud couldn&apos;t start on this device. Check that a text-to-speech voice is installed and your media volume is up.
                    <span className="block mt-1 text-[0.6875rem] text-ink-muted break-words">Details: {speechProblem}</span>
                  </p>
                )}
                <p className="mb-3 text-[0.6875rem] text-ink-muted">
                  Tap verses to select them · hold a verse for a menu (copy, read, bookmark, highlight, sermon notes)
                </p>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {verses.map((v) => {
                    const info = infoFor(v);
                    const record = study.verses[verseKey(info)];
                    const isSelected = selected.includes(v.number);
                    const isReading = readingVerse === v.number;
                    const bookmarked = record?.bookmarkedAt != null;
                    const color = record?.highlight ?? null;
                    const background = isReading
                      ? READING_BG
                      : color
                        ? HIGHLIGHT_STYLES[color].bg
                        : bookmarked
                          ? BOOKMARK_BG
                          : undefined;
                    return (
                      <div
                        key={v.number}
                        ref={(el) => {
                          verseRefs.current[v.number] = el;
                        }}
                      >
                        <LongPressable
                          holdMs={HOLD_MS}
                          onTap={() => toggleSelected(v.number)}
                          onLongPress={() => {
                            const targets = isSelected && selected.length > 1 ? selected : [v.number];
                            setSelected(targets);
                            setMenu(targets);
                          }}
                          style={background ? { background } : undefined}
                          className={cn(
                            'rounded-xl px-3 py-2 -mx-1 transition-colors',
                            isReading && 'ring-2 ring-orange-400',
                            !isReading && isSelected && 'ring-2 ring-warn-edge',
                            !isReading && isSelected && !background && 'bg-warn-soft',
                            !isReading && !isSelected && !background && 'hover:bg-card-2'
                          )}
                        >
                          <p className="leading-relaxed text-ink-soft" style={{ fontSize }}>
                            <sup className="mr-1.5 font-serif-heading font-bold text-acc-strong">{v.number}</sup>
                            {v.text}
                            {bookmarked && <BookmarkIcon className="inline-block ml-1.5 w-3.5 h-3.5 fill-current text-warn align-text-bottom" aria-label="Bookmarked" />}
                          </p>
                        </LongPressable>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Big floating Listen button: the Bible can be heard, not just read */}
      {!reading && !menu && !sermonStart && (step !== 3 || (verses && !loading)) && (
        <div className="fixed right-4 z-[55] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-8 flex flex-col items-end gap-2">
          {showListenTip && (
            <div role="status" className="relative max-w-[15rem] rounded-xl bg-ink text-page pl-3 pr-8 py-2 text-xs font-bold shadow-xl">
              Tap Listen to hear the Bible read aloud.
              <button onClick={dismissListenTip} aria-label="Dismiss tip" className="absolute right-1.5 top-1.5 p-0.5 rounded-md hover:bg-page/20">
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="absolute -bottom-1 right-8 h-2.5 w-2.5 rotate-45 bg-ink" aria-hidden />
            </div>
          )}
          <button
            onClick={onListen}
            aria-label={selected.length > 0 ? `Listen to the ${selected.length} selected verse${selected.length === 1 ? '' : 's'}` : 'Listen: hear this chapter read aloud'}
            className="flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-emerald-600 text-white font-bold text-base shadow-2xl ring-4 ring-orange-400/40 active:scale-95 hover:bg-emerald-500"
          >
            <Play className="w-6 h-6 fill-current" />
            Listen
          </button>
        </div>
      )}

      {/* Floating player while reading */}
      <ReadAloudBar
        state={readerState}
        label={readingLabel}
        onPause={() => controllerRef.current?.pause()}
        onResume={() => controllerRef.current?.resume()}
        onStop={stopReading}
      />

      {/* Long-press menu */}
      {menu && menuVerses.length > 0 && (
        <VerseActionSheet
          title={menuTitle}
          onClose={() => setMenu(null)}
          onCopy={() => copyText(menuInfos.map((i) => formatVerse(i.reference, translationMeta.shortName, i.text)).join('\n'))}
          onReadAloud={() => startReading(menu)}
          onShare={() => shareVerse(menuInfos.map((i) => formatVerse(i.reference, translationMeta.shortName, i.text)).join('\n'))}
          bookmarked={menuAllBookmarked}
          onToggleBookmark={() => {
            const saved = toggleBookmarks(menuInfos);
            showToast(saved ? 'Bookmarked' : 'Bookmark removed');
          }}
          highlight={{
            current: menuHighlight,
            onPick: (color) => {
              setHighlights(menuInfos, color);
              showToast(color ? `Highlighted ${HIGHLIGHT_STYLES[color].label.toLowerCase()}` : 'Highlight removed');
            },
          }}
          sermon={{
            activeTitle: sermon?.title ?? null,
            onAdd: () => {
              if (sermon) addToSermon(menuInfos, sermon.id);
              else setSermonStart({ infos: menuInfos });
            },
          }}
        />
      )}

      {/* Start a sermon session (optionally adding the verses that were chosen) */}
      {sermonStart && (
        <SermonStartModal
          onClose={() => setSermonStart(null)}
          onStarted={(id) => {
            const infos = sermonStart.infos;
            setSermonStart(null);
            if (infos.length > 0) addToSermon(infos, id);
            else showToast('Sermon session started');
          }}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[95] bottom-[calc(8.5rem+env(safe-area-inset-bottom))] md:bottom-24 max-w-[calc(100%-2rem)] rounded-full bg-ink text-page px-4 py-2 text-xs font-bold shadow-xl" role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
