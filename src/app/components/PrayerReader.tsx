'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ReaderItem {
  id: string;
  title: string;
  category?: string;
  subCategory?: string;
  details?: string;
  scripture?: string;
}

interface Props {
  items: ReaderItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function PrayerReader({ items, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  const current = items[index];
  if (!current) return null;

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-page rounded-3xl w-full max-w-md max-h-[90vh] border border-edge-strong shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-edge flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-acc">Prayer Point</p>
            <p className="text-ink-muted text-xs tabular-nums">{index + 1} of {items.length}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prayer content — large print */}
        <div className="p-6 overflow-y-auto flex-1 text-center">
          {(current.category || current.subCategory) && (
            <p className="text-ink-muted text-xs font-semibold uppercase tracking-wider mb-3">
              {current.category && current.category}
              {current.subCategory && <span> · {current.subCategory}</span>}
            </p>
          )}

          <h2 className="font-serif-heading text-3xl font-bold text-ink leading-tight mb-4">
            {current.title}
          </h2>

          {current.details && (
            <p className="text-2xl text-ink-soft leading-relaxed italic">
              &ldquo;{current.details}&rdquo;
            </p>
          )}

          {current.scripture && (
            <p className="text-acc-strong text-base mt-4 font-semibold">📖 {current.scripture}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="px-5 py-4 border-t border-edge flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setIndex(index - 1)}
              disabled={!hasPrev}
              className="flex-1 py-3 bg-card-2 text-ink-soft rounded-xl font-bold text-sm hover:bg-card-3 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {hasNext ? (
              <button
                onClick={() => setIndex(index + 1)}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 flex items-center justify-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Amen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
