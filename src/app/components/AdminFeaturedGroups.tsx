'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Star, Trash2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { FeatureRequest, FeaturedGroup } from '@/lib/featuredAdmin';

const card = 'bg-card rounded-2xl border border-edge p-4';
const input = 'bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint';
const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
// A chosen date means "until the end of that day" in the admin's own time.
const endOfDay = (date: string) => (date ? new Date(`${date}T23:59:59`).toISOString() : null);

/** Admin → Featured Groups: approve or decline leaders' requests, set or change an end date, remove featured groups. */
export default function AdminFeaturedGroups() {
  const [pending, setPending] = useState<FeatureRequest[]>([]);
  const [featured, setFeatured] = useState<FeaturedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [ends, setEnds] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/featured', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setPending(data.pending);
        setFeatured(data.featured);
      } else {
        setMessage({ kind: 'error', text: data.error || 'Could not load.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/featured', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setPending(data.pending);
        setFeatured(data.featured);
        setMessage({ kind: 'ok', text: done });
      } else {
        setMessage({ kind: 'error', text: data.error || 'Could not do that.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setBusy(false);
  }

  if (loading) return <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</p>;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-serif-heading font-bold text-ink flex items-center gap-2"><Star className="w-4 h-4 text-warn-strong" /> Featured groups</h2>
        <p className="text-ink-muted text-xs mt-1 leading-relaxed">
          Leaders can ask to have their group featured. Approved groups get a Featured badge and appear first in the groups list and in search.
          You can give an end date (the group then stops being featured by itself) or leave it open and remove it later.
        </p>
      </div>

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={cn('text-sm rounded-xl px-3 py-2', message.kind === 'ok' ? 'bg-acc-soft text-acc-strong' : 'bg-danger-soft text-danger-strong')}>{message.text}</p>
      )}

      <div className={card}>
        <h3 className="font-bold text-ink text-sm mb-2">Requests waiting ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="text-ink-faint text-xs">No requests right now.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="bg-card-2 rounded-xl p-3 space-y-2">
                <div>
                  <p className="font-bold text-ink text-sm">{r.groupName}</p>
                  <p className="text-xs text-ink-muted">Led by {r.leaderName} · {r.members} {r.members === 1 ? 'member' : 'members'} · asked {fmt(r.createdAt)}</p>
                  {r.message && <p className="text-sm text-ink-soft mt-1 whitespace-pre-wrap break-words">&ldquo;{r.message}&rdquo;</p>}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold text-ink-muted">Feature until (optional)
                    <input type="date" value={ends[r.id] ?? ''} onChange={(e) => setEnds({ ...ends, [r.id]: e.target.value })} aria-label={`End date for ${r.groupName}`} className={cn(input, 'block mt-1')} />
                  </label>
                  <button disabled={busy} onClick={() => run({ action: 'approve', id: r.id, until: endOfDay(ends[r.id] ?? '') }, `${r.groupName} is now featured.`)}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-500 disabled:opacity-60"><Check className="w-3.5 h-3.5" /> Approve</button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <input value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={200} placeholder="Reason shown to the leader (optional)" aria-label={`Reason for declining ${r.groupName}`} className={cn(input, 'flex-1 min-w-[10rem]')} />
                  <button disabled={busy} onClick={() => run({ action: 'reject', id: r.id, note: notes[r.id] ?? '' }, `Declined ${r.groupName}.`)}
                    className="px-3 py-2 bg-card-3 text-ink-soft rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"><X className="w-3.5 h-3.5" /> Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className="font-bold text-ink text-sm mb-2">Featured now ({featured.filter((g) => g.active).length})</h3>
        {featured.length === 0 ? (
          <p className="text-ink-faint text-xs">No group is featured.</p>
        ) : (
          <div className="space-y-3">
            {featured.map((g) => (
              <div key={g.groupId} className="bg-card-2 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-sm truncate">{g.name}</p>
                    <p className="text-xs text-ink-muted">Led by {g.leaderName} · {g.members} {g.members === 1 ? 'member' : 'members'}</p>
                    <p className="text-xs text-ink-muted">{g.until ? `${g.active ? 'Featured until' : 'Ended on'} ${fmt(g.until)}` : 'No end date'}</p>
                  </div>
                  <span className={cn('text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full shrink-0', g.active ? 'bg-acc-soft text-acc-strong' : 'bg-card-3 text-ink-muted')}>{g.active ? 'FEATURED' : 'ENDED'}</span>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold text-ink-muted">{g.active ? 'Change end date' : 'Feature again until'}
                    <input type="date" value={ends[g.groupId] ?? ''} onChange={(e) => setEnds({ ...ends, [g.groupId]: e.target.value })} aria-label={`End date for ${g.name}`} className={cn(input, 'block mt-1')} />
                  </label>
                  <button disabled={busy || !ends[g.groupId]} onClick={() => run({ action: 'setEnd', groupId: g.groupId, until: endOfDay(ends[g.groupId]) }, `Updated the end date for ${g.name}.`)}
                    className="px-3 py-2 bg-card-3 text-ink-soft rounded-lg text-xs font-bold disabled:opacity-60">Save date</button>
                  {g.until && (
                    <button disabled={busy} onClick={() => run({ action: 'setEnd', groupId: g.groupId, until: null }, `${g.name} now has no end date.`)} className="px-3 py-2 bg-card-3 text-ink-soft rounded-lg text-xs font-bold disabled:opacity-60">No end date</button>
                  )}
                  <button disabled={busy} onClick={() => { if (confirm(`Stop featuring ${g.name}?`)) run({ action: 'remove', groupId: g.groupId }, `${g.name} is no longer featured.`); }}
                    className="px-3 py-2 bg-danger text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
