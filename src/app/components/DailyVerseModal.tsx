'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { KJV_BIBLE_VERSES } from '../data/bibleVerses';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { loadTranslation, getChapter } from '@/lib/bible/loadTranslation';
import { getSelectedTranslation, getTranslationMeta, DEFAULT_TRANSLATION, type TranslationId } from '@/lib/bible/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

// A couple of the curated references use "Psalm" (singular) while the book
// table uses "Psalms" (plural) — this bridges that; anything else that
// doesn't resolve just falls back to the verse's own baked-in KJV text.
const BOOK_NAME_ALIASES: Record<string, string> = { Psalm: 'Psalms' };

/** "Matthew 18:19-20" -> { osis: 'Matt', chapter: 18, start: 19, end: 20 } */
function parseReference(reference: string): { osis: string; chapter: number; start: number; end: number } | null {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, rawName, chapterStr, startStr, endStr] = match;
  const name = BOOK_NAME_ALIASES[rawName] ?? rawName;
  const book = BIBLE_BOOKS.find((b) => b.name === name);
  if (!book) return null;
  return {
    osis: book.osis,
    chapter: parseInt(chapterStr, 10),
    start: parseInt(startStr, 10),
    end: endStr ? parseInt(endStr, 10) : parseInt(startStr, 10),
  };
}

export default function DailyVerseModal({ isOpen, onClose }: Props) {
  const fallback = useMemo(() => {
    const idx = dayOfYear(new Date()) % KJV_BIBLE_VERSES.length;
    return KJV_BIBLE_VERSES[idx];
  }, []);

  // Reading localStorage here is safe without an effect: this only ever
  // runs on a client-triggered re-render (isOpen flips true from a click,
  // never during SSR/hydration), so there's no hydration-mismatch risk.
  const translationId: TranslationId = isOpen ? getSelectedTranslation() : DEFAULT_TRANSLATION;
  const translationName = getTranslationMeta(translationId).name;

  // Caches the last successfully-resolved translation lookup. Render-time
  // freshness check below (not a synchronous effect reset) decides whether
  // it still applies to the current translation/verse — every setState here
  // happens inside the async .then(), which is the legitimate case for
  // syncing effect state to an external result.
  const [loaded, setLoaded] = useState<{ id: TranslationId; reference: string; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || translationId === 'kjv') return; // KJV is already the fallback text below

    const parsed = parseReference(fallback.reference);
    if (!parsed) return; // reference didn't parse — quietly keep the KJV fallback

    let cancelled = false;
    loadTranslation(translationId)
      .then((data) => {
        if (cancelled) return;
        const chapterData = getChapter(data, parsed.osis, parsed.chapter);
        if (!chapterData) return;
        const text = chapterData.verses
          .filter((v) => v.number >= parsed.start && v.number <= parsed.end)
          .map((v) => v.text)
          .join(' ');
        if (text) setLoaded({ id: translationId, reference: fallback.reference, text });
      })
      .catch(() => {}); // unavailable — stays on the KJV fallback text below

    return () => {
      cancelled = true;
    };
  }, [isOpen, translationId, fallback.reference]);

  if (!isOpen) return null;

  const translatedText =
    loaded && loaded.id === translationId && loaded.reference === fallback.reference ? loaded.text : null;
  const displayText = translatedText || fallback.text;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-acc" />
            <h2 className="font-bold text-ink">Verse of the Day</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 text-center">
          <p className="text-4xl mb-4">🕊️</p>
          <p className="text-acc text-xs font-semibold uppercase tracking-wider mb-3">
            {fallback.reference}
          </p>
          <p className="text-ink text-lg leading-relaxed italic font-serif-heading">
            &ldquo;{displayText}&rdquo;
          </p>
          <p className="text-ink-faint text-[11px] mt-3">{translationName}</p>
          <p className="text-ink-muted text-xs mt-5">Start your day with the Word of God.</p>
          <button
            onClick={onClose}
            className="mt-5 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all"
          >
            Amen 🙏
          </button>
        </div>
      </div>
    </div>
  );
}
