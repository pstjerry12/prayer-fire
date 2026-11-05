'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crown, Download, Loader2, Mic2, Trash2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { downloadChapter, getPremiumVoice, isChapterDownloaded, removeChapterDownload, setPremiumVoice, type VoiceInfo } from '@/lib/premiumVoice';

interface Props {
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  chapters: number;
  onChange: (voice: string | null) => void;
}

/**
 * "Reading voice": the phone's own voice (free) or a premium voice (subscribers). Also saves a chapter, or a book one chapter
 * at a time, for offline listening. Renders nothing until the owner has switched premium voices on (the server says so).
 */
export default function PremiumVoicePicker({ translation, book, bookName, chapter, chapters, onChange }: Props) {
  const router = useRouter();
  const [info, setInfo] = useState<{ available: boolean; eligible: boolean; voices: VoiceInfo[] } | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<null | 'chapter' | 'book'>(null);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/bible-audio/voices', { cache: 'no-store' }).then((r) => r.json()).then(setInfo).catch(() => setInfo(null));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoice(getPremiumVoice());
  }, []);

  const refreshSaved = useCallback(async () => {
    if (voice) setSaved(await isChapterDownloaded({ voice, translation, book, chapter }));
  }, [voice, translation, book, chapter]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSaved();
  }, [refreshSaved, open]);

  if (!info || !info.available) return null;
  const chosen = info.voices.find((v) => v.id === voice) ?? null;

  const choose = (id: string | null) => {
    if (id && !info.eligible) return router.push('/partner');
    setPremiumVoice(id);
    setVoice(id);
    onChange(id);
    setMessage('');
  };

  const saveChapter = async () => {
    if (!voice) return;
    setBusy('chapter');
    setMessage('');
    const r = await downloadChapter({ voice, translation, book, chapter });
    setBusy(null);
    setMessage(r.ok ? 'Saved on this phone. It plays without internet.' : r.message);
    refreshSaved();
  };

  const saveBook = async () => {
    if (!voice) return;
    if (!confirm(`Save all ${chapters} chapters of ${bookName} for offline listening? Each one is downloaded in turn and can take a few minutes.`)) return;
    setBusy('book');
    setMessage('');
    for (let c = 1; c <= chapters; c++) {
      setProgress(`Saving chapter ${c} of ${chapters}...`);
      const r = await downloadChapter({ voice, translation, book, chapter: c });
      if (!r.ok) {
        setMessage(`Stopped at chapter ${c}: ${r.message}`);
        setBusy(null);
        setProgress('');
        refreshSaved();
        return;
      }
    }
    setBusy(null);
    setProgress('');
    setMessage(`All of ${bookName} is saved on this phone.`);
    refreshSaved();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="voice-button" aria-haspopup="dialog"
        className="flex items-center gap-2 h-10 rounded-full px-4 text-sm font-bold bg-card-2 text-ink-soft hover:text-acc-strong self-start">
        <Mic2 className="w-4 h-4" /> Voice: {chosen ? chosen.label : 'Phone voice'}
        {!info.eligible && <Crown className="w-3.5 h-3.5 text-acc-strong" aria-label="Partner" />}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Reading voice" data-testid="voice-sheet" className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-edge p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif-heading text-lg font-bold text-ink">Reading voice</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-full bg-card-2 text-ink-soft"><X className="w-5 h-5" /></button>
            </div>
            <button onClick={() => choose(null)} className={cn('w-full text-left rounded-2xl border p-3 flex items-center gap-3', !voice ? 'border-acc bg-acc-soft' : 'border-edge bg-card-2')}>
              <span className="flex-1"><span className="block text-sm font-bold text-ink">Phone voice</span><span className="block text-xs text-ink-muted">Free. Your phone reads aloud, even offline.</span></span>
              {!voice && <Check className="w-4 h-4 text-acc-strong" />}
            </button>
            {info.voices.map((v) => (
              <button key={v.id} onClick={() => choose(v.id)} data-testid={`voice-${v.id}`} className={cn('w-full text-left rounded-2xl border p-3 flex items-center gap-3', voice === v.id ? 'border-acc bg-acc-soft' : 'border-edge bg-card-2')}>
                <span className="flex-1"><span className="block text-sm font-bold text-ink">{v.label}</span><span className="block text-xs text-ink-muted">{v.description || 'Premium voice'}</span></span>
                {info.eligible ? (voice === v.id && <Check className="w-4 h-4 text-acc-strong" />) : <span className="flex items-center gap-1 text-[0.625rem] font-bold text-acc-strong"><Crown className="w-3 h-3" /> PARTNER</span>}
              </button>
            ))}
            {!info.eligible && <p className="text-ink-muted text-xs">Premium voices are part of Prayer Fire Partner. Tap one to see the plans.</p>}

            {voice && info.eligible && (
              <div className="rounded-2xl border border-edge p-3 space-y-2">
                <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">Offline listening</p>
                <div className="flex gap-2">
                  {saved ? (
                    <button onClick={async () => { await removeChapterDownload({ voice, translation, book, chapter }); refreshSaved(); }} className="flex-1 py-2 rounded-xl border border-edge-strong text-ink-soft text-xs font-bold flex items-center justify-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Remove this chapter</button>
                  ) : (
                    <button onClick={saveChapter} disabled={busy !== null} data-testid="save-chapter" className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">{busy === 'chapter' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Save {bookName} {chapter}</button>
                  )}
                  <button onClick={saveBook} disabled={busy !== null} className="flex-1 py-2 rounded-xl border border-acc text-acc-strong text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">{busy === 'book' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Save the book</button>
                </div>
                {progress && <p className="text-ink-muted text-xs">{progress}</p>}
                {saved && !message && <p className="text-acc-strong text-xs font-semibold">This chapter is saved on your phone.</p>}
                {message && <p role="status" className="text-ink-soft text-xs">{message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
