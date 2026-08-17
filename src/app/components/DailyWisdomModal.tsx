'use client';

import { useMemo } from 'react';
import { X, BookHeart, Lightbulb } from 'lucide-react';
import { WISDOM_CHAPTERS, COLOR_CLASSES } from '../data/wisdomData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyWisdomModal({ isOpen, onClose }: Props) {
  const chapter = useMemo(() => {
    const idx = new Date().getDate() % WISDOM_CHAPTERS.length;
    return WISDOM_CHAPTERS[idx];
  }, []);

  if (!isOpen) return null;

  const colors = COLOR_CLASSES[chapter.color] || COLOR_CLASSES.amber;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
        <div className={`px-5 py-4 border-b border-edge flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <BookHeart className="w-5 h-5 text-acc" />
            <h2 className="font-bold text-ink">Wisdom of the Day</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-4xl mb-2">{chapter.icon}</p>
            <p className={`${colors.text} text-xs font-bold uppercase tracking-wider`}>
              Chapter {chapter.id} &middot; {chapter.title}
            </p>
          </div>
          <div className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-5 border ${colors.border}`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full ${colors.badge} flex items-center justify-center flex-shrink-0 text-acc-strong`}>
                <Lightbulb className="w-4 h-4" />
              </div>
              <p className="text-ink text-sm leading-relaxed font-medium italic">
                &ldquo;{chapter.highlight}&rdquo;
              </p>
            </div>
          </div>
          <p className="text-ink-muted text-xs text-center italic">{chapter.subtitle}</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all"
          >
            Continue 🙏
          </button>
        </div>
      </div>
    </div>
  );
}
