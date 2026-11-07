'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Users, Plus, ChevronRight, ChevronLeft, Send, Siren, Clock, LogOut, Trash2, ShieldCheck,
  UserPlus, Copy, Check, Pin, Flame, Lock, Globe, X, MessageCircle, HandHeart, Sparkles, Loader2, CloudUpload,
  Flag, EyeOff, Eye, Star, Search, Phone, Share2, Bell, BellOff, Hourglass,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';
import { openInAppBrowser } from '@/lib/capacitorAlarm';
import { isGroupAlarmOn, lagosToLocal, saveGroupAlarms, setGroupAlarmOn } from '@/lib/groupAlarms';
import { MembersManager, REPORT_REASONS, ReportsQueue } from './GroupModeration';
import GroupAnalytics from './GroupAnalytics';
import GroupFeaturing from './GroupFeaturing';
import type { DirectoryGroup, GroupComment, GroupDetail, GroupPost, JoinMode, PostKind } from '@/lib/groups';
import {
  fetchComments, fetchDetail, fetchDirectory, groupAction, markLegacyMoved, readLegacyGroups, type LegacyGroup,
} from '@/lib/groupsClient';
import { useI18n } from '@/app/i18n';

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
  const { t, tr } = useI18n();
  const { user, isLeader, setShowPricing, setShowAuth, markPrayedToday } = useApp();

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
  // The live-prayer call link and today's prayer point (leader / co-leader editors), and this phone's alarm switch for the open group
  const [callDraft, setCallDraft] = useState<string | null>(null);
  const [pointDraft, setPointDraft] = useState<string | null>(null);
  const [alarmOn, setAlarmOn] = useState(true);
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
      // This phone rings at the prayer time of every group the person belongs to (each can be switched off).
      saveGroupAlarms(r.data.groups);
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
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLegacy(readLegacyGroups({ id: user.id, name: user.name, email: user.email }));
    loadDirectory();
  }, [user, loadDirectory]);

  // An invite link (…/groups?code=AB12CD) opens the Join screen with the code filled in.
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setJoinCode(code.toUpperCase());
        setView('join');
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // no browser: nothing to read
    }
  }, []);

  // This phone's alarm switch for the open group
  useEffect(() => {
    if (activeGroupId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlarmOn(isGroupAlarmOn(activeGroupId));
      setCallDraft(null);
      setPointDraft(null);
    }
  }, [activeGroupId]);

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
      : outcome === 'pending' ? t('ui.requestSentTheGroupLeader')
        : outcome === 'already' ? t('ui.youAreAlreadyInThis')
          : outcome === 'blocked' ? t('ui.youCannotJoinThisGroup')
            : outcome === 'full' ? t('ui.thisGroupIsFullAsk')
              : t('ui.noGroupFound');

  const handleJoinCode = async () => {
    if (!joinCode.trim() || busy) return;
    setBusy(true);
    const r = await groupAction<{ outcome: string }>({ action: 'joinByCode', code: joinCode });
    setBusy(false);
    if (!r.ok) return setJoinError(r.error);
    if (r.data.outcome === 'notfound') return setJoinError(t('ui.noGroupFoundWithThat'));
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

  /** The invite link: opens the app (or the website) on the Join screen with the code filled in. */
  const inviteLink = (code: string) => `https://prayer-fire.vercel.app/groups?code=${encodeURIComponent(code)}`;

  /** Opens the leader's call link (WhatsApp, Google Meet, Zoom...). Only http(s) links are ever stored. */
  const joinLivePrayer = async (url: string) => {
    if (!/^https?:\/\//i.test(url)) return;
    if (await openInAppBrowser(url)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleAlarm = (groupId: string) => {
    const next = !alarmOn;
    setGroupAlarmOn(groupId, next);
    setAlarmOn(next);
    flashNotice(next ? t('ui.yourPhoneWillRingAt') : t('ui.alarmOffForThisGroup'));
  };

  const shareInvite = async (g: GroupDetail) => {
    const link = inviteLink(g.inviteCode ?? '');
    const text = `Join our prayer group "${g.group.name}" on Prayer Fire. It is free to join. Code: ${g.inviteCode}\n${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t('ui.joinOurPrayerGroup'), text, url: link });
        return;
      }
    } catch {
      return; // the share sheet was closed
    }
    copyCode(text);
    flashNotice(t('ui.inviteCopiedPasteItInto'));
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
      flashNotice(t('ui.thankYouTheGroupLeaders'));
    }
  };

  const toggleCheckin = async () => {
    if (!activeGroupId) return;
    const res = await act({ action: 'checkin', groupId: activeGroupId });
    if (res && res.on === true) markPrayedToday(); // also feeds the global fire streak
  };

  // ── Sign in (prayer groups are free to join: only a Leader pays) ──
  if (!user) {
    return (
      <div className="bg-card rounded-2xl border border-edge shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-acc-soft text-acc-strong flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="font-serif-heading text-xl font-bold text-ink mb-2">{t('prayerGroups.prayTogether')}</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-5">{t('prayerGroups.joinAPrayerGroupFor')}</p>
        <button onClick={() => setShowAuth(true)} className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold hover:bg-acc-hover">{t('prayerGroups.signInOrCreateAn')}</button>
      </div>
    );
  }

  // ── Create ────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="font-serif-heading text-lg font-bold text-ink">{t('prayerGroups.applyToOpenAPrayer')}</h2>
        <p className="text-ink-muted text-xs leading-relaxed">{t('prayerGroups.youCanSetYourGroup')}</p>
        <input type="text" placeholder={t('prayerGroups.groupNameEGRedeemed')} value={newName} onChange={(e) => setNewName(e.target.value)} aria-label={t('prayerGroups.groupName')}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40" />
        <textarea placeholder={t('prayerGroups.descriptionWhatDoesThisGroup')} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} aria-label={t('prayerGroups.groupDescription')}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-acc-hover/40" />
        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t('prayerGroups.groupPrayerTimeWestAfrica')}</label>
          <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink focus:outline-none">
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('prayerGroups.whoCanJoin')}</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setNewMode('open')} className={cn('py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all', newMode === 'open' ? 'border-acc bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
              <Globe className="w-4 h-4" /> Open
            </button>
            <button type="button" onClick={() => setNewMode('approval')} className={cn('py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all', newMode === 'approval' ? 'border-acc bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
              <Lock className="w-4 h-4" /> Approval only
            </button>
          </div>
          <p className="text-[0.6875rem] text-ink-muted mt-1.5">{newMode === 'open' ? t('ui.anyoneWithTheInviteCode') : t('ui.onlyPeopleYouApproveCan')}</p>
        </div>
        {createError && <p role="alert" className="text-danger text-xs">{createError}</p>}
        <button onClick={handleCreate} disabled={busy || !newName.trim()} className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Send application
        </button>
      </div>
    );
  }

  // ── Join by code ──────────────────────────────────────────────
  if (view === 'join') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong"><ChevronLeft className="w-4 h-4" /> {t('prayerGroups.back')}</button>
        <h2 className="font-serif-heading text-lg font-bold text-ink">{t('prayerGroups.joinAGroup')}</h2>
        <p className="text-ink-muted text-sm">{t('prayerGroups.enterTheInviteCodeShared')}</p>
        <input type="text" placeholder={t('prayerGroups.inviteCodeEGAb12cd')} value={joinCode} aria-label={t('prayerGroups.inviteCode')}
          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
          className="w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-acc-hover/40" />
        {joinError && <p role="alert" className="text-danger text-xs">{tr(joinError)}</p>}
        <button onClick={handleJoinCode} disabled={busy} className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2">
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
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong"><ChevronLeft className="w-4 h-4" /> {t('prayerGroups.groups')}</button>
          {loadError ? <p role="alert" className="text-danger text-sm">{loadError}</p> : <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('prayerGroups.openingGroup')}</p>}
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
        <button onClick={() => { setView('list'); loadDirectory(); }} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong"><ChevronLeft className="w-4 h-4" /> {t('prayerGroups.groups')}</button>

        {notice && <div role="status" className="bg-acc-soft border border-acc-edge rounded-xl px-3 py-2 text-xs font-semibold text-acc-strong">{tr(notice)}</div>}

        <div className="bg-card rounded-2xl border border-edge p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-acc text-on-acc flex items-center justify-center font-bold flex-shrink-0">{g.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <h2 className="font-bold text-ink truncate flex items-center gap-1.5">{g.name}{g.featured && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0"><Star className="w-2.5 h-2.5" /> {t('prayerGroups.featured')}</span>}</h2>
                <p className="text-ink-muted text-xs truncate">{g.description || t('ui.noDescription')}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {detail.inviteCode && (
                <button onClick={() => copyCode(detail.inviteCode!)} className="p-2 text-ink-muted hover:text-acc-strong" title={t('prayerGroups.copyInviteCode')} aria-label={t('prayerGroups.copyInviteCode')}>
                  {copied ? <Check className="w-4 h-4 text-acc-strong" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              {isLeaderOfGroup ? (
                <button
                  onClick={async () => { if (!confirm(t('ui.deleteThisGroupForEveryone'))) return; const r = await act({ action: 'delete', groupId: g.id }); if (r) { setView('list'); loadDirectory(); } }}
                  className="p-2 text-ink-muted hover:text-danger" title={t('prayerGroups.deleteGroup')} aria-label={t('prayerGroups.deleteGroup')}><Trash2 className="w-4 h-4" /></button>
              ) : (
                <button
                  onClick={async () => { const r = await act({ action: 'leave', groupId: g.id }); if (r) { setView('list'); loadDirectory(); } }}
                  className="p-2 text-ink-muted hover:text-danger" title={t('prayerGroups.leaveGroup')} aria-label={t('prayerGroups.leaveGroup')}><LogOut className="w-4 h-4" /></button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.6875rem]">
            <span className="bg-acc-soft text-acc-strong px-2 py-1 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> {active.length}{detail.canModerate ? ` of ${g.memberLimit}` : ''} members</span>
            <span className="bg-acc-soft text-acc-strong px-2 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pray at {fmtTime(g.prayerTime)} WAT</span>
            <span className="bg-card-2 text-ink-muted px-2 py-1 rounded-full flex items-center gap-1">{g.joinMode === 'open' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {g.joinMode === 'open' ? 'Open' : t('ui.approvalOnly')}</span>
            <span className={cn('px-2 py-1 rounded-full flex items-center gap-1', detail.prayedToday > 0 ? 'bg-acc-soft text-acc-strong' : 'bg-card-2 text-ink-muted')}><Flame className="w-3 h-3" /> {detail.prayedToday} prayed today</span>
          </div>
          {detail.inviteCode && (
            <button onClick={() => copyCode(detail.inviteCode!)} className="mt-3 w-full text-left bg-card-2 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-ink-muted text-xs">{t('prayerGroups.inviteCode')}</span>
              <span className="text-ink font-bold tracking-widest">{detail.inviteCode}</span>
            </button>
          )}
          {detail.inviteCode && g.status === 'approved' && (
            <button onClick={() => shareInvite(detail)} data-testid="share-invite" className="mt-2 w-full py-2 rounded-lg border border-acc text-acc-strong text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-acc-soft">
              <Share2 className="w-3.5 h-3.5" /> Share invite link (members join free)
            </button>
          )}
        </div>

        <button onClick={toggleCheckin} disabled={busy}
          className={cn('w-full rounded-2xl border p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all', detail.iPrayedToday ? 'bg-acc-soft border-acc-edge text-acc-strong' : 'bg-card border-edge text-ink-muted hover:border-acc-edge')}>
          <Flame className={cn('w-4 h-4', detail.iPrayedToday && 'animate-flicker')} />
          {detail.iPrayedToday ? t('ui.iPrayedToday') : t('ui.markIPrayedToday')}
        </button>

        {g.status === 'pending' && (
          <div role="status" className="bg-warn-soft border border-warn-edge rounded-2xl p-3 flex items-start gap-2 text-xs text-warn-strong">
            <Hourglass className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>{t('prayerGroups.waitingForApproval')}</strong> {t('ui.setUpNow')}</span>
          </div>
        )}
        {g.status === 'rejected' && (
          <div role="alert" className="bg-danger-soft border border-danger-edge rounded-2xl p-3 text-xs text-danger-strong">
            <strong>{t('prayerGroups.thisGroupWasNotApproved')}</strong> {g.reviewNote || t('ui.youCanApplyAgainWith')}
          </div>
        )}

        {/* Live prayer: the leader's call link (WhatsApp, Google Meet, Zoom) */}
        {g.callUrl && (
          <button onClick={() => joinLivePrayer(g.callUrl!)} data-testid="join-live-prayer"
            className="w-full rounded-2xl bg-acc text-on-acc p-3.5 flex items-center justify-center gap-2 font-bold hover:bg-acc-hover">
            <Phone className="w-4 h-4" /> Join Live Prayer
          </button>
        )}

        {/* Today's shared prayer point */}
        {(g.status === 'approved' || detail.canModerate) && (detail.todayPoint || detail.canModerate) && (
          <div className="bg-card rounded-2xl border border-edge p-3" data-testid="group-point">
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" /> {t('prayerGroups.todaySPrayerPoint')}</p>
            {detail.todayPoint ? <p className="text-ink text-sm leading-relaxed">{detail.todayPoint}</p> : <p className="text-ink-faint text-xs">{t('prayerGroups.noPointSharedYetToday')}</p>}
            {detail.canModerate && (
              <div className="mt-2 flex gap-2">
                <input type="text" value={pointDraft ?? detail.todayPoint ?? ''} onChange={(e) => setPointDraft(e.target.value)} maxLength={400} placeholder={t('prayerGroups.shareTodaySPrayerPoint')} aria-label={t('prayerGroups.todaySPrayerPoint')}
                  className="flex-1 min-w-0 bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
                <button disabled={busy || pointDraft === null || pointDraft === (detail.todayPoint ?? '')}
                  onClick={async () => { const r = await act({ action: 'setPoint', groupId: g.id, body: pointDraft ?? '' }); if (r) setPointDraft(null); }}
                  className="px-3 py-2 bg-acc text-on-acc rounded-lg text-xs font-bold disabled:opacity-60">{t('prayerGroups.share')}</button>
              </div>
            )}
          </div>
        )}

        {/* This phone's alarm for the group prayer time */}
        {g.prayerTime && g.status === 'approved' && (
          <button onClick={() => toggleAlarm(g.id)} aria-pressed={alarmOn} data-testid="group-alarm-toggle"
            className="w-full bg-card rounded-2xl border border-edge p-3 flex items-center gap-3 text-left">
            {alarmOn ? <Bell className="w-5 h-5 text-acc-strong flex-shrink-0" /> : <BellOff className="w-5 h-5 text-ink-faint flex-shrink-0" />}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-ink">{t('prayerGroups.ringMyAlarmForGroup')}</span>
              <span className="block text-[0.6875rem] text-ink-muted">{fmtTime(g.prayerTime)} West Africa Time{lagosToLocal(g.prayerTime) && lagosToLocal(g.prayerTime) !== g.prayerTime ? ` · ${fmtTime(lagosToLocal(g.prayerTime))} on your phone` : ''}</span>
            </span>
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', alarmOn ? 'bg-acc-soft text-acc-strong' : 'bg-card-2 text-ink-muted')}>{alarmOn ? 'On' : 'Off'}</span>
          </button>
        )}

        {/* Leader / co-leader controls */}
        {detail.canModerate && (
          <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><Pin className="w-3 h-3" /> {t('prayerGroups.pinnedVerse')}</label>
              <input type="text" placeholder={t('prayerGroups.eGPsalm1331')} defaultValue={g.pinnedVerse ?? ''} aria-label={t('prayerGroups.pinnedVerse')}
                onBlur={(e) => { if (e.target.value !== (g.pinnedVerse ?? '')) act({ action: 'update', groupId: g.id, joinMode: g.joinMode, prayerTime: g.prayerTime ?? '', pinnedVerse: e.target.value }); }}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
            </div>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> {t('prayerGroups.groupPrayerTime')}</label>
              <select value={g.prayerTime || ''} aria-label={t('prayerGroups.groupPrayerTime')}
                onChange={(e) => act({ action: 'update', groupId: g.id, joinMode: g.joinMode, prayerTime: e.target.value, pinnedVerse: g.pinnedVerse ?? '' })}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
                {!g.prayerTime && <option value="">{t('prayerGroups.notSet')}</option>}
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><Phone className="w-3 h-3" /> {t('prayerGroups.livePrayerCallLink')}</label>
              <input type="url" inputMode="url" placeholder={t('prayerGroups.pasteAWhatsappGoogleMeet')} value={callDraft ?? g.callUrl ?? ''} aria-label={t('prayerGroups.livePrayerCallLink')}
                onChange={(e) => setCallDraft(e.target.value)}
                onBlur={async () => { if (callDraft !== null && callDraft.trim() !== (g.callUrl ?? '')) { const r = await act({ action: 'update', groupId: g.id, joinMode: g.joinMode, prayerTime: g.prayerTime ?? '', pinnedVerse: g.pinnedVerse ?? '', callUrl: callDraft.trim() }); if (r) setCallDraft(null); } }}
                className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
              <p className="text-[0.625rem] text-ink-faint mt-1">{t('prayerGroups.membersSeeAJoinLive')}</p>
            </div>
            <div>
              <label className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1 mb-1"><ShieldCheck className="w-3 h-3" /> {t('prayerGroups.whoCanJoin2')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['open', 'approval'] as const).map((m) => (
                  <button key={m} onClick={() => g.joinMode !== m && act({ action: 'update', groupId: g.id, joinMode: m, prayerTime: g.prayerTime ?? '', pinnedVerse: g.pinnedVerse ?? '' })}
                    className={cn('py-2 rounded-lg border-2 text-xs font-bold flex items-center justify-center gap-1', g.joinMode === m ? 'border-acc bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
                    {m === 'open' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {m === 'open' ? 'Open' : t('ui.approvalOnly')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {detail.canModerate && pending.length > 0 && (
          <div className="bg-card rounded-2xl border border-acc-edge p-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong flex items-center gap-1 mb-2"><UserPlus className="w-3 h-3" /> {t('prayerGroups.joinRequests')}</p>
            <div className="space-y-2">
              {pending.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 bg-card-2 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-ink truncate">{m.displayName}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => act({ action: 'decide', groupId: g.id, userId: m.userId, approve: true })} className="px-2.5 py-1.5 bg-acc text-on-acc rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-acc-hover"><Check className="w-3.5 h-3.5" /> {t('prayerGroups.approve')}</button>
                    <button onClick={() => act({ action: 'decide', groupId: g.id, userId: m.userId, approve: false })} className="px-2.5 py-1.5 bg-card-3 text-ink-soft rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-card"><X className="w-3.5 h-3.5" /> {t('prayerGroups.decline')}</button>
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
            <p className="text-acc-strong text-xs font-semibold uppercase tracking-wider mb-1">{t('prayerGroups.prayingTogether')}</p>
            <p className="text-ink-soft text-sm italic">{g.pinnedVerse}</p>
          </div>
        )}

        {/* Composer */}
        <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {POST_KINDS.map((k) => (
              <button key={k.kind} onClick={() => setPostKind(k.kind)}
                className={cn('px-2.5 py-1 rounded-full text-[0.6875rem] font-bold border', postKind === k.kind ? 'bg-acc text-on-acc border-acc' : 'bg-card-2 text-ink-muted border-edge')}>
                {tr(k.label)}
              </button>
            ))}
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={tr(kindInfo.hint)} aria-label={t('prayerGroups.writeAPost')} maxLength={2000}
            className="w-full bg-card border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-ink placeholder-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-acc-hover/40" />
          <button onClick={handleSend} disabled={busy || !draft.trim()}
            className={cn('w-full py-2 text-on-acc rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60', postKind === 'alert' ? 'bg-danger hover:bg-danger' : 'bg-acc hover:bg-acc-hover')}>
            {postKind === 'alert' ? <Siren className="w-4 h-4" /> : <Send className="w-4 h-4" />} Post {kindInfo.label.toLowerCase()}
          </button>
        </div>

        {/* Feed */}
        <div className="space-y-2">
          {detail.posts.length === 0 ? (
            <p className="text-center text-ink-faint text-xs py-6 bg-card rounded-2xl border border-edge">{t('prayerGroups.nothingHereYetShareThe')}</p>
          ) : detail.posts.map((p) => {
            const hidden = p.status === 'hidden';
            const reportingPost = reporting?.postId === p.id && reporting.commentId === null;
            const reasonPicker = (
              <div className="mt-2 bg-card-2 rounded-lg p-2 space-y-1.5" role="group" aria-label={t('prayerGroups.reportReason')}>
                <p className="text-[0.6875rem] font-bold text-ink-muted">{t('prayerGroups.whyAreYouReportingThis')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {REPORT_REASONS.filter((r) => r !== 'Other').map((r) => (
                    <button key={r} onClick={() => submitReport(r)} disabled={busy} className="px-2 py-1 bg-card border border-edge rounded-lg text-[0.6875rem] font-bold text-ink-soft disabled:opacity-60">{tr(r)}</button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder={t('prayerGroups.otherReason')} aria-label={t('prayerGroups.otherReason')} maxLength={300}
                    className="flex-1 bg-card border border-edge-strong rounded-lg px-2 py-1 text-xs text-ink placeholder-ink-faint" />
                  <button onClick={() => submitReport(otherReason)} disabled={busy || !otherReason.trim()} className="px-2 py-1 bg-danger text-white rounded-lg text-[0.6875rem] font-bold disabled:opacity-60">{t('prayerGroups.report')}</button>
                  <button onClick={() => setReporting(null)} className="px-2 py-1 bg-card-3 text-ink-soft rounded-lg text-[0.6875rem] font-bold">{t('customizablePrayerSchedule.cancel')}</button>
                </div>
              </div>
            );
            return (
              <article key={p.id} className={cn('rounded-2xl border p-3', p.kind === 'alert' ? 'bg-danger-soft border-danger-edge' : 'bg-card border-edge', hidden && 'opacity-75')}>
                {hidden && (
                  <p className="text-[0.6875rem] font-semibold text-acc-strong bg-acc-soft rounded-lg px-2 py-1 mb-2">
                    {detail.canModerate ? t('ui.hiddenFromMembers') : t('ui.aLeaderHidThisPost')}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-ink font-bold text-xs">{p.authorName}{p.mine ? ' (you)' : ''}</span>
                  {p.kind === 'alert' && <span className="bg-danger text-white text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Siren className="w-2.5 h-2.5" /> {t('prayerGroups.emergency')}</span>}
                  {p.kind === 'request' && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><HandHeart className="w-2.5 h-2.5" /> {t('prayerGroups.prayerRequest')}</span>}
                  {p.kind === 'testimony' && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> {t('prayerGroups.testimony')}</span>}
                  {p.pinned && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Pin className="w-2.5 h-2.5" /> {t('prayerGroups.pinned')}</span>}
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
                    <button onClick={() => { setReporting({ postId: p.id, commentId: null }); setOtherReason(''); }} className="px-2 py-1 text-ink-faint hover:text-danger rounded-lg text-[0.6875rem] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> {t('prayerGroups.report')}</button>
                  )}
                  {!p.mine && p.iReported && <span className="px-2 py-1 text-ink-faint text-[0.6875rem] font-bold">{t('prayerGroups.reported')}</span>}
                  {p.mine && !detail.canModerate && (
                    <button disabled={busy} onClick={() => { if (confirm(t('ui.deleteYourPost'))) act({ action: 'deletePost', postId: p.id }); }} className="px-2 py-1 text-ink-faint hover:text-danger rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> {t('groupModeration.delete')}</button>
                  )}
                  {detail.canModerate && (
                    <>
                      {!hidden && (
                        <button disabled={busy} onClick={() => act({ action: 'pin', postId: p.id, pinned: !p.pinned })} className="px-2 py-1 bg-acc-soft text-acc-strong rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Pin className="w-3 h-3" /> {p.pinned ? 'Unpin' : 'Pin to top'}</button>
                      )}
                      <button disabled={busy} onClick={() => act({ action: 'hidePost', postId: p.id, hidden: !hidden })} className="px-2 py-1 bg-acc-soft text-acc-strong rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60">
                        {hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {hidden ? 'Unhide' : 'Hide'}
                      </button>
                      <button disabled={busy} onClick={() => { if (confirm(t('ui.deleteThisPostForEveryone'))) act({ action: 'deletePost', postId: p.id }); }} className="px-2 py-1 bg-danger text-white rounded-lg text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> {t('groupModeration.delete')}</button>
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
                            {cHidden && <span className="ml-1.5 bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full">{detail.canModerate ? 'HIDDEN' : t('ui.hiddenByALeader')}</span>}
                            {detail.canModerate && c.reports > 0 && <span className="ml-1.5 bg-danger text-white text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full">{c.reports} {c.reports === 1 ? 'REPORT' : 'REPORTS'}</span>}
                          </p>
                          <p className="text-sm text-ink-soft whitespace-pre-wrap break-words">{c.body}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {!c.mine && !c.iReported && (
                              <button onClick={() => { setReporting({ postId: p.id, commentId: c.id }); setOtherReason(''); }} className="text-ink-faint hover:text-danger text-[0.6875rem] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> {t('prayerGroups.report')}</button>
                            )}
                            {!c.mine && c.iReported && <span className="text-ink-faint text-[0.6875rem] font-bold">{t('prayerGroups.reported')}</span>}
                            {(c.mine || detail.canModerate) && (
                              <button disabled={busy} onClick={() => { if (confirm(t('ui.deleteThisComment'))) actAndRefresh({ action: 'deleteComment', commentId: c.id }); }} className="text-ink-faint hover:text-danger text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /> {t('groupModeration.delete')}</button>
                            )}
                            {detail.canModerate && (
                              <button disabled={busy} onClick={() => actAndRefresh({ action: 'hideComment', commentId: c.id, hidden: !cHidden })} className="text-acc-strong text-[0.6875rem] font-bold flex items-center gap-1 disabled:opacity-60">
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
                        <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} placeholder={t('prayerGroups.writeAComment')} aria-label={t('prayerGroups.writeAComment2')} maxLength={1000}
                          className="flex-1 bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint" />
                        <button onClick={sendComment} disabled={busy || !commentDraft.trim()} className="px-3 py-2 bg-acc text-on-acc rounded-lg text-xs font-bold disabled:opacity-60">{t('prayerGroups.send')}</button>
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
        <button onClick={() => (isLeader ? setView('create') : setShowPricing(true))} className="flex-1 py-2.5 bg-acc text-on-acc rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-acc-hover">
          <Plus className="w-4 h-4" /> Open a Group{!isLeader && <span className="text-[0.625rem] font-bold bg-white/20 rounded-full px-1.5 py-0.5">{t('prayerGroups.leader')}</span>}
        </button>
        <button onClick={() => setView('join')} className="flex-1 py-2.5 bg-card text-ink-soft border border-edge rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-card-2">
          <UserPlus className="w-4 h-4" /> Join by Code
        </button>
      </div>

      {notice && <div role="status" className="bg-acc-soft border border-acc-edge rounded-xl px-3 py-2 text-xs font-semibold text-acc-strong flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {notice}</div>}
      {loadError && <p role="alert" className="text-danger text-xs">{loadError}</p>}

      {isLeader && legacy.length > 0 && (
        <div className="bg-acc-soft border border-acc-edge rounded-2xl p-3 space-y-2">
          <p className="text-acc-strong text-xs font-bold flex items-center gap-1.5"><CloudUpload className="w-3.5 h-3.5" /> {t('prayerGroups.groupsSavedOnlyOnThis')}</p>
          <p className="text-acc-strong text-xs leading-relaxed">{t('prayerGroups.groupsNowLiveOnlineSo')}</p>
          {legacy.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 bg-card rounded-lg px-3 py-2">
              <span className="text-sm font-semibold text-ink truncate">{g.name}</span>
              <button onClick={() => moveOnline(g)} disabled={busy} className="px-2.5 py-1.5 bg-acc text-on-acc rounded-lg text-xs font-bold shrink-0 disabled:opacity-60">{t('prayerGroups.moveOnline')}</button>
            </div>
          ))}
        </div>
      )}

      {(directory ?? []).length > 0 && (
        <label className="relative block">
          <span className="sr-only">{t('prayerGroups.searchGroups')}</span>
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('prayerGroups.searchGroups')} aria-label={t('prayerGroups.searchGroups')}
            className="w-full bg-card border border-edge-strong rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40" />
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
          <div key={g.id} className={cn('bg-card border rounded-2xl p-4 transition-all hover:border-acc-edge', g.featured ? 'border-acc-edge' : 'border-edge')}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-acc text-on-acc flex items-center justify-center font-bold flex-shrink-0">{g.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-ink font-bold text-sm truncate">{g.name}</h3>
                  {g.status === 'pending' && <span className="bg-warn-soft text-warn-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{t('prayerGroups.waitingForApproval2')}</span>}
                  {g.status === 'rejected' && <span className="bg-danger-soft text-danger-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{t('prayerGroups.notApproved')}</span>}
                  {g.featured && <span className="bg-acc-soft text-acc-strong text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0"><Star className="w-2.5 h-2.5" /> {t('prayerGroups.featured')}</span>}
                  <span className={cn('text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0', g.joinMode === 'open' ? 'bg-acc-soft text-acc-strong' : 'bg-acc-soft text-acc-strong')}>
                    {g.joinMode === 'open' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                    {g.joinMode === 'open' ? 'Open' : 'Approval'}
                  </span>
                </div>
                <p className="text-ink-muted text-xs truncate">{g.description || t('ui.noDescription')}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-acc-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Users className="w-3 h-3" /> {g.memberCount}</span>
                  <span className="text-acc-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Clock className="w-3 h-3" /> {fmtTime(g.prayerTime)}</span>
                  {g.prayedToday > 0 && <span className="text-acc-strong text-[0.625rem] font-semibold flex items-center gap-0.5"><Flame className="w-3 h-3" /> {g.prayedToday}</span>}
                </div>
              </div>
              {g.myStatus === 'active' ? (
                <button onClick={() => openGroup(g.id)} className="px-3 py-2 bg-acc-soft text-acc-strong rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:bg-acc-soft/70">Open <ChevronRight className="w-3.5 h-3.5" /></button>
              ) : g.myStatus === 'pending' ? (
                <span className="px-3 py-2 bg-card-2 text-ink-muted rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0"><Clock className="w-3.5 h-3.5" /> {t('prayerGroups.requested')}</span>
              ) : g.myStatus === 'blocked' ? null : (
                <button onClick={() => handleRequestJoin(g)} disabled={busy} className="px-3 py-2 bg-acc text-on-acc rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:bg-acc-hover disabled:opacity-60">
                  {g.joinMode === 'open' ? <UserPlus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {g.joinMode === 'open' ? 'Join' : 'Request'}
                </button>
              )}
            </div>
          </div>
        );

        if (directory === null && !loadError) {
          return <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('prayerGroups.loadingTeams')}</p>;
        }
        if (all.length === 0) {
          return (
            <div className="bg-card rounded-2xl border border-edge p-8 text-center">
              <Users className="w-10 h-10 text-ink-ghost mx-auto mb-2" />
              <p className="text-ink-muted text-sm">{t('prayerGroups.noTeamsYet')}</p>
              <p className="text-ink-faint text-xs mt-1">{isLeader ? t('ui.createTheFirstPrayerGroup') : t('ui.aPrayerFireLeaderCan')}</p>
            </div>
          );
        }
        if (shown.length === 0) return <p className="text-ink-muted text-sm text-center py-6">No groups match &ldquo;{search}&rdquo;.</p>;
        return (
          <>
            {!term && featuredList.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-serif-heading font-bold text-ink flex items-center gap-1.5"><Star className="w-4 h-4 text-acc-strong" /> {t('prayerGroups.featuredGroups')}</h3>
                {featuredList.map(card)}
              </div>
            )}
            <div className="space-y-2">
              <div>
                <h3 className="font-serif-heading font-bold text-ink">{term ? t('ui.searchResults') : t('ui.browsePrayerTeams')}</h3>
                <p className="text-ink-muted text-xs mt-0.5">{term ? `${shown.length} ${shown.length === 1 ? 'group' : 'groups'} found, featured groups first.` : t('ui.joinAnOpenTeamInstantly')}</p>
              </div>
              {(term ? shown : others).map(card)}
              {!term && others.length === 0 && <p className="text-ink-faint text-xs">{t('prayerGroups.thatIsEveryGroupFor')}</p>}
            </div>
          </>
        );
      })()}
    </div>
  );
}
