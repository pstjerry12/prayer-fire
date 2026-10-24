'use client';

import { useState, type ReactNode } from 'react';
import { Bookmark as BookmarkIcon, BookOpenText, Check, Copy, Highlighter, Share2, Volume2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/studyMerge';
import { HIGHLIGHT_STYLES } from '@/lib/highlightStyles';
import type { ShareResult } from '@/lib/shareVerse';

interface Props {
  /** "John 3:16" or "John 3:16, 18 (3 verses)" */
  title: string;
  onClose: () => void;
  onCopy: () => Promise<boolean> | boolean;
  onReadAloud: () => void;
  /** Opens the phone's share sheet with the verse and a link to the Bible in Prayer Fire. */
  onShare?: () => Promise<ShareResult>;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  /** Bible verses only: highlight colours. Left out for prayer verses. */
  highlight?: {
    current: HighlightColor | null;
    onPick: (color: HighlightColor | null) => void;
  };
  /** Bible verses only: save into the active sermon. */
  sermon?: {
    activeTitle: string | null;
    onAdd: () => void;
  };
}

function Row({ icon, label, hint, onClick, active }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-card-2 hover:bg-card-2 transition-colors',
        active && 'bg-warn-soft'
      )}
    >
      <span className="w-9 h-9 rounded-xl bg-acc-soft text-acc grid place-items-center shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted truncate">{hint}</span>}
      </span>
    </button>
  );
}

/** The long-press menu for a verse (or several selected verses). */
export default function VerseActionSheet({ title, onClose, onCopy, onReadAloud, onShare, bookmarked, onToggleBookmark, highlight, sermon }: Props) {
  const [copied, setCopied] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function handleCopy() {
    const ok = await onCopy();
    if (ok) {
      setCopied(true);
      setTimeout(onClose, 700);
    } else {
      onClose();
    }
  }

  async function handleShare() {
    if (!onShare) return;
    const result = await onShare();
    if (result === 'copied') {
      setShareNote('Copied with the link. Paste it into WhatsApp or a message.');
      setTimeout(onClose, 1800);
    } else if (result === 'failed') {
      setShareNote('Could not share on this device.');
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Actions for ${title}`}>
      <button aria-label="Close menu" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border border-edge shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <p className="font-serif-heading font-bold text-ink truncate">{title}</p>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-ink-muted hover:bg-card-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-edge">
          <Row
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            label={copied ? 'Copied' : 'Copy'}
            hint="With the reference, e.g. John 3:16 (KJV) - …"
            onClick={handleCopy}
          />
          {onShare && (
            <Row
              icon={<Share2 className="w-4 h-4" />}
              label="Share"
              hint={shareNote ?? 'Send the verse with a link to the Bible in Prayer Fire'}
              onClick={handleShare}
            />
          )}
          <Row
            icon={<Volume2 className="w-4 h-4" />}
            label="Read Aloud"
            onClick={() => {
              onReadAloud();
              onClose();
            }}
          />
          <Row
            icon={<BookmarkIcon className={cn('w-4 h-4', bookmarked && 'fill-current')} />}
            label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            onClick={() => {
              onToggleBookmark();
              onClose();
            }}
            active={bookmarked}
          />
          {highlight && (
            <div>
              <Row
                icon={<Highlighter className="w-4 h-4" />}
                label="Highlight colour"
                hint={highlight.current ? HIGHLIGHT_STYLES[highlight.current].label : 'Choose a colour'}
                onClick={() => setShowColors((v) => !v)}
              />
              {showColors && (
                <div className="flex items-center gap-3 px-4 pb-4 pt-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c}
                      aria-label={`${HIGHLIGHT_STYLES[c].label} highlight`}
                      onClick={() => {
                        highlight.onPick(c);
                        onClose();
                      }}
                      className={cn(
                        'w-9 h-9 rounded-full border-2 grid place-items-center active:scale-90 transition-transform',
                        highlight.current === c ? 'border-ink' : 'border-transparent'
                      )}
                      style={{ background: HIGHLIGHT_STYLES[c].swatch }}
                    >
                      {highlight.current === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      highlight.onPick(null);
                      onClose();
                    }}
                    className="ml-auto text-xs font-bold text-ink-muted hover:text-ink px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
          {sermon && (
            <Row
              icon={<BookOpenText className="w-4 h-4" />}
              label="Add to Sermon Notes"
              hint={sermon.activeTitle ? `Into: ${sermon.activeTitle}` : 'Start a sermon session first'}
              onClick={() => {
                sermon.onAdd();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
