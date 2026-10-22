'use client';

import { useState } from 'react';
import { Bookmark as BookmarkIcon, Check, Copy, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { copyText } from '@/lib/clipboard';

interface Props {
  /** Text placed on the clipboard, e.g. `"…" — John 3:16 (KJV)`. */
  copyValue: string;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}

/** Shown under a verse that was held for two seconds: Copy and Bookmark. */
export default function VerseActionBar({ copyValue, bookmarked, onToggleBookmark, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(copyValue);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card text-ink-soft border border-edge text-xs font-bold hover:bg-card-2 active:scale-95"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-acc" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button
        onClick={onToggleBookmark}
        aria-pressed={bookmarked}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold active:scale-95',
          bookmarked ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-ink-soft border-edge hover:bg-card-2'
        )}
      >
        <BookmarkIcon className={cn('w-3.5 h-3.5', bookmarked && 'fill-current')} />
        {bookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>
      <button onClick={onClose} aria-label="Dismiss" className="ml-auto p-1.5 rounded-lg text-ink-muted hover:bg-card-3">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
