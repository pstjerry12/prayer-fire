'use client';

import { useState } from 'react';
import { Ban, ChevronDown, ChevronUp, EyeOff, Flag, ShieldCheck, Trash2, UserMinus, Users } from 'lucide-react';
import { cn } from '../utils/cn';
import type { GroupDetail } from '@/lib/groups';

type Act = (body: Record<string, unknown>) => Promise<unknown>;

/** Reasons a member can pick when reporting a post or comment. */
export const REPORT_REASONS = ['Spam or advertising', 'Rude or offensive', 'Not appropriate for this group', 'Other'];

/** The queue of reported posts and comments, for the group's leaders and co-leaders. */
export function ReportsQueue({ detail, busy, act }: { detail: GroupDetail; busy: boolean; act: Act }) {
  const items = detail.reports;
  if (!detail.canModerate) return null;
  return (
    <div className={cn('rounded-2xl border p-3', items.length ? 'bg-card border-danger-edge' : 'bg-card border-edge')}>
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-danger-strong flex items-center gap-1 mb-2">
        <Flag className="w-3 h-3" /> Reports{items.length ? ` (${items.length})` : ''}
      </p>
      {items.length === 0 ? (
        <p className="text-ink-faint text-xs">Nothing reported. Members can report a post or comment, and it will appear here.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="bg-card-2 rounded-lg p-3 space-y-1.5">
              <p className="text-[0.6875rem] text-ink-muted">
                <span className="font-bold uppercase">{r.targetType}</span> by <span className="font-semibold text-ink">{r.authorName}</span>
                {r.hidden && <span className="ml-1.5 bg-warn-soft text-warn-strong px-1.5 py-0.5 rounded-full font-bold">hidden</span>}
              </p>
              <p className="text-sm text-ink-soft whitespace-pre-wrap break-words line-clamp-4">{r.text}</p>
              <p className="text-[0.6875rem] text-danger-strong">
                Reported {r.count} {r.count === 1 ? 'time' : 'times'}: {r.reasons.slice(0, 3).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {!r.hidden && (
                  <button disabled={busy} onClick={() => act({ action: 'resolveReport', reportId: r.id, resolution: 'hide' })}
                    className="px-2.5 py-1.5 bg-warn-soft text-warn-strong rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"><EyeOff className="w-3.5 h-3.5" /> Hide</button>
                )}
                <button disabled={busy} onClick={() => { if (confirm(`Delete this ${r.targetType} for everyone?`)) act({ action: 'resolveReport', reportId: r.id, resolution: 'delete' }); }}
                  className="px-2.5 py-1.5 bg-danger text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                <button disabled={busy} onClick={() => act({ action: 'resolveReport', reportId: r.id, resolution: 'dismiss' })}
                  className="px-2.5 py-1.5 bg-card-3 text-ink-soft rounded-lg text-xs font-bold disabled:opacity-60">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Active members and blocked people: appoint co-leaders, remove or block members. The database enforces who may do what. */
export function MembersManager({ detail, busy, act }: { detail: GroupDetail; busy: boolean; act: Act }) {
  const [open, setOpen] = useState(false);
  const [hidePosts, setHidePosts] = useState(true);
  if (!detail.canModerate) return null;
  const iAmLeader = detail.myRole === 'leader';
  const active = detail.members.filter((m) => m.status === 'active');
  const blocked = detail.members.filter((m) => m.status === 'blocked');
  const gid = detail.group.id;

  return (
    <div className="bg-card rounded-2xl border border-edge p-3">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Members and co-leaders ({active.length})</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={hidePosts} onChange={(e) => setHidePosts(e.target.checked)} /> When removing or blocking, also hide their posts and comments
          </label>
          {active.map((m) => {
            const canAct = !m.mine && m.userId && m.role !== 'leader' && (iAmLeader || m.role === 'member');
            return (
              <div key={m.userId ?? m.displayName} className="bg-card-2 rounded-lg px-3 py-2 space-y-1.5">
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                  {m.displayName}{m.mine ? ' (you)' : ''}
                  {m.role !== 'member' && (
                    <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> {m.role === 'leader' ? 'LEADER' : 'CO-LEADER'}
                    </span>
                  )}
                </p>
                {canAct && (
                  <div className="flex flex-wrap gap-1.5">
                    {iAmLeader && (
                      <button disabled={busy} onClick={() => act({ action: 'setRole', groupId: gid, userId: m.userId, role: m.role === 'co_leader' ? 'member' : 'co_leader' })}
                        className="px-2 py-1 bg-acc-soft text-acc-strong rounded-lg text-[0.6875rem] font-bold disabled:opacity-60">
                        {m.role === 'co_leader' ? 'Remove co-leader' : 'Make co-leader'}
                      </button>
                    )}
                    <button disabled={busy} onClick={() => { if (confirm(`Remove ${m.displayName} from the group? They can ask to join again.`)) act({ action: 'removeMember', groupId: gid, userId: m.userId, block: false, hidePosts }); }}
                      className="px-2 py-1 bg-card-3 text-ink-soft rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><UserMinus className="w-3 h-3" /> Remove</button>
                    <button disabled={busy} onClick={() => { if (confirm(`Block ${m.displayName}? They are removed and cannot join this group again until you unblock them.`)) act({ action: 'removeMember', groupId: gid, userId: m.userId, block: true, hidePosts }); }}
                      className="px-2 py-1 bg-danger text-white rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Ban className="w-3 h-3" /> Block</button>
                  </div>
                )}
              </div>
            );
          })}
          {blocked.length > 0 && (
            <div className="pt-1">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-danger-strong mb-1">Blocked ({blocked.length})</p>
              {blocked.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 bg-card-2 rounded-lg px-3 py-2 mb-1.5">
                  <span className="text-sm text-ink-soft truncate">{m.displayName}</span>
                  <button disabled={busy} onClick={() => act({ action: 'unblock', groupId: gid, userId: m.userId })}
                    className="px-2 py-1 bg-card-3 text-ink-soft rounded-lg text-[0.6875rem] font-bold shrink-0 disabled:opacity-60">Unblock</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
