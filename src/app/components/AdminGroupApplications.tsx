'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { GroupApplication } from '@/lib/groupApprovals';

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin → Groups: approve or decline leaders' applications to open a prayer group. */
export default function AdminGroupApplications() {
  const [apps, setApps] = useState<GroupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/group-approvals', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setApps(data.applications);
      else setMessage({ kind: 'error', text: data.error || 'Could not load.' });
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function decide(groupId: string, action: 'approve' | 'reject') {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/group-approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, action, note: notes[groupId] ?? '' }) });
      const data = await res.json();
      if (res.ok) {
        setApps(data.applications);
        setMessage({ kind: 'ok', text: action === 'approve' ? 'Approved. The group is live.' : 'Declined. The leader will see your note.' });
      } else {
        setMessage({ kind: 'error', text: data.error || 'Could not do that.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setBusy(false);
  }

  return (
    <section className="bg-card rounded-2xl border border-edge p-4 space-y-3" aria-label="Group applications">
      <div>
        <h3 className="font-bold text-ink">New group applications</h3>
        <p className="text-ink-muted text-xs mt-1">A Leader applies to open a group. It goes live only when you approve it.</p>
      </div>
      {message && (
        <p role="status" className={message.kind === 'ok' ? 'text-sm text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3'}>
          {message.text}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center py-4 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : apps.length === 0 ? (
        <p className="text-ink-muted text-sm">No applications waiting.</p>
      ) : (
        apps.map((a) => (
          <div key={a.groupId} data-testid="group-application" className="rounded-xl border border-edge p-3 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-bold text-ink">{a.name}</h4>
              <span className="text-ink-faint text-xs">Applied {fmt(a.appliedAt)}</span>
            </div>
            <p className="text-ink-muted text-xs">Leader: {a.leaderName} · {a.joinMode === 'open' ? 'Open to join' : 'Approval needed to join'}{a.prayerTime ? ` · Prayer time ${a.prayerTime}` : ''}{a.hasCallLink ? ' · Has a call link' : ''}</p>
            {a.description && <p className="text-ink-soft text-sm">{a.description}</p>}
            <input
              value={notes[a.groupId] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [a.groupId]: e.target.value }))}
              maxLength={300}
              placeholder="Note to the leader (shown if you decline)"
              aria-label={`Note for ${a.name}`}
              className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint"
            />
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => decide(a.groupId, 'approve')} className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-sm font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Approve</button>
              <button disabled={busy} onClick={() => decide(a.groupId, 'reject')} className="flex-1 py-2 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold hover:bg-card-2 disabled:opacity-60 flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> Decline</button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
