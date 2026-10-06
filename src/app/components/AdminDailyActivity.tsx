'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Copy, Check, Mail, MessageCircle, Trash2, UserPlus, Save,
} from 'lucide-react';
import { cn } from '@/app/utils/cn';
import {
  DEFAULT_REMINDER_TEMPLATE, fillTemplate, whatsappLink, mailtoLink, prettyPhone,
  dayLabel, lastSeenLabel, formatWat, shiftDay,
} from '@/lib/reminders';

interface Person {
  id: string; name: string | null; phone: string | null; email: string | null;
}
interface ActivePerson extends Person { firstSeenAt: string | null }
interface InactivePerson extends Person { lastActiveDay: string | null }

interface ActivityData {
  today: string;
  day: string;
  active: ActivePerson[];
  inactive: InactivePerson[];
  notSignedUp: Person[];
  rosterSignedUp: number;
  history: { day: string; count: number }[];
  totalAccounts: number;
  template: string | null;
}

// "Reminded" ticks live in this browser only (one set per calendar day), so the
// admin doesn't message the same person twice in a day.
const REMINDED_KEY = 'pfm_admin_reminded_v1';
function loadReminded(today: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(REMINDED_KEY) || '{}') as { day?: string; ids?: string[] };
    return raw.day === today ? new Set(raw.ids ?? []) : new Set();
  } catch {
    return new Set();
  }
}
function saveReminded(today: string, ids: Set<string>) {
  try {
    localStorage.setItem(REMINDED_KEY, JSON.stringify({ day: today, ids: [...ids] }));
  } catch { /* storage blocked — ticks just won't persist */ }
}

const inputCls =
  'w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

export default function AdminDailyActivity() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [day, setDay] = useState<string | null>(null); // null = today
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [rosterMsg, setRosterMsg] = useState('');
  const [rosterBusy, setRosterBusy] = useState(false);

  const load = useCallback(async (d: string | null) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/activity${d ? `?day=${d}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load activity');
      const json = (await res.json()) as ActivityData;
      setData(json);
      setReminded(loadReminded(json.today));
      if (json.template) setTemplate((t) => (t === DEFAULT_REMINDER_TEMPLATE ? json.template! : t));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(day);
  }, [day, load]);

  const markReminded = (key: string) => {
    if (!data) return;
    setReminded((prev) => {
      const next = new Set(prev).add(key);
      saveReminded(data.today, next);
      return next;
    });
  };

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2200);
    } catch { /* clipboard blocked */ }
  };

  const saveTemplate = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tester_reminder_template: template }),
    });
    if (res.ok) {
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2200);
    }
  };

  const addRoster = async () => {
    setRosterBusy(true);
    setRosterMsg('');
    const res = await fetch('/api/admin/testers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rosterText }),
    });
    const json = (await res.json().catch(() => ({}))) as { added?: number; skipped?: number; error?: string };
    setRosterBusy(false);
    if (!res.ok) {
      setRosterMsg(json.error || 'Could not add those people.');
      return;
    }
    setRosterMsg(`Added ${json.added}${json.skipped ? ` · ${json.skipped} already on the list` : ''}`);
    setRosterText('');
    load(day);
  };

  const removeRoster = async (id: string) => {
    if (!confirm('Remove this person from your list?')) return;
    await fetch('/api/admin/testers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load(day);
  };

  if (!data) {
    return (
      <div className="bg-card border border-edge rounded-2xl p-8 text-center text-ink-muted text-sm">
        {error ? error : <Loader2 className="w-5 h-5 animate-spin mx-auto text-acc" />}
      </div>
    );
  }

  const isToday = data.day === data.today;
  const maxCount = Math.max(1, ...data.history.map((h) => h.count));
  const needReminder = [...data.inactive.map((p) => ({ key: `u:${p.id}`, p })), ...data.notSignedUp.map((p) => ({ key: `t:${p.id}`, p }))];
  const allPhones = needReminder.map(({ p }) => p.phone).filter((x): x is string => !!x);
  const allEmails = needReminder.map(({ p }) => p.email).filter((x): x is string => !!x);

  // One row's contact + reminder buttons
  const renderRow = (p: Person, rkey: string, sub: string, onRemove?: () => void) => {
    const msg = fillTemplate(template, p.name);
    const done = reminded.has(rkey);
    return (
      <div key={rkey} className="p-3 space-y-2">
        <div className="min-w-0">
          <p className="text-ink font-semibold text-sm truncate">{p.name || 'No name given'}</p>
          <p className="text-ink-soft text-xs break-all">
            {p.phone ? prettyPhone(p.phone) : <span className="text-ink-faint">no phone</span>}
            {p.email ? <span className="text-ink-muted"> · {p.email}</span> : null}
          </p>
          <p className="text-ink-faint text-[0.6875rem]">{sub}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.phone && (
            <a
              href={whatsappLink(p.phone, msg)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => markReminded(rkey)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"
              title="Send a WhatsApp reminder"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {p.email && (
            <a
              href={mailtoLink(p.email, 'Prayer Fire — a quick reminder 🙏', msg)}
              onClick={() => markReminded(rkey)}
              className="p-2 bg-card-2 border border-edge rounded-lg text-ink-soft hover:bg-card-3"
              title="Send an email reminder"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {done && <span className="text-acc text-xs font-bold px-1" title="You sent a reminder today">✓ Reminded</span>}
          {onRemove && (
            <button onClick={onRemove} className="ml-auto p-1.5 text-ink-faint hover:text-danger" title="Remove from list">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Day picker + summary */}
      <div className="bg-card border border-edge rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setDay(shiftDay(data.day, -1))} className="p-2 rounded-lg bg-card-2 border border-edge hover:bg-card-3" aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0">
            <p className="font-bold text-ink text-sm">{dayLabel(data.day, data.today)}</p>
            {!isToday && (
              <button onClick={() => setDay(null)} className="text-acc text-xs font-semibold hover:underline">Back to today</button>
            )}
          </div>
          <button
            onClick={() => setDay(shiftDay(data.day, 1))}
            disabled={isToday}
            className="p-2 rounded-lg bg-card-2 border border-edge hover:bg-card-3 disabled:opacity-40"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-acc-soft rounded-xl py-2.5">
            <p className="text-acc-strong font-bold text-xl">{data.active.length}</p>
            <p className="text-ink-muted text-[0.6875rem]">Opened the app</p>
          </div>
          <div className="bg-warn-soft rounded-xl py-2.5">
            <p className="text-warn font-bold text-xl">{data.inactive.length}</p>
            <p className="text-ink-muted text-[0.6875rem]">Did not open</p>
          </div>
          <div className="bg-card-2 rounded-xl py-2.5">
            <p className="text-ink font-bold text-xl">{data.notSignedUp.length}</p>
            <p className="text-ink-muted text-[0.6875rem]">Not signed up</p>
          </div>
        </div>

        {/* Last 14 days — tap a bar to jump to that day */}
        <div>
          <div className="flex items-end gap-1 h-14" role="group" aria-label="People who opened the app, last 14 days">
            {data.history.map((h) => (
              <button
                key={h.day}
                onClick={() => setDay(h.day === data.today ? null : h.day)}
                className="flex-1 flex flex-col items-center justify-end h-full group"
                title={`${dayLabel(h.day, data.today)}: ${h.count}`}
              >
                <span className="text-[0.5625rem] text-ink-faint leading-none mb-0.5">{h.count || ''}</span>
                <span
                  className={cn('w-full rounded-t', h.day === data.day ? 'bg-emerald-600' : 'bg-acc-soft-2 group-hover:bg-emerald-300')}
                  style={{ height: `${Math.max(h.count ? 6 : 2, (h.count / maxCount) * 36)}px` }}
                />
              </button>
            ))}
          </div>
          <p className="text-ink-faint text-[0.6875rem] mt-1">
            Days are counted in Nigeria time. Only signed-in accounts are counted, starting from the day this feature went live.
          </p>
        </div>
        {loading && <p className="text-ink-faint text-xs flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Updating…</p>}
        {error && <p className="text-danger text-xs">{error}</p>}
      </div>

      {/* Reminder message */}
      <div className="bg-card border border-edge rounded-2xl p-4 space-y-2">
        <h3 className="font-bold text-ink text-sm">Reminder message</h3>
        <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={4} className={cn(inputCls, 'resize-y')} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-ink-faint text-[0.6875rem]">{'{name}'} becomes each person&apos;s first name.</p>
          <button onClick={saveTemplate} className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">
            {templateSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {templateSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Needs a reminder */}
      <div className="bg-card border border-edge rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-edge flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Did not open the app {isToday ? 'today' : 'that day'} ({data.inactive.length})
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'phones', label: 'Copy phones', text: allPhones.map((p) => `+${p}`).join('\n'), n: allPhones.length },
              { id: 'emails', label: 'Copy emails', text: allEmails.join(', '), n: allEmails.length },
              { id: 'msg', label: 'Copy message', text: fillTemplate(template, null), n: 1 },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => copy(b.id, b.text)}
                disabled={b.n === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-card-2 border border-edge rounded-lg text-xs font-semibold text-ink-soft hover:bg-card-3 disabled:opacity-40"
              >
                {copied === b.id ? <Check className="w-3 h-3 text-acc" /> : <Copy className="w-3 h-3" />} {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-edge">
          {data.inactive.map((p) => renderRow(p, `u:${p.id}`, lastSeenLabel(p.lastActiveDay, data.today)))}
          {data.inactive.length === 0 && (
            <p className="text-center text-ink-muted text-sm py-6">
              {data.totalAccounts === 0 ? 'No one has created an account yet.' : 'Everyone with an account opened the app 🎉'}
            </p>
          )}
        </div>
      </div>

      {/* Not signed up */}
      <div className="bg-card border border-edge rounded-2xl overflow-hidden">
        <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">
          Testers who have not signed up yet ({data.notSignedUp.length})
        </p>
        <div className="divide-y divide-edge">
          {data.notSignedUp.map((p) =>
            renderRow(p, `t:${p.id}`, 'No account found for this phone or email', () => removeRoster(p.id))
          )}
          {data.notSignedUp.length === 0 && (
            <p className="text-center text-ink-muted text-sm py-5">
              {data.rosterSignedUp > 0 ? `All ${data.rosterSignedUp} people on your list have signed up 🎉` : 'No one on your list yet.'}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-edge space-y-2">
          <p className="text-ink-muted text-xs">
            Add testers who haven&apos;t made an account so you can remind them too — one per line, like{' '}
            <span className="font-mono">Grace Obi, 0803 123 4567</span>. They leave this list automatically when they sign up with that phone or email.
          </p>
          <textarea
            value={rosterText}
            onChange={(e) => setRosterText(e.target.value)}
            rows={3}
            placeholder={'Grace Obi, 0803 123 4567\nSamuel, samuel@example.com'}
            className={cn(inputCls, 'resize-y')}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={addRoster}
              disabled={rosterBusy || !rosterText.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"
            >
              {rosterBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Add to list
            </button>
            {rosterMsg && <span className="text-ink-muted text-xs">{rosterMsg}</span>}
          </div>
        </div>
      </div>

      {/* Opened the app */}
      <div className="bg-card border border-edge rounded-2xl overflow-hidden">
        <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">
          Opened the app {isToday ? 'today' : 'that day'} ({data.active.length})
        </p>
        <div className="divide-y divide-edge">
          {data.active.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-ink font-semibold text-sm truncate">{p.name || 'No name given'}</p>
                <p className="text-ink-soft text-xs break-all">
                  {p.phone ? prettyPhone(p.phone) : <span className="text-ink-faint">no phone</span>}
                  {p.email ? <span className="text-ink-muted"> · {p.email}</span> : null}
                </p>
              </div>
              {p.firstSeenAt && <span className="text-acc-strong text-xs font-semibold shrink-0">✅ {formatWat(p.firstSeenAt)}</span>}
            </div>
          ))}
          {data.active.length === 0 && (
            <p className="text-center text-ink-muted text-sm py-6">
              No one signed-in opened the app {isToday ? 'yet today' : 'that day'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
