'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy, Pencil, Share2, Trash2, X } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { copyText } from '@/lib/clipboard';
import {
  deleteSermon,
  liveEntries,
  removeSermonEntry,
  setActiveSermon,
  updateEntryNote,
  updateSermon,
  useStudy,
  type SermonEntry,
} from '@/lib/study';
import { entryShortName, formatSermonDate, sermonAsText } from '@/lib/studyFormat';

function EntryCard({ sermonId, entry, index, onOpen }: { sermonId: string; entry: SermonEntry; index: number; onOpen: () => void }) {
  const [note, setNote] = useState(entry.note);
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-xl border border-edge bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acc-soft text-acc-strong text-xs font-bold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block w-full text-left">
            <p className="text-acc-strong text-xs font-semibold mb-1">
              {entry.reference}
              <span className="ml-1.5 text-ink-muted font-medium">· {entryShortName(entry)}</span>
            </p>
            <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{entry.text}&rdquo;</p>
          </button>

          {editing || note ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onFocus={() => setEditing(true)}
              onBlur={() => {
                setEditing(false);
                if (note !== entry.note) updateEntryNote(sermonId, entry.id, note);
              }}
              rows={note ? Math.min(6, Math.max(2, Math.ceil(note.length / 40))) : 2}
              maxLength={5000}
              placeholder="Your note on this verse…"
              className="mt-2 w-full bg-card-2 border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="mt-2 flex items-center gap-1 text-xs font-bold text-acc hover:underline">
              <Pencil className="w-3 h-3" /> Add a note
            </button>
          )}
        </div>
        <button onClick={() => removeSermonEntry(sermonId, entry.id)} aria-label="Remove verse from sermon" className="p-1.5 rounded-lg text-ink-faint hover:text-danger hover:bg-card-3 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

/** One sermon: its verses in the order they were added, with an optional note on each. */
export default function SermonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const study = useStudy();
  const [copied, setCopied] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sermon = study.sermons[decodeURIComponent(params.id ?? '')];
  const visible = sermon && !sermon.deleted ? sermon : null;
  const entries = visible ? liveEntries(visible) : [];
  const active = visible ? study.activeSermonId === visible.id : false;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleCopy() {
    if (!visible) return;
    if (await copyText(sermonAsText(visible, entries))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Sermon Notes
        </button>

        {!visible ? (
          <div className="bg-card rounded-2xl border border-edge p-8 text-center">
            <p className="text-ink-muted text-sm">That sermon could not be found.</p>
            <button onClick={() => router.push('/study')} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
              Open My Study
            </button>
          </div>
        ) : (
          <>
            <header className="mb-5">
              {editingMeta ? (
                <div className="space-y-2">
                  <input
                    defaultValue={visible.title}
                    onBlur={(e) => updateSermon(visible.id, { title: e.target.value.trim() || 'Untitled sermon' })}
                    maxLength={200}
                    aria-label="Sermon title"
                    className="w-full bg-card border border-edge-strong rounded-xl px-3 py-2 text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <input
                    defaultValue={visible.preacher}
                    onBlur={(e) => updateSermon(visible.id, { preacher: e.target.value })}
                    maxLength={200}
                    placeholder="Preacher"
                    aria-label="Preacher"
                    className="w-full bg-card border border-edge-strong rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <input
                    type="date"
                    defaultValue={visible.date}
                    onBlur={(e) => e.target.value && updateSermon(visible.id, { date: e.target.value })}
                    aria-label="Date"
                    className="w-full bg-card border border-edge-strong rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <button onClick={() => setEditingMeta(false)} className="flex items-center gap-1 text-xs font-bold text-acc">
                    <Check className="w-3.5 h-3.5" /> Done
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="font-serif-heading text-2xl font-bold text-ink">{visible.title}</h1>
                    <p className="text-sm text-ink-muted mt-0.5">{[visible.preacher, formatSermonDate(visible.date)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => setEditingMeta(true)} aria-label="Edit sermon details" className="p-2 rounded-lg text-ink-muted hover:bg-card-3 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </header>

            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setActiveSermon(active ? null : visible.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold',
                  active ? 'bg-warn-soft border border-warn-edge text-warn-strong' : 'bg-emerald-600 text-white'
                )}
              >
                {active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {active ? 'End session' : 'Use as active session'}
              </button>
              <button onClick={handleCopy} disabled={entries.length === 0} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card-2 text-ink-soft text-xs font-bold hover:bg-card-3 disabled:opacity-50">
                {copied ? <Check className="w-4 h-4 text-acc" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy list'}
              </button>
              {canShare && (
                <button
                  onClick={() => navigator.share({ title: visible.title, text: sermonAsText(visible, entries) }).catch(() => {})}
                  disabled={entries.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-card-2 text-ink-soft text-xs font-bold hover:bg-card-3 disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>

            {active && (
              <p className="mb-4 rounded-lg bg-warn-soft border border-warn-edge px-3 py-2 text-xs text-ink-soft">
                This is your active session. In the Bible, hold a verse and choose <strong>Add to Sermon Notes</strong> to save it here.
              </p>
            )}

            {entries.length === 0 ? (
              <div className="bg-card rounded-2xl border border-edge p-8 text-center">
                <p className="font-bold text-ink text-sm">No verses yet</p>
                <p className="text-xs text-ink-muted mt-1.5 max-w-xs mx-auto">Make this the active session, then hold verses in the Bible and choose Add to Sermon Notes.</p>
              </div>
            ) : (
              <ol className="space-y-3">
                {entries.map((entry, i) => (
                  <EntryCard
                    key={entry.id}
                    sermonId={visible.id}
                    entry={entry}
                    index={i}
                    onOpen={() => router.push(`/bible/verse/${entry.osis}/${entry.chapter}/${entry.verse}`)}
                  />
                ))}
              </ol>
            )}

            <div className="mt-8 pt-5 border-t border-edge">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-ink-muted flex-1">Delete this sermon and its notes?</p>
                  <button
                    onClick={() => {
                      deleteSermon(visible.id);
                      router.replace('/study');
                    }}
                    className="px-3 py-2 rounded-lg bg-danger-soft border border-danger-edge text-danger text-xs font-bold"
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg bg-card-2 text-ink-soft text-xs font-bold">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-danger">
                  <Trash2 className="w-3.5 h-3.5" /> Delete sermon
                </button>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
