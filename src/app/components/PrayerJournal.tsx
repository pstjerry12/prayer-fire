'use client';

import { useEffect, useRef, useState } from 'react';
import { BookHeart, Check, CheckCircle2, Image as ImageIcon, Megaphone, MessageCircle, Plus, Trash2, Undo2 } from 'lucide-react';
import {
  JOURNAL_KEY, MAX_TEXT, addEntry, answered, journalStats, parseJournal, removeEntry, serializeJournal, setAnswered,
  testimonyText, waitedPhrase, waiting, type JournalEntry,
} from '@/lib/prayerJournal';
import { shareImageCard, shareToWhatsApp } from '@/lib/shareImage';

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * "My Prayer Journal": write what you are praying for, mark it answered with the date, and share an answered prayer as a
 * testimony (anonymously, after admin approval), a picture, or on WhatsApp. Kept on this phone only.
 */
export default function PrayerJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [answering, setAnswering] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'waiting' | 'answered'>('waiting');
  const entriesRef = useRef<JournalEntry[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const list = parseJournal(window.localStorage.getItem(JOURNAL_KEY));
      entriesRef.current = list;
      setEntries(list);
    } catch { /* storage blocked: start empty */ }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function commit(next: JournalEntry[]) {
    entriesRef.current = next;
    setEntries(next);
    try { window.localStorage.setItem(JOURNAL_KEY, serializeJournal(next)); } catch { /* ignore */ }
  }

  function say(id: string, m: string) {
    setMsg((p) => ({ ...p, [id]: m }));
  }

  async function shareTestimony(e: JournalEntry) {
    say(e.id, 'Sending...');
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimony: testimonyText(e), isAnonymous: true }),
      });
      say(e.id, res.ok ? 'Thank you! Your testimony was sent without your name and will appear once approved.' : 'Could not send. Please try again.');
    } catch {
      say(e.id, 'Could not send. Check your connection and try again.');
    }
  }

  async function sharePicture(e: JournalEntry) {
    const body = e.answerNote || e.text;
    const result = await shareImageCard(body, 'Answered prayer', `Answered prayer: ${body}`, waitedPhrase(e) ? `God answered ${waitedPhrase(e)}` : '');
    if (result === 'saved') say(e.id, 'Picture saved to your downloads.');
    else if (result === 'failed') say(e.id, 'Could not make the picture on this device.');
  }

  const stats = journalStats(entries);
  const list = tab === 'waiting' ? waiting(entries) : answered(entries);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center"><BookHeart className="w-6 h-6 text-acc-strong" /></div>
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-ink">My Prayer Journal</h1>
          <p className="text-xs text-ink-muted">Write it down. Watch what God does. It stays on this phone.</p>
        </div>
      </div>

      <form
        className="bg-card rounded-2xl border border-edge p-4 mb-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          const next = addEntry(entriesRef.current, text);
          if (next !== entriesRef.current) { commit(next); setText(''); setTab('waiting'); }
        }}
      >
        <label htmlFor="journal-text" className="block text-xs font-semibold text-ink-muted mb-1.5">What are you praying for?</label>
        <textarea
          id="journal-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT}
          rows={3}
          placeholder="e.g. Healing for my mother; a job; my children's salvation"
          className="w-full rounded-xl border border-edge bg-card-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-acc"
        />
        <button type="submit" disabled={!text.trim()} className="mt-2 w-full py-2.5 rounded-xl bg-acc text-on-acc font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add to my journal
        </button>
      </form>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center" aria-label="Journal summary">
        {[['Prayers', stats.total], ['Waiting', stats.waiting], ['Answered', stats.answered]].map(([l, n]) => (
          <div key={String(l)} className="bg-card rounded-xl border border-edge py-2">
            <div className="text-lg font-bold text-ink">{n}</div>
            <div className="text-[0.6875rem] text-ink-muted">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3" role="tablist">
        {(['waiting', 'answered'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border ${tab === t ? 'bg-acc text-on-acc border-acc' : 'bg-card text-ink-soft border-edge'}`}
          >
            {t === 'waiting' ? 'Still praying' : 'Answered'}
          </button>
        ))}
      </div>

      {loaded && list.length === 0 && (
        <p className="text-ink-muted text-sm text-center py-8">
          {tab === 'waiting' ? 'Nothing here yet. Add what is on your heart above.' : 'No answered prayers yet. Keep praying: God hears you.'}
        </p>
      )}

      <ul className="space-y-3">
        {list.map((e) => (
          <li key={e.id} className="bg-card rounded-2xl border border-edge p-4" data-testid="journal-entry">
            <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{e.text}</p>
            <p className="text-ink-faint text-xs mt-1">
              Prayed since {fmt(e.createdAt)}
              {e.answeredAt && <> · Answered {fmt(e.answeredAt)} ({waitedPhrase(e)})</>}
            </p>
            {e.answerNote && (
              <p className="mt-2 text-sm text-acc-strong bg-acc-soft rounded-xl px-3 py-2 whitespace-pre-wrap">{e.answerNote}</p>
            )}

            {!e.answeredAt && answering !== e.id && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setAnswering(e.id); setNote(''); }} className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> God answered
                </button>
                <button
                  onClick={() => { if (window.confirm('Delete this prayer from your journal?')) commit(removeEntry(entriesRef.current, e.id)); }}
                  aria-label="Delete this prayer"
                  className="px-3 rounded-xl border border-edge text-ink-muted"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {!e.answeredAt && answering === e.id && (
              <div className="mt-3 space-y-2">
                <label htmlFor={`note-${e.id}`} className="block text-xs font-semibold text-ink-muted">What did God do? (optional)</label>
                <textarea
                  id={`note-${e.id}`}
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  maxLength={MAX_TEXT}
                  rows={2}
                  className="w-full rounded-xl border border-edge bg-card-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-acc"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { commit(setAnswered(entriesRef.current, e.id, true, note)); setAnswering(null); setTab('answered'); }}
                    className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save as answered
                  </button>
                  <button onClick={() => setAnswering(null)} className="px-4 rounded-xl border border-edge text-ink-soft text-xs font-bold">Cancel</button>
                </div>
              </div>
            )}

            {e.answeredAt && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => shareTestimony(e)} className="py-2 rounded-xl bg-acc-soft text-acc-strong text-xs font-bold flex flex-col items-center gap-0.5">
                    <Megaphone className="w-4 h-4" /> Testimony
                  </button>
                  <button onClick={() => sharePicture(e)} className="py-2 rounded-xl bg-acc-soft text-acc-strong text-xs font-bold flex flex-col items-center gap-0.5">
                    <ImageIcon className="w-4 h-4" /> Picture
                  </button>
                  <button onClick={() => shareToWhatsApp(`Answered prayer: ${e.answerNote || e.text}`)} className="py-2 rounded-xl bg-acc-soft text-acc-strong text-xs font-bold flex flex-col items-center gap-0.5">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => commit(setAnswered(entriesRef.current, e.id, false))} className="text-xs text-ink-muted flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" /> Back to still praying</button>
                  <button onClick={() => { if (window.confirm('Delete this prayer from your journal?')) commit(removeEntry(entriesRef.current, e.id)); }} className="text-xs text-danger flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            )}
            {msg[e.id] && <p className="text-xs text-ink-muted mt-2" role="status">{msg[e.id]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
