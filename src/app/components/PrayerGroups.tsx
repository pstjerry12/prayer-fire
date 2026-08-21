'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users, Plus, ChevronRight, ChevronLeft, Send, Siren, Clock, BookOpen,
  LogOut, Trash2, ShieldCheck, UserPlus, Copy, Check, Pin, Flame,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';
import type { PrayerGroup } from '@/app/types';

const TIME_OPTIONS = ['04:00', '05:00', '06:00', '12:00', '15:00', '18:00', '21:00', '00:00'];

function fmtTime(t?: string) {
  if (!t) return 'Not set';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function PrayerGroups() {
  const {
    groups, messages, user, isPremium, setShowAuth, setShowPricing,
    createGroup, joinGroup, leaveGroup, deleteGroup,
    setGroupPrayerTime, setGroupVerse, togglePrayedToday, promoteMember, removeMember, sendMessage,
  } = useApp();

  const [view, setView] = useState<'list' | 'detail' | 'create' | 'join'>('list');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('05:00');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Chat
  const [draft, setDraft] = useState('');

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;
  const groupMessages = activeGroupId
    ? messages.filter((m) => m.groupId === activeGroupId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    const g = createGroup(newName, newDesc, newTime);
    setActiveGroupId(g.id);
    setNewName('');
    setNewDesc('');
    setView('detail');
    playChime();
  };

  const handleJoin = () => {
    const ok = joinGroup(joinCode);
    if (!ok) {
      setJoinError('No group found with that code.');
      return;
    }
    setJoinCode('');
    setJoinError('');
    setView('list');
    playChime();
  };

  const copyCode = async (g: PrayerGroup) => {
    try {
      await navigator.clipboard.writeText(g.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isAdmin = activeGroup ? activeGroup.admins.includes(user?.id || user?.name || '') : false;
  const isMember = activeGroup ? activeGroup.members.includes(user?.name || 'Me') : false;

  // "I prayed today" tracker
  const todayStr = new Date().toDateString();
  const memberKey = user?.name || 'Me';
  const prayedTodayCount = activeGroup
    ? Object.values(activeGroup.prayedToday || {}).filter((d) => d === todayStr).length
    : 0;
  const iPrayedToday = activeGroup
    ? (activeGroup.prayedToday || {})[memberKey] === todayStr
    : false;

  const prayedCount = (g: PrayerGroup) =>
    Object.values(g.prayedToday || {}).filter((d) => d === todayStr).length;

  const handleSend = (kind: 'message' | 'alert') => {
    if (!activeGroupId || !draft.trim()) return;
    sendMessage(activeGroupId, draft, kind);
    setDraft('');
    if (kind === 'alert') playChime();
  };

  // ── Premium gate ──────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="bg-card rounded-2xl border border-edge shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-acc-soft text-acc flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="font-serif-heading text-xl font-bold text-ink mb-2">Prayer Fire Partner</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-5">
          Create WhatsApp-style prayer groups for your church or prayer team, send emergency
          prayer alerts, and set a time to pray together. Upgrade to unlock the full
          intercessory community.
        </p>
        <ul className="text-left text-ink-soft text-xs space-y-1.5 max-w-xs mx-auto mb-5">
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Prayer groups with 3 admins + members</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Emergency prayer alerts</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Group prayer time + pinned verses</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Voice-to-text prayer writing</li>
        </ul>
        <button
          onClick={() => setShowPricing(true)}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500"
        >
          Start 7-Day Free Trial
        </button>
      </div>
    );
  }

  // ── Create ────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="font-serif-heading text-lg font-bold text-ink">Create a Prayer Group</h2>
        <input
          type="text"
          placeholder="Group name (e.g. Redeemed Church Prayer Team)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <textarea
          placeholder="Description (what does this group pray for?)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={3}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Group prayer time (pray together)
          </label>
          <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink focus:outline-none">
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
        </div>
        <button onClick={handleCreate} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>
    );
  }

  // ── Join ──────────────────────────────────────────────────────
  if (view === 'join') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="font-serif-heading text-lg font-bold text-ink">Join a Group</h2>
        <p className="text-ink-muted text-sm">Enter the invite code shared by the group admin.</p>
        <input
          type="text"
          placeholder="Invite code (e.g. AB12CD)"
          value={joinCode}
          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        {joinError && <p className="text-danger text-xs">{joinError}</p>}
        <button onClick={handleJoin} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Join Group
        </button>
      </div>
    );
  }

  // ── Detail (chat) ─────────────────────────────────────────────
  if (view === 'detail' && activeGroup) {
    return (
      <div className="space-y-3">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc">
          <ChevronLeft className="w-4 h-4" /> Groups
        </button>

        {/* Header */}
        <div className="bg-card rounded-2xl border border-edge p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {activeGroup.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-ink truncate">{activeGroup.name}</h2>
                <p className="text-ink-muted text-xs truncate">{activeGroup.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => copyCode(activeGroup)} className="p-2 text-ink-muted hover:text-acc" title="Copy invite code">
                {copied ? <Check className="w-4 h-4 text-acc" /> : <Copy className="w-4 h-4" />}
              </button>
              {isAdmin ? (
                <button onClick={() => { deleteGroup(activeGroup.id); setView('list'); }} className="p-2 text-ink-muted hover:text-danger" title="Delete group">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => { leaveGroup(activeGroup.id); setView('list'); }} className="p-2 text-ink-muted hover:text-danger" title="Leave group">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="bg-acc-soft text-acc-strong px-2 py-1 rounded-full flex items-center gap-1">
              <Users className="w-3 h-3" /> {activeGroup.members.length} members
            </span>
            <span className="bg-warn-soft text-warn-strong px-2 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pray at {fmtTime(activeGroup.prayerTime)}
            </span>
            <span className="bg-acc-soft text-acc-strong px-2 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {activeGroup.admins.length} admins
            </span>
            <span className={cn('px-2 py-1 rounded-full flex items-center gap-1', prayedTodayCount > 0 ? 'bg-warn-soft text-warn-strong' : 'bg-card-2 text-ink-muted')}>
              <Flame className="w-3 h-3" /> {prayedTodayCount} prayed today
            </span>
          </div>

          {/* Invite code (admins) */}
          {isAdmin && (
            <button onClick={() => copyCode(activeGroup)} className="mt-3 w-full text-left bg-card-2 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-ink-muted text-xs">Invite code</span>
              <span className="text-ink font-bold tracking-widest">{activeGroup.inviteCode}</span>
            </button>
          )}
        </div>

        {/* I prayed today */}
        {isMember && (
          <button
            onClick={() => togglePrayedToday(activeGroup.id)}
            className={cn(
              'w-full rounded-2xl border p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all',
              iPrayedToday
                ? 'bg-acc-soft border-acc-edge text-acc-strong'
                : 'bg-card border-edge text-ink-muted hover:border-warn-edge'
            )}
          >
            <Flame className={cn('w-4 h-4', iPrayedToday && 'animate-flicker')} />
            {iPrayedToday ? 'I prayed today ✓' : 'Mark: I prayed today'}
            {prayedTodayCount > 0 && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', iPrayedToday ? 'bg-acc text-white' : 'bg-card-2 text-ink-muted')}>
                {prayedTodayCount}
              </span>
            )}
          </button>
        )}

        {/* Pinned verse + prayer time (admin controls) */}
        {isAdmin && (
          <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1">
                <Pin className="w-3 h-3" /> Pinned verse
              </label>
              <input
                type="text"
                placeholder="e.g. Psalm 133:1"
                defaultValue={activeGroup.pinnedVerse}
                onBlur={(e) => setGroupVerse(activeGroup.id, e.target.value)}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" /> Group prayer time
              </label>
              <select value={activeGroup.prayerTime || ''} onChange={(e) => setGroupPrayerTime(activeGroup.id, e.target.value)} className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Pinned verse display */}
        {activeGroup.pinnedVerse && (
          <div className="bg-acc-soft border border-acc-edge rounded-xl p-3 text-center">
            <p className="text-acc-strong text-xs font-semibold uppercase tracking-wider mb-1">📖 Praying together</p>
            <p className="text-ink-soft text-sm italic">{activeGroup.pinnedVerse}</p>
          </div>
        )}

        {/* Chat messages */}
        <div className="bg-card rounded-2xl border border-edge p-3 space-y-2 max-h-72 overflow-y-auto">
          {groupMessages.length === 0 ? (
            <p className="text-center text-ink-faint text-xs py-6">No messages yet. Start praying together!</p>
          ) : (
            groupMessages.map((m) => (
              <div key={m.id} className={cn('rounded-xl p-3', m.kind === 'alert' ? 'bg-danger-soft border border-danger-edge' : 'bg-card-2')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-ink font-bold text-xs">{m.senderName}</span>
                  {m.kind === 'alert' && (
                    <span className="bg-danger text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Siren className="w-2.5 h-2.5" /> EMERGENCY
                    </span>
                  )}
                </div>
                <p className={cn('text-sm', m.kind === 'alert' ? 'text-danger-strong font-semibold' : 'text-ink-soft')}>{m.text}</p>
                <p className="text-ink-faint text-[9px] mt-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="bg-card rounded-2xl border border-edge p-3">
          <input
            type="text"
            placeholder="Share a prayer point..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend('message')}
            className="w-full bg-card border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleSend('message')} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500">
              <Send className="w-4 h-4" /> Send
            </button>
            <button onClick={() => handleSend('alert')} className="flex-1 py-2 bg-danger text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-red-500">
              <Siren className="w-4 h-4" /> Prayer Alert
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setView('create')} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500">
          <Plus className="w-4 h-4" /> Create Group
        </button>
        <button onClick={() => setView('join')} className="flex-1 py-2.5 bg-card text-ink-soft border border-edge rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-card-2">
          <UserPlus className="w-4 h-4" /> Join Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card rounded-2xl border border-edge p-8 text-center">
          <Users className="w-10 h-10 text-ink-ghost mx-auto mb-2" />
          <p className="text-ink-muted text-sm">No groups yet</p>
          <p className="text-ink-faint text-xs mt-1">Create your first prayer group for your church or prayer team.</p>
        </div>
      ) : (
        groups.map((g) => (
          <button
            key={g.id}
            onClick={() => { setActiveGroupId(g.id); setView('detail'); }}
            className="w-full bg-card border border-edge rounded-2xl p-4 text-left hover:border-acc-edge transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {g.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm truncate">{g.name}</h3>
                <p className="text-ink-muted text-xs truncate">{g.description || 'No description'}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-acc-strong text-[10px] font-semibold flex items-center gap-0.5"><Users className="w-3 h-3" /> {g.members.length}</span>
                  <span className="text-warn-strong text-[10px] font-semibold flex items-center gap-0.5"><Clock className="w-3 h-3" /> {fmtTime(g.prayerTime)}</span>
                  {prayedCount(g) > 0 && (
                    <span className="text-warn-strong text-[10px] font-semibold flex items-center gap-0.5"><Flame className="w-3 h-3" /> {prayedCount(g)}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </div>
          </button>
        ))
      )}
    </div>
  );
}
