'use client';

import { useMemo } from 'react';
import { X, BookOpen } from 'lucide-react';
import { KJV_BIBLE_VERSES } from '../data/bibleVerses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export default function DailyVerseModal({ isOpen, onClose }: Props) {
  const verse = useMemo(() => {
    const idx = dayOfYear(new Date()) % KJV_BIBLE_VERSES.length;
    return KJV_BIBLE_VERSES[idx];
  }, []);

  if (!isOpen) return null;

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
            {verse.reference}
          </p>
          <p className="text-ink text-lg leading-relaxed italic font-serif-heading">
            &ldquo;{verse.text}&rdquo;
          </p>
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
