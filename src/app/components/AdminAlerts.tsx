'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pin, Plus, Siren, Trash2, X } from 'lucide-react';
import type { AlertDetail, AlertSummary, AltarRequest } from '@/lib/alerts';

const field = 'w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint';
type Row = AlertSummary & { status: string };
interface Form { id: string | null; title: string; country: string; summary: string; scriptures: string; points: string; pinned: boolean; status: 'live' | 'draft' | 'ended' }
const EMPTY: Form = { id: null, title: '', country: '', summary: '', scriptures: '', points: '', pinned: false, status: 'live' };

/** Admin -> Alerts: post and manage Global Prayer Alerts, add updates and answered-prayer testimonies, approve Leaders' public altars. */
export default function AdminAlerts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [requests, setRequests] = useState<AltarRequest[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [open, setOpen] = useState<AlertDetail | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const apply = (d: { alerts: Row[]; requests: AltarRequest[] }) => { setRows(d.alerts); setRequests(d.requests); };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/alerts', { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) apply(d);
      else setMessage({ kind: 'error', text: d.error || 'Could not load.' });
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
      const res = await fetch('/api/admin/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) { apply(d); setMessage({ kind: 'ok', text: done }); setBusy(false); return d; }
      setMessage({ kind: 'error', text: d.error || 'Could not do that.' });
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setBusy(false);
    return null;
  }

  async function openAlert(id: string) {
    const res = await fetch(`/api/admin/alerts?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const d = await res.json();
    if (res.ok) { setOpen(d.alert); setUpdateText(''); }
  }

  function edit(a: AlertDetail) {
    setForm({ id: a.id, title: a.title, country: a.country ?? '', summary: a.summary, scriptures: a.scriptures.join('\n'), points: a.points.join('\n'), pinned: a.pinned, status: a.status });
  }

  async function save() {
    if (!form) return;
    const body = { action: form.id ? 'update' : 'create', id: form.id, title: form.title, country: form.country, summary: form.summary, scriptures: form.scriptures, points: form.points, pinned: form.pinned, status: form.status };
    const d = await run(body, form.id ? 'Saved.' : form.status === 'draft' ? 'Saved as a draft.' : 'Posted. It is live for everyone now.');
    if (d) setForm(null);
  }

  return (
    <section className="space-y-4" aria-label="Global Prayer Alerts">
      <div className="bg-card rounded-2xl border border-edge p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-ink flex items-center gap-1.5"><Siren className="w-4 h-4" /> Global Prayer Alerts</h3>
            <p className="text-ink-muted text-xs mt-1">Urgent worldwide prayer needs. Free for everyone. People tap &quot;I&apos;m praying&quot; and you see the live count and countries.</p>
          </div>
          <button onClick={() => { setForm(EMPTY); setOpen(null); }} className="px-3 py-2 bg-acc text-on-acc rounded-xl text-xs font-bold flex items-center gap-1 flex-shrink-0"><Plus className="w-3.5 h-3.5" /> New alert</button>
        </div>
        <p className="text-ink-faint text-[0.6875rem] leading-relaxed">Phone push notifications to everyone need Firebase set up (see PROJECT_HANDOFF.md, Global Prayer Alerts). Until then people see a live alert on the Home screen and on the Alerts page the next time they open the app.</p>
        {message && <p role="status" className={message.kind === 'ok' ? 'text-sm text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3'}>{message.text}</p>}
      </div>

      {form && (
        <div className="bg-card rounded-2xl border border-acc-edge p-4 space-y-2" data-testid="alert-form">
          <h4 className="font-bold text-ink text-sm">{form.id ? 'Edit alert' : 'New alert'}</h4>
          <input className={field} placeholder="Title (e.g. Pray for the church in Nigeria)" aria-label="Alert title" maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={field} placeholder="Country or place (leave empty for worldwide)" aria-label="Alert country" maxLength={60} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <textarea className={field} rows={3} placeholder="Summary: what is happening" aria-label="Alert summary" maxLength={2000} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <textarea className={field} rows={2} placeholder={'Scriptures, one per line\nPsalm 91:1-2'} aria-label="Alert scriptures" value={form.scriptures} onChange={(e) => setForm({ ...form, scriptures: e.target.value })} />
          <textarea className={field} rows={4} placeholder={'Prayer points, one per line'} aria-label="Alert prayer points" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pin to the top</label>
            <label className="flex items-center gap-1.5">Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'] })} className="bg-card border border-edge-strong rounded-lg px-2 py-1 text-xs">
                <option value="live">Live (everyone sees it)</option><option value="draft">Draft (only you)</option>{form.id && <option value="ended">Ended</option>}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button disabled={busy || form.title.trim().length < 3} onClick={save} className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {form.id ? 'Save' : 'Post alert'}</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold">Cancel</button>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="bg-card rounded-2xl border border-edge p-4 space-y-2" data-testid="altar-requests">
          <h4 className="font-bold text-ink text-sm">Public altars waiting for approval</h4>
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-edge p-3 space-y-1.5">
              <p className="font-bold text-ink text-sm">{r.title}{r.country ? ` · ${r.country}` : ''}</p>
              <p className="text-ink-muted text-xs">By {r.authorName}</p>
              {r.summary && <p className="text-ink-soft text-xs whitespace-pre-line">{r.summary}</p>}
              {r.scriptures.length > 0 && <p className="text-ink-muted text-xs">Scriptures: {r.scriptures.join(', ')}</p>}
              {r.points.length > 0 && <ol className="list-decimal pl-5 text-xs text-ink-soft">{r.points.map((p) => <li key={p}>{p}</li>)}</ol>}
              <input className={field} placeholder="Note to the leader (shown if you decline)" aria-label={`Note for ${r.title}`} maxLength={300} value={notes[r.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => run({ action: 'approveRequest', requestId: r.id }, 'Approved. It is live for everyone.')} className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Approve</button>
                <button disabled={busy} onClick={() => run({ action: 'rejectRequest', requestId: r.id, note: notes[r.id] ?? '' }, 'Declined.')} className="flex-1 py-2 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-edge p-4 space-y-2">
        <h4 className="font-bold text-ink text-sm">All alerts</h4>
        {loading ? <div className="flex justify-center py-3 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div> : rows.length === 0 ? <p className="text-ink-muted text-sm">No alerts yet.</p> : rows.map((a) => (
          <div key={a.id} data-testid="admin-alert-row" className="rounded-xl border border-edge p-3">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => openAlert(a.id)} className="text-left min-w-0">
                <p className="font-bold text-ink text-sm flex items-center gap-1.5">{a.pinned && <Pin className="w-3 h-3 text-acc-strong" />}{a.title}</p>
                <p className="text-ink-muted text-xs">{a.status} · {a.praying.toLocaleString()} praying · {a.countries} {a.countries === 1 ? 'country' : 'countries'}{a.source === 'leader' ? ` · by ${a.authorName}` : ''}</p>
              </button>
              <div className="flex gap-1.5 flex-shrink-0">
                {a.status === 'live' ? <button disabled={busy} onClick={() => run({ action: 'setStatus', id: a.id, status: 'ended' }, 'Ended.')} className="px-2.5 py-1.5 rounded-lg border border-edge-strong text-ink-soft text-xs font-bold">End</button>
                  : <button disabled={busy} onClick={() => run({ action: 'setStatus', id: a.id, status: 'live' }, 'It is live again.')} className="px-2.5 py-1.5 rounded-lg bg-acc-soft text-acc-strong text-xs font-bold">Make live</button>}
                <button disabled={busy} aria-label={`Delete ${a.title}`} onClick={() => { if (confirm('Delete this alert for good, with its prayer count and updates?')) run({ action: 'delete', id: a.id }, 'Deleted.').then(() => setOpen(null)); }} className="p-1.5 rounded-lg text-ink-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {open?.id === a.id && (
              <div className="mt-3 space-y-2 border-t border-edge pt-3">
                <button onClick={() => edit(open)} className="text-acc-strong text-xs font-bold">Edit this alert</button>
                <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">Updates and answered prayers</p>
                {open.updates.map((u) => (
                  <div key={u.id} className="flex items-start justify-between gap-2 bg-card-2 rounded-lg p-2">
                    <p className="text-xs text-ink-soft"><strong>{u.kind === 'testimony' ? 'Answered prayer' : 'Update'}:</strong> {u.body}</p>
                    <button aria-label="Delete update" onClick={() => run({ action: 'deleteUpdate', updateId: u.id }, 'Removed.').then(() => openAlert(a.id))} className="text-ink-faint hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <textarea className={field} rows={2} placeholder="Write an update or an answered-prayer testimony" aria-label="Update text" value={updateText} onChange={(e) => setUpdateText(e.target.value)} />
                <div className="flex gap-2">
                  {(['update', 'testimony'] as const).map((k) => (
                    <button key={k} disabled={busy || updateText.trim().length < 2} onClick={() => run({ action: 'addUpdate', id: a.id, kind: k, body: updateText }, k === 'testimony' ? 'Answered prayer posted.' : 'Update posted.').then((d) => { if (d) { setUpdateText(''); openAlert(a.id); } })}
                      className="flex-1 py-2 rounded-xl bg-acc text-on-acc text-xs font-bold disabled:opacity-60">{k === 'testimony' ? 'Post as answered prayer' : 'Post update'}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
