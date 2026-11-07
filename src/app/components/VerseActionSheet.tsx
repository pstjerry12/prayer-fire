'use client';

import { useState, type ReactNode } from 'react';
import { Bookmark as BookmarkIcon, BookOpenText, Check, Copy, Highlighter, Image as ImageIcon, MessageCircle, Share2, Volume2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/studyMerge';
import { HIGHLIGHT_STYLES } from '@/lib/highlightStyles';
import type { ShareResult } from '@/lib/shareVerse';
import { shareImageCard, shareToWhatsApp } from '@/lib/shareImage';
import { useI18n } from '@/app/i18n';

interface Props {
  /** "John 3:16" or "John 3:16, 18 (3 verses)" */
  title: string;
  onClose: () => void;
  onCopy: () => Promise<boolean> | boolean;
  onReadAloud: () => void;
  /** Opens the phone's share sheet with the verse and a link to the Bible in Prayer Fire. */
  onShare?: () => Promise<ShareResult>;
  /** What the branded picture and the WhatsApp button send: the words, the reference (e.g. "John 3:16 (KJV)") and the plain-text line. */
  card?: { body: string; reference: string; line: string };
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
        active && 'bg-acc-soft'
      )}
    >
      <span className="w-9 h-9 rounded-xl bg-acc-soft text-acc-strong grid place-items-center shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted truncate">{hint}</span>}
      </span>
    </button>
  );
}

/** The long-press menu for a verse (or several selected verses). */
export default function VerseActionSheet({ title, onClose, onCopy, onReadAloud, onShare, card, bookmarked, onToggleBookmark, highlight, sermon }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);

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
      setShareNote(t('ui.copiedWithTheLinkPaste'));
      setTimeout(onClose, 1800);
    } else if (result === 'failed') {
      setShareNote(t('ui.couldNotShareOnThis'));
    } else {
      onClose();
    }
  }

  async function handleImage() {
    if (!card) return;
    setImageNote(t('ui.makingYourPicture'));
    const result = await shareImageCard(card.body, card.reference, card.line);
    if (result === 'saved') {
      setImageNote(t('ui.pictureSavedToYourDownloads'));
      setTimeout(onClose, 2200);
    } else if (result === 'copied') {
      setImageNote(t('ui.copiedTheTextWithThe'));
      setTimeout(onClose, 1800);
    } else if (result === 'failed') {
      setImageNote(t('ui.couldNotMakeThePicture'));
    } else {
      onClose();
    }
  }

  function handleWhatsApp() {
    if (!card) return;
    shareToWhatsApp(card.line);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Actions for ${title}`}>
      <button aria-label={t('menu.close')} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border border-edge shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <p className="font-serif-heading font-bold text-ink truncate">{title}</p>
          <button onClick={onClose} aria-label={t('authModal.close')} className="p-1.5 rounded-full text-ink-muted hover:bg-card-3">
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
              label={t('prayerGroups.share')}
              hint={shareNote ?? t('ui.sendTheVerseWithA')}
              onClick={handleShare}
            />
          )}
          {card && (
            <Row
              icon={<ImageIcon className="w-4 h-4" />}
              label={t('verseActionSheet.shareAsPicture')}
              hint={imageNote ?? t('ui.aBrandedPrayerFireCard')}
              onClick={handleImage}
            />
          )}
          {card && (
            <Row
              icon={<MessageCircle className="w-4 h-4" />}
              label={t('verseActionSheet.sendOnWhatsapp')}
              hint={t('ui.opensWhatsappWithTheVerse')}
              onClick={handleWhatsApp}
            />
          )}
          <Row
            icon={<Volume2 className="w-4 h-4" />}
            label={t('verseActionSheet.readAloud')}
            onClick={() => {
              onReadAloud();
              onClose();
            }}
          />
          <Row
            icon={<BookmarkIcon className={cn('w-4 h-4', bookmarked && 'fill-current')} />}
            label={bookmarked ? t('ui.removeBookmark') : 'Bookmark'}
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
                label={t('verseActionSheet.highlightColour')}
                hint={highlight.current ? HIGHLIGHT_STYLES[highlight.current].label : t('ui.chooseAColour')}
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
                  >{t('customizablePrayerSchedule.remove')}</button>
                </div>
              )}
            </div>
          )}
          {sermon && (
            <Row
              icon={<BookOpenText className="w-4 h-4" />}
              label={t('verseActionSheet.addToSermonNotes')}
              hint={sermon.activeTitle ? `Into: ${sermon.activeTitle}` : t('ui.startASermonSessionFirst')}
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
