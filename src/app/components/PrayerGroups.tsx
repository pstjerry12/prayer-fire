'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Users, Plus, ChevronRight, ChevronLeft, Send, Siren, Clock, LogOut, Trash2, ShieldCheck,
  UserPlus, Copy, Check, Pin, Flame, Lock, Globe, X, MessageCircle, HandHeart, Sparkles, Loader2, CloudUpload,
  Flag, EyeOff, Eye, Star, Search,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';
import { MembersManager, REPORT_REASONS, ReportsQueue } from './GroupModeration';
import GroupAnalytics from './GroupAnalytics';
import GroupFeaturing from './GroupFeaturing';
import type { DirectoryGroup, GroupComment, GroupDetail, GroupPost, JoinMode, PostKind } from '@/lib/groups';
import {
  fetchComments, fetchDetail, fetchDirectory, groupAction, markLegacyMoved, readLegacyGroups, type LegacyGroup,
} from '@/lib/groupsClient';

const TIME_OPTIONS = ['04:00', '05:00', '06:00', '12:00', '15:00', '18:00', '21:00', '00:00'];

const POST_KINDS: { kind: PostKind; label: string; hint: string }[] = [
  { kind: 'request', label: 'Prayer request', hint: 'Share a need for the group to pray about...' },
  { kind: 'testimony', label: 'Testimony', hint: 'Share what God has done...' },
  { kind: 'message', label: 'Message', hint: 'Share a prayer point...' },
  { kind: 'alert', label: 'Prayer alert', hint: 'Something urgent to pray about now...' },
];

function fmtTime(t?: string | null) {
  if (!t) return 'Not set';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function PrayerGroups() {
  const { user, isPremium, isLeader, isAndroidApp, setShowPricing, markPrayedToday } = useApp();

  const [view, setView] = useState<'list' | 'detail' | 'create' | 'join'>('list');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [directory, setDirectory] = useState<DirectoryGroup[] | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('05:00');
  const [newMode, setNewMode] = useState<JoinMode>('open');
  const [createError, setCreateError] = useState('');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Posting + comments
  const [postKind, setPostKind] = useState<PostKind>('request');
  const [draft, setDraft] = useState('');
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');

  // Reporting a post or comment (the reason picker is open for this item)
  const [reporting, setReporting] = useState<{ postId: string; commentId: string | null } | null>(null);
  const [otherReason, setOtherReason] = useState('');

  // Directory search
  const [search, setSearch] = useState('');

  // Groups made on this phone before groups moved online
  const [legacy, setLegacy] = useState<LegacyGroup[]>([]);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  };

  const loadDirectory = useCallback(async () => {
    const r = await fetchDirectory();
    if (r.ok) {
      setDirectory(r.data.groups);
      setLoadError('');
    } else {
      setLoadError(r.error);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const r = await fetchDetail(id);
    if (r.ok) {
      setDetail(r.data.detail);
      setLoadError('');
    } else if (r.status === 404) {
      setDetail(null);
      setView('list');
    } else {
      setLoadError(r.error);
    }
  }, []);

  // Directory on open; the open group refreshes every 20 seconds so members see each other's posts.
  useEffect(() => {
    if (!isPremium || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLegacy(readLegacyGroups({ id: user.id, name: user.name, email: user.email }));
    loadDirectory();
  }, [isPremium, user, loadDirectory]);

  useEffect(() => {
    if (view !== 'detail' || !activeGroupId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail(activeGroupId);
    const t = setInterval(() => loadDetail(activeGroupId), 20000);
    return () => clearInterval(t);
  }, [view, activeGroupId, loadDetail]);

  const openGroup = (id: string) => {
    setActiveGroupId(id);
    setDetail(null);
    setOpenPostId(null);
    setView('detail');
  };

  const handleCreate = async () => {
    if (!isLeader || !newName.trim() || busy) return;
    setBusy(true);
    setCreateError('');
    const r = await groupAction<{ id: string }>({ action: 'create', name: newName, description: newDesc, joinMode: newMode, prayerTime: newTime });
    setBusy(false);
    if (!r.ok) {
      setCreateError(r.error);
      return;
    }
    setNewName('');
    setNewDesc('');
    setNewMode('open');
    playChime();
    await loadDirectory();
    openGroup(r.data.id);
  };

  const outcomeMessage = (outcome: string, name?: string) =>
    outcome === 'joined' ? `You joined ${name ?? 'the group'}!`
      : outcome === 'pending' ? 'Request sent! The group leader will approve you.'
        : outcome === 'already' ? 'You are already in this group.'
          : outcome === 'blocked' ? 'You cannot join this group.'
            : 'No group found.';

  const handleJoinCode = async () => {
    if (!joinCode.trim() || busy) return;
    setBusy(true);
    const r = await groupAction<{ outcome: string }>({ action: 'joinByCode', code: joinCode });
    setBusy(false);
    if (!r.ok) return setJoinError(r.error);
    if (r.data.outcome === 'notfound') return setJoinError('No group found with that code.');
    setJoinCode('');
    setJoinError('');
    setView('list');
    flashNotice(outcomeMessage(r.data.outcome));
    if (r.data.outcome === 'joined') playChime();
    loadDirectory();
  };

  const handleRequestJoin = async (g: DirectoryGroup) => {
    if (busy) return;
    setBusy(true);
    const r = await groupAction<{ outcome: string }>({ action: 'join', groupId: g.id });
    setBusy(false);
    flashNotice(r.ok ? outcomeMessage(r.data.outcome, g.name) : r.error);
    if (r.ok && r.data.outcome === 'joined') playChime();
    loadDirectory();
  };

  const moveOnline = async (g: LegacyGroup) => {
    if (busy) return;
    setBusy(true);
    const r = await groupAction<{ id: string }>({
      action: 'create', name: g.name, description: g.description, joinMode: g.public ? 'open' : 'approval', prayerTime: g.prayerTime ?? '', pinnedVerse: g.pinnedVerse ?? '',
    });
    setBusy(false);
    if (!r.ok) return flashNotice(r.error);
    markLegacyMoved(g.id);
    setLegacy((prev) => prev.filter((x) => x.id !== g.id));
    flashNotice(`"${g.name}" is now online. Share its invite code so members can join again.`);
    loadDirectory();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const act = async (body: Record<string, unknown>, after?: () => void) => {
    if (busy) return null;
    setBusy(true);
    const r = await groupAction<Record<string, unknown>>(body);
    setBusy(false);
    if (!r.ok) {
      flashNotice(r.error);
      return null;
    }
    if (activeGroupId) await loadDetail(activeGroupId);
    after?.();
    return r.data;
  };

  const handleSend = async () => {
    if (!activeGroupId || !draft.trim()) return;
    const sent = await act({ action: 'post', groupId: activeGroupId, kind: postKind, body: draft });
    if (sent) {
      setDraft('');
      if (postKind === 'alert') playChime();
    }
  };

  const toggleComments = async (p: GroupPost) => {
    if (openPostId === p.id) return setOpenPostId(null);
    setOpenPostId(p.id);
    setCommentDraft('');
    const r = await fetchComments(activeGroupId!, p.id);
    setComments(r.ok ? r.data.comments : []);
  };

  const sendComment = async () => {
    if (!openPostId || !commentDraft.trim()) return;
    const sent = await act({ action: 'comment', postId: openPostId, body: commentDraft });
    if (sent) {
      setCommentDraft('');
      const r = await fetchComments(activeGroupId!, openPostId);
      if (r.ok) setComments(r.data.comments);
    }
  };

  const reloadComments = async () => {
    if (!activeGroupId || !openPostId) return;
    const r = await fetchComments(activeGroupId, openPostId);
    if (r.ok) setComments(r.data.comments);
  };

  /** Runs a moderation/report action, then refreshes the open comments too. */
  const actAndRefresh = async (body: Record<string, unknown>) => {
    const r = await act(body);
    if (r) await reloadComments();
    return r;
  };

  const submitReport = async (reason: string) => {
    if (!reporting || !reason.trim()) return;
    const r = await actAndRefresh({ action: 'report', postId: reporting.postId, commentId: reporting.commentId, reason });
    if (r) {
      setReporting(null);
      setOtherReason('');
      flashNotice('Thank you. The group leaders will look at your report.');
    }
  };

  const toggleCheckin = async () => {
    if (!activeGroupId) return;
    const res = await act({ action: 'checkin', groupId: activeGroupId });
    if (res && res.on === true) markPrayedToday(); // also feeds the global fire streak
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
          Join prayer groups for your church or prayer team, share prayer requests and testimonies, send emergency
          prayer alerts, and pray together. Upgrade to unlock the full intercessory community.
        </p>
        <ul className="text-left text-ink-soft text-xs space-y-1.5 max-w-xs mx-auto mb-5">
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Join prayer groups and pray together</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Prayer requests, testimonies and comments</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Emergency prayer alerts</li>
          <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> Voice-to-text prayer writing</li>
        </ul>
        <button onClick={() => setShowPricing(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500">
          {isAndroidApp ? 'See Prayer Fire Partner' : 'Start 7-Day Free Trial'}
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
        <input type="text" placeholder="Group name (e.g. Redeemed Church Prayer Team)" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Group name"
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        <textarea placeholder="Description (what does this group pray for?)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} aria-label="Group description"
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Group prayer time (pray together)</label>
          <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink focus:outline-none">
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">Who can join?</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setNewMode('open')} className={cn('py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all', newMode === 'open' ? 'border-emerald-500 bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
              <Globe className="w-4 h-4" /> Open
            </button>
            <button type="button" onClick={() => setNewMode('approval')} className={cn('py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all', newMode === 'approval' ? 'border-emerald-500 bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
              <Lock className="w-4 h-4" /> Approval only
            </button>
          </div>
          <p className="text-[0.6875rem] text-ink-muted mt-1.5">{newMode === 'open' ? 'Anyone with Prayer Fire Partner can join instantly.' : 'Only people you approve can join.'}</p>
        </div>
        {createError && <p role="alert" className="text-danger text-xs">{createError}</p>}
        <button onClick={handleCreate} disabled={busy || !newName.trim()} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Group
        </button>
      </div>
    );
  }

  // ── Join by code ──────────────────────────────────────────────
  if (view === 'join') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc"><ChevronLeft className="w-4 h-4" /> Back</button>
        <h2 className="font-serif-heading text-lg font-bold text-ink">Join a Group</h2>
        <p className="text-ink-muted text-sm">Enter the invite code shared by the group leader.</p>
        <input type="text" placeholder="Invite code (e.g. AB12CD)" value={joinCode} aria-label="Invite code"
          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        {joinError && <p role="alert" className="text-danger text-xs">{joinError}</p>}
        <button onClick={handleJoinCode} disabled={busy} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Join Group
        </button>
      </div>
    );
  }

  // ── Detail ────────────────────────────────────────────────────
  if (view === 'detail') {
    if (!detail) {
      return (
        <div className="space-y-3">
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc"><ChevronLeft className="w-4 h-4" /> Groups</button>
          {loadError ? <p role="alert" className="text-danger text-sm">{loadError}</p> : <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Opening group...</p>}
        </div>
      );
    }
    const g = detail.group;
    const isLeaderOfGroup = detail.myRole === 'leader';
    const pending = detail.members.filter((m) => m.status === 'pending');
    const active = detail.members.filter((m) => m.status === 'active');
    const kindInfo = POST_KINDS.find((k) => k.kind === postKind)!;

    return (
      <div className="space-y-3">
        <button onClick={() => { setView('list'); loadDirectory(); }} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc"><ChevronLeft className="w-4 h-4" /> Groups</button>

        {notice && <div role="status" className="bg-acc-soft border border-acc-edge rounded-xl px-3 py-2 text-xs font-semibold text-acc-strong">{notice}</div>}

        <div className="bg-card rounded-2xl border border-edge p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">{g.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <h2 className="font-bold text-ink truncate flex items-center gap-1.5">{g.name}{g.featured && <span className="bg-warn-soft text-warn-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0"><Star className="w-2.5 h-2.5" /> FEATURED</span>}</h2>
                <p className="text-ink-muted text-xs truncate">{g.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {detail.inviteCode && (
                <button onClick={() => copyCode(detail.inviteCode!)} className="p-2 text-ink-muted hover:text-acc" title="Copy invite code" aria-label="Copy invite code">
                  {copied ? <Check className="w-4 h-4 text-acc" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              {isLeaderOfGroup ? (
                <button
                  onClick={async () => { if (!confirm('Delete this group for everyone? Its posts and members are removed.')) return; const r = await act({ action: 'delete', groupId: g.id }); if (r) { setView('list'); loadDirectory(); } }}
                  className="p-2 text-ink-muted hover:text-danger" title="Delete group" aria-label="Delete group"><Trash2 className="w-4 h-4" /></button>
              ) : (
                <button
                  onClick={async () => { const r = await act({ action: 'leave', groupId: g.id }); if (r) { setView('list'); loadDirectory(); } }}
                  className="p-2 text-ink-muted hover:text-danger" title="Leave group" aria-label="Leave group"><LogOut className="w-4 h-4" /></button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.6875rem]">
            <span className="bg-acc-soft text-acc-strong px-2 py-1 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> {active.length} members</span>
            <span className="bg-warn-soft text-warn-strong px-2 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pray at {fmtTime(g.prayerTime)}</span>
            <span className="bg-card-2 text-ink-muted px-2 py-1 rounded-full flex items-center gap-1">{g.joinMode === 'open' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {g.joinMode === 'open' ? 'Open' : 'Approval only'}</span>
            <span className={cn('px-2 py-1 rounded-full flex items-center gap-1', detail.prayedToday > 0 ? 'bg-warn-soft text-warn-strong' : 'bg-card-2 text-ink-muted')}><Flame className="w-3 h-3" /> {detail.prayedToday} prayed today</span>
          </div>
          {detail.inviteCode && (
            <button onClick={() => copyCode(detail.inviteCode!)} className="mt-3 w-full text-left bg-card-2 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-ink-muted text-xs">Invite code</span>
              <span className="text-ink font-bold tracking-widest">{detail.inviteCode}</span>
            </button>
          )}
        </div>

        <button onClick={toggleCheckin} disabled={busy}
          className={cn('w-full rounded-2xl border p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all', detail.iPrayedToday ? 'bg-acc-soft border-acc-edge text-acc-strong' : 'bg-card border-edge text-ink-muted hover:border-warn-edge')}>
          <Flame className={cn('w-4 h-4', detail.iPrayedToday && 'animate-flicker')} />
          {detail.iPrayedToday ? 'I prayed today ✓' : 'Mark: I prayed today'}
        </button>

        {/* Leader / co-leader controls */}
        {detail.canModerate && (
          <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><Pin className="w-3 h-3" /> Pinned verse</label>
              <input type="text" placeholder="e.g. Psalm 133:1" defaultValue={g.pinnedVerse ?? ''} aria-label="Pinned verse"
                onBlur={(e) => { if (e.target.value !== (g.pinnedVerse ?? '')) act({ action: 'update', groupId: g.id, joinMode: g.joinMode, prayerTime: g.prayerTime ?? '', pinnedVerse: e.target.value }); }}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
            </div>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Group prayer time</label>
              <select value={g.prayerTime || ''} aria-label="Group prayer time"
                onChange={(e) => act({ action: 'update', groupId: g.id, joinMode: g.joinMode, prayerTime: e.target.value, pinnedVerse: g.pinnedVerse ?? '' })}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
                {!g.prayerTime && <option value="">Not set</option>}
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><ShieldCheck className="w-3 h-3" /> Who can join</label>
              <div className="grid grid-cols-2 gap-2">
                {(['open', 'approval'] as const).map((m) => (
                  <button key={m} onClick={() => g.joinMode !== m && act({ action: 'update', groupId: g.id, joinMode: m, prayerTime: g.prayerTime ?? '', pinnedVerse: g.pinnedVerse ?? '' })}
                    className={cn('py-2 rounded-lg border-2 text-xs font-bold flex items-center justify-center gap-1', g.joinMode === m ? 'border-emerald-500 bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
                    {m === 'open' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {m === 'open' ? 'Open' : 'Approval only'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {detail.canModerate && pending.length > 0 && (
          <div className="bg-card rounded-2xl border border-warn-edge p-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-warn-strong flex items-center gap-1 mb-2"><UserPlus className="w-3 h-3" /> Join requests</p>
            <div className="space-y-2">
              {pending.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 bg-card-2 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-ink truncate">{m.displayName}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => act({ action: 'decide', groupId: g.id, userId: m.userId, approve: true })} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-500"><Check className="w-3.5 h-3.5" /> Approve</button>
                    <button onClick={() => act({ action: 'decide', groupId: g.id, userId: m.userId, approve: false })} className="px-2.5 py-1.5 bg-card-3 text-ink-soft rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-card"><X className="w-3.5 h-3.5" /> Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReportsQueue detail={detail} busy={busy} act={act} />
        <MembersManager detail={detail} busy={busy} act={act} />
        {isLeaderOfGroup && detail.canModerate && <GroupAnalytics groupId={g.id} />}
        <GroupFeaturing detail={detail} busy={busy} act={act} />

        {g.pinnedVerse && (
          <div className="bg-acc-soft border border-acc-edge rounded-xl p-3 text-center">
            <p className="text-acc-strong text-xs font-semibold uppercase tracking-wider mb-1">📖 Praying together</p>
            <p className="text-ink-soft text-sm italic">{g.pinnedVerse}</p>
          </div>
        )}

        {/* Composer */}
        <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {POST_KINDS.map((k) => (
              <button key={k.kind} onClick={() => setPostKind(k.kind)}
                className={cn('px-2.5 py-1 rounded-full text-[0.6875rem] font-bold border', postKind === k.kind ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card-2 text-ink-muted border-edge')}>
                {k.label}
              </button>
            ))}
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={kindInfo.hint} aria-label="Write a post" maxLength={2000}
            className="w-full bg-card border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <button onClick={handleSend} disabled={busy || !draft.trim()}
            className={cn('w-full py-2 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60', postKind === 'alert' ? 'bg-danger hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500')}>
            {postKind === 'alert' ? <Siren className="w-4 h-4" /> : <Send className="w-4 h-4" />} Post {kindInfo.label.toLowerCase()}
          </button>
        </div>

        {/* Feed */}
        <div className="space-y-2">
          {detail.posts.length === 0 ? (
            <p className="text-center text-ink-faint text-xs py-6 bg-card rounded-2xl border border-edge">Nothing here yet. Share the first prayer request!</p>
          ) : detail.posts.map((p) => {
            const hidden = p.status === 'hidden';
            const reportingPost = reporting?.postId === p.id && reporting.commentId === null;
            const reasonPicker = (
              <div className="mt-2 bg-card-2 rounded-lg p-2 space-y-1.5" role="group" aria-label="Report reason">
                <p className="text-[0.6875rem] font-bold text-ink-muted">Why are you reporting this?</p>
                <div className="flex flex-wrap gap-1.5">
                  {REPORT_REASONS.filter((r) => r !== 'Other').map((r) => (
                    <button key={r} onClick={() => submitReport(r)} disabled={busy} className="px-2 py-1 bg-card border border-edge rounded-lg text-[0.6875rem] font-bold text-ink-soft disabled:opacity-60">{r}</button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Other reason" aria-label="Other reason" maxLength={300}
                    className="flex-1 bg-card border border-edge-strong rounded-lg px-2 py-1 text-xs text-ink placeholder-ink-faint" />
                  <button onClick={() => submitReport(otherReason)} disabled={busy || !otherReason.trim()} className="px-2 py-1 bg-danger text-white rounded-lg text-[0.6875rem] font-bold disabled:opacity-60">Report</button>
                  <button onClick={() => setReporting(null)} className="px-2 py-1 bg-card-3 text-ink-soft rounded-lg text-[0.6875rem] font-bold">Cancel</button>
                </div>
              </div>
            );
            return (
              <article key={p.id} className={cn('rounded-2xl border p-3', p.kind === 'alert' ? 'bg-danger-soft border-danger-edge' : 'bg-card border-edge', hidden && 'opacity-75')}>
                {hidden && (
                  <p className="text-[0.6875rem] font-semibold text-warn-strong bg-warn-soft rounded-lg px-2 py-1 mb-2">
                    {detail.canModerate ? 'Hidden from members.' : 'A leader hid this post. Only you and the group leaders can see it.'}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-ink font-bold text-xs">{p.authorName}{p.mine ? ' (you)' : ''}</span>
                  {p.kind === 'alert' && <span className="bg-danger text-white text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Siren className="w-2.5 h-2.5" /> EMERGENCY</span>}
                  {p.kind === 'request' && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><HandHeart className="w-2.5 h-2.5" /> PRAYER REQUEST</span>}
                  {p.kind === 'testimony' && <span className="bg-warn-soft text-warn-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> TESTIMONY</span>}
                  {p.pinned && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Pin className="w-2.5 h-2.5" /> PINNED</span>}
                  {detail.canModerate && p.reports > 0 && <span className="bg-danger text-white text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full">{p.reports} {p.reports === 1 ? 'REPORT' : 'REPORTS'}</span>}
                  <span className="text-ink-faint text-[0.5625rem] ml-auto">{ago(p.createdAt)}</span>
                </div>
                <p className={cn('text-sm whitespace-pre-wrap break-words', p.kind === 'alert' ? 'text-danger-strong font-semibold' : 'text-ink-soft')}>{p.body}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => act({ action: 'praying', postId: p.id })} disabled={busy || hidden}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border disabled:opacity-60', p.iAmPraying ? 'bg-acc-soft text-acc-strong border-acc-edge' : 'bg-card-2 text-ink-muted border-edge')}>
                    <HandHeart className="w-3.5 h-3.5" /> {p.iAmPraying ? "I'm praying ✓" : "I'm praying"} · {p.praying}
                  </button>
                  <button onClick={() => toggleComments(p)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border bg-card-2 text-ink-muted border-edge">
                    <MessageCircle className="w-3.5 h-3.5" /> {p.comments} {p.comments === 1 ? 'comment' : 'comments'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {!p.mine && !p.iReported && (
                    <button onClick={() => { setReporting({ postId: p.id, commentId: null }); setOtherReason(''); }} className="px-2 py-1 text-ink-faint hover:text-danger rounded-lg text-[0.6875rem] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> Report</button>
                  )}
                  {!p.mine && p.iReported && <span className="px-2 py-1 text-ink-faint text-[0.6875rem] font-bold">Reported ✓</span>}
                  {p.mine && !detail.canModerate && (
                    <button disabled={busy} onClick={() => { if (confirm('Delete your post?')) act({ action: 'deletePost', postId: p.id }); }} className="px-2 py-1 text-ink-faint hover:text-danger rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> Delete</button>
                  )}
                  {detail.canModerate && (
                    <>
                      {!hidden && (
                        <button disabled={busy} onClick={() => act({ action: 'pin', postId: p.id, pinned: !p.pinned })} className="px-2 py-1 bg-acc-soft text-acc-strong rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Pin className="w-3 h-3" /> {p.pinned ? 'Unpin' : 'Pin to top'}</button>
                      )}
                      <button disabled={busy} onClick={() => act({ action: 'hidePost', postId: p.id, hidden: !hidden })} className="px-2 py-1 bg-warn-soft text-warn-strong rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60">
                        {hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {hidden ? 'Unhide' : 'Hide'}
                      </button>
                      <button disabled={busy} onClick={() => { if (confirm('Delete this post for everyone?')) act({ action: 'deletePost', postId: p.id }); }} className="px-2 py-1 bg-danger text-white rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> Delete</button>
                    </>
                  )}
                </div>
                {reportingPost && reasonPicker}
                {openPostId === p.id && (
                  <div className="mt-2 space-y-2 border-t border-edge pt-2">
                    {comments.map((c) => {
                      const cHidden = c.status === 'hidden';
                      const reportingThis = reporting?.postId === p.id && reporting.commentId === c.id;
                      return (
                        <div key={c.id} className={cn('bg-card-2 rounded-lg px-3 py-2', cHidden && 'opacity-75')}>
                          <p className="text-xs">
                            <span className="font-bold text-ink">{c.authorName}{c.mine ? ' (you)' : ''}</span> <span className="text-ink-faint">· {ago(c.createdAt)}</span>
                            {cHidden && <span className="ml-1.5 bg-warn-soft text-warn-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full">{detail.canModerate ? 'HIDDEN' : 'HIDDEN BY A LEADER'}</span>}
                            {detail.canModerate && c.reports > 0 && <span className="ml-1.5 bg-danger text-white text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full">{c.reports} {c.reports === 1 ? 'REPORT' : 'REPORTS'}</span>}
                          </p>
                          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words">{c.body}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {!c.mine && !c.iReported && (
                              <button onClick={() => { setReporting({ postId: p.id, commentId: c.id }); setOtherReason(''); }} className="text-ink-faint hover:text-danger text-[0.6875rem] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> Report</button>
                            )}
                            {!c.mine && c.iReported && <span className="text-ink-faint text-[0.6875rem] font-bold">Reported ✓</span>}
                            {(c.mine || detail.canModerate) && (
                              <button disabled={busy} onClick={() => { if (confirm('Delete this comment?')) actAndRefresh({ action: 'deleteComment', commentId: c.id }); }} className="text-ink-faint hover:text-danger text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> Delete</button>
                            )}
                            {detail.canModerate && (
                              <button disabled={busy} onClick={() => actAndRefresh({ action: 'hideComment', commentId: c.id, hidden: !cHidden })} className="text-warn-strong text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60">
                                {cHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {cHidden ? 'Unhide' : 'Hide'}
                              </button>
                            )}
                          </div>
                          {reportingThis && reasonPicker}
                        </div>
                      );
                    })}
                    {!hidden && (
                      <div className="flex gap-2">
                        <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} placeholder="Write a comment..." aria-label="Write a comment" maxLength={1000}
                          className="flex-1 bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
                        <button onClick={sendComment} disabled={busy || !commentDraft.trim()} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-60">Send</button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // ── List (directory) ─────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => (isLeader ? setView('create') : setShowPricing(true))} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500">
          <Plus className="w-4 h-4" /> Create Group{!isLeader && <span className="text-[0.625rem] font-bold bg-white/20 rounded-full px-1.5 py-0.5">Leader</span>}
        </button>
        <button onClick={() => setView('join')} className="flex-1 py-2.5 bg-card text-ink-soft border border-edge rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-card-2">
          <UserPlus className="w-4 h-4" /> Join by Code
        </button>
      </div>

      {notice && <div role="status" className="bg-acc-soft border border-acc-edge rounded-xl px-3 py-2 text-xs font-semibold text-acc-strong flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {notice}</div>}
      {loadError && <p role="alert" className="text-danger text-xs">{loadError}</p>}

      {isLeader && legacy.length > 0 && (
        <div className="bg-warn-soft border border-warn-edge rounded-2xl p-3 space-y-2">
          <p className="text-warn-strong text-xs font-bold flex items-center gap-1.5"><CloudUpload className="w-3.5 h-3.5" /> Groups saved only on this phone</p>
          <p className="text-warn-strong text-xs leading-relaxed">Groups now live online so every member sees the same group. Move yours online (name, description, prayer time and join setting). Old chat messages stay on this phone, and members rejoin with the new invite code.</p>
          {legacy.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 bg-card rounded-lg px-3 py-2">
              <span className="text-sm font-semibold text-ink truncate">{g.name}</span>
              <button onClick={() => moveOnline(g)} disabled={busy} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shrink-0 disabled:opacity-60">Move online</button>
            </div>
          ))}
        </div>
      )}

      {(directory ?? []).length > 0 && (
        <label className="relative block">
          <span className="sr-only">Search groups</span>
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups" aria-label="Search groups"
            className="w-full bg-card border border-edge-strong rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        </label>
      )}

      {(() => {
        const all = directory ?? [];
        const term = search.trim().toLowerCase();
        // Featured groups always come first (the database already sorts them that way; this keeps it true after filtering).
        const shown = all
          .filter((g) => !term || g.name.toLowerCase().includes(term) || g.description.toLowerCase().includes(term))
          .sort((a, b) => Number(b.featured) - Number(a.featured));
        const featuredList = shown.filter((g) => g.featured);
        const others = shown.filter((g) => !g.featured);

        const card = (g: DirectoryGroup) => (
          <div key={g.id} className={cn('bg-card border rounded-2xl p-4 transition-all hover:border-acc-edge', g.featured ? 'border-warn-edge' : 'border-edge')}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">{g.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-ink font-bold text-sm truncate">{g.name}</h3>
                  {g.featured && <span className="bg-warn-soft text-warn-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0"><Star className="w-2.5 h-2.5" /> FEATURED</span>}
                  <span className={cn('text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0', g.joinMode === 'open' ? 'bg-acc-soft text-acc-strong' : 'bg-warn-soft text-warn-strong')}>
                    {g.joinMode === 'open' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                    {g.joinMode === 'open' ? 'Open' : 'Approval'}
                  </span>
                </div>
                <p className="text-ink-muted text-xs truncate">{g.description || 'No description'}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-acc-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Users className="w-3 h-3" /> {g.memberCount}</span>
                  <span className="text-warn-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Clock className="w-3 h-3" /> {fmtTime(g.prayerTime)}</span>
                  {g.prayedToday > 0 && <span className="text-warn-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Flame className="w-3 h-3" /> {g.prayedToday}</span>}
                </div>
              </div>
              {g.myStatus === 'active' ? (
                <button onClick={() => openGroup(g.id)} className="px-3 py-2 bg-acc-soft text-acc-strong rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:bg-acc-soft/70">Open <ChevronRight className="w-3.5 h-3.5" /></button>
              ) : g.myStatus === 'pending' ? (
                <span className="px-3 py-2 bg-card-2 text-ink-muted rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0"><Clock className="w-3.5 h-3.5" /> Requested</span>
              ) : g.myStatus === 'blocked' ? null : (
                <button onClick={() => handleRequestJoin(g)} disabled={busy} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:bg-emerald-500 disabled:opacity-60">
                  {g.joinMode === 'open' ? <UserPlus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {g.joinMode === 'open' ? 'Join' : 'Request'}
                </button>
              )}
            </div>
          </div>
        );

        if (directory === null && !loadError) {
          return <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading teams...</p>;
        }
        if (all.length === 0) {
          return (
            <div className="bg-card rounded-2xl border border-edge p-8 text-center">
              <Users className="w-10 h-10 text-ink-ghost mx-auto mb-2" />
              <p className="text-ink-muted text-sm">No teams yet</p>
              <p className="text-ink-faint text-xs mt-1">{isLeader ? 'Create the first prayer group for your church or prayer team.' : 'A Prayer Fire Leader can create the first group, or join one with an invite code.'}</p>
            </div>
          );
        }
        if (shown.length === 0) return <p className="text-ink-muted text-sm text-center py-6">No groups match &ldquo;{search}&rdquo;.</p>;
        return (
          <>
            {!term && featuredList.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-serif-heading font-bold text-ink flex items-center gap-1.5"><Star className="w-4 h-4 text-warn-strong" /> Featured Groups</h3>
                {featuredList.map(card)}
              </div>
            )}
            <div className="space-y-2">
              <div>
                <h3 className="font-serif-heading font-bold text-ink">{term ? 'Search results' : 'Browse Prayer Teams'}</h3>
                <p className="text-ink-muted text-xs mt-0.5">{term ? `${shown.length} ${shown.length === 1 ? 'group' : 'groups'} found, featured groups first.` : 'Join an open team instantly, or ask to join an approval-only team.'}</p>
              </div>
              {(term ? shown : others).map(card)}
              {!term && others.length === 0 && <p className="text-ink-faint text-xs">That is every group for now.</p>}
            </div>
          </>
        );
      })()}
    </div>
  );
}
