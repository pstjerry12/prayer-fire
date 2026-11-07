'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Flame, Globe, HandHeart, Loader2, Megaphone, Plus, Send, Share2, Siren, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { fetchDirectory, groupAction } from '@/lib/groupsClient';
import type { DirectoryGroup } from '@/lib/groups';
import type { AlertDetail, AlertSummary, AltarRequest } from '@/lib/alerts';
import { useI18n } from '@/app/i18n';

const COUNTRY_NAMES = (() => {
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' });
  } catch {
    return null;
  }
})();
export const countryName = (code: string) => (COUNTRY_NAMES?.of(code) as string | undefined) ?? code;

type TFn = ReturnType<typeof useI18n>['t'];
function ago(iso: string, t: TFn) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return t('ui.justNow');
  if (mins < 60) return t('time.minAgo', { n: mins });
  if (mins < 1440) return t('time.hourAgo', { n: Math.round(mins / 60) });
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const peopleText = (a: Pick<AlertSummary, 'praying' | 'countries'>, t: TFn) =>
  a.praying === 0
    ? t('ui.beTheFirstToPray')
    : `${a.praying === 1 ? t('alerts.onePersonPraying') : t('alerts.peoplePraying', { n: a.praying.toLocaleString() })}${a.countries > 0 ? ` ${a.countries === 1 ? t('alerts.fromOneCountry') : t('alerts.fromCountries', { n: a.countries })}` : ''}`;

/** Global Prayer Alerts for everyone: urgent worldwide prayer needs with a live "praying now" counter, updates and testimonies. */
export default function GlobalAlerts() {
  const { t, tr } = useI18n();
  const { user, isLeader, setShowAuth } = useApp();
  const [alerts, setAlerts] = useState<AlertSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'list' | 'raise'>('list');
  const [myRequests, setMyRequests] = useState<AltarRequest[]>([]);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setAlerts(data.alerts);
        setError('');
      } else setError(data.error || 'Could not load prayer alerts.');
    } catch {
      setError('No connection. Check your internet and try again.');
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setDetail(data.alert);
      else if (res.status === 404) { setDetail(null); setOpenId(null); }
    } catch {
      /* keep what is on screen */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList();
  }, [loadList, user]);

  // The open alert's counter refreshes by itself, so people see others joining.
  useEffect(() => {
    if (!openId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail(openId);
    const t = setInterval(() => loadDetail(openId), 20000);
    return () => clearInterval(t);
  }, [openId, loadDetail]);

  useEffect(() => {
    if (!user || !isLeader) return;
    fetch('/api/alerts?mine=1', { cache: 'no-store' }).then((r) => r.json()).then((d) => setMyRequests(d.requests ?? [])).catch(() => {});
  }, [user, isLeader, view]);

  const pray = async (id: string) => {
    if (!user) return setShowAuth(true);
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pray', id }) });
      const data = await res.json();
      if (res.ok && data.alert) setDetail(data.alert);
      else setError(data.error || 'Could not count your prayer.');
    } catch {
      setError('No connection. Check your internet and try again.');
    }
    setBusy(false);
  };

  const share = async (a: AlertDetail) => {
    const text = `Please pray: ${a.title}${a.country ? ` (${a.country})` : ''}. ${a.praying.toLocaleString()} people are praying on Prayer Fire.\nhttps://prayer-fire.vercel.app/alerts`;
    try {
      if (navigator.share) await navigator.share({ title: a.title, text, url: 'https://prayer-fire.vercel.app/alerts' });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* closed */
    }
  };

  // ── Raise an altar (Leader) ─────────────────────────────────
  if (view === 'raise') return <RaiseAltar onBack={() => setView('list')} />;

  // ── Detail ──────────────────────────────────────────────────
  if (openId) {
    if (!detail) return <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('globalAlerts.opening')}</p>;
    return (
      <div className="space-y-3" data-testid="alert-detail">
        <button onClick={() => { setOpenId(null); setDetail(null); loadList(); }} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong"><ChevronLeft className="w-4 h-4" /> {t('globalAlerts.allAlerts')}</button>
        {error && <p role="alert" className="text-danger text-xs">{tr(error)}</p>}
        <div className="bg-card rounded-2xl border border-edge p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-danger-soft text-danger flex items-center justify-center flex-shrink-0"><Siren className="w-5 h-5" /></div>
            <div className="min-w-0">
              <h2 className="font-serif-heading text-lg font-bold text-ink leading-snug">{detail.title}</h2>
              <p className="text-ink-muted text-xs mt-0.5">{detail.country ? `${detail.country} · ` : `${t('ui.worldwide')} · `}{ago(detail.createdAt, t)} · {detail.source === 'leader' ? t('alerts.raisedBy', { name: detail.authorName }) : 'Prayer Fire'}</p>
            </div>
          </div>
          {detail.summary && <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-line">{detail.summary}</p>}
          {detail.scriptures.length > 0 && (
            <div>
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong mb-1">{t('globalAlerts.scripturesToPray')}</p>
              <div className="flex flex-wrap gap-1.5">{detail.scriptures.map((v) => <span key={v} className="bg-acc-soft text-acc-strong text-xs font-semibold px-2 py-1 rounded-full">{v}</span>)}</div>
            </div>
          )}
          {detail.points.length > 0 && (
            <div>
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-acc-strong mb-1">{t('globalAlerts.prayerPoints')}</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-ink-soft">{detail.points.map((p) => <li key={p}>{p}</li>)}</ol>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-acc-edge p-4 text-center space-y-3" data-testid="alert-counter">
          <p className="text-3xl font-bold text-acc-strong">{detail.praying.toLocaleString()}</p>
          <p className="text-ink-muted text-sm -mt-2">{peopleText(detail, t)}</p>
          {detail.status === 'live' ? (
            <button onClick={() => pray(detail.id)} disabled={busy || detail.iAmPraying} data-testid="alert-pray"
              className={cn('w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2', detail.iAmPraying ? 'bg-acc-soft text-acc-strong' : 'bg-acc text-on-acc hover:bg-acc-hover', 'disabled:opacity-80')}>
              <HandHeart className="w-5 h-5" /> {detail.iAmPraying ? "You're praying. Thank you." : "I'm praying"}
            </button>
          ) : <p className="text-ink-faint text-xs">{t('globalAlerts.thisAlertHasEndedThank')}</p>}
          {!user && detail.status === 'live' && <p className="text-ink-faint text-[0.6875rem]">{t('globalAlerts.youWillBeAskedTo')}</p>}
          {detail.topCountries.length > 0 && (
            <div className="text-left pt-1">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> {t('globalAlerts.prayingFrom')}</p>
              <div className="flex flex-wrap gap-1.5">{detail.topCountries.map((c) => <span key={c.code} className="bg-card-2 text-ink-soft text-xs px-2 py-1 rounded-full">{countryName(c.code)} · {c.count}</span>)}</div>
            </div>
          )}
          <button onClick={() => share(detail)} className="w-full py-2 rounded-xl border border-edge-strong text-ink-soft text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-card-2"><Share2 className="w-3.5 h-3.5" /> {t('globalAlerts.shareThisAlert')}</button>
        </div>

        {detail.updates.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-serif-heading font-bold text-ink">{t('globalAlerts.updatesAndAnsweredPrayers')}</h3>
            {detail.updates.map((u) => (
              <div key={u.id} className={cn('rounded-2xl border p-3', u.kind === 'testimony' ? 'bg-acc-soft border-acc-edge' : 'bg-card border-edge')}>
                <p className={cn('text-[0.625rem] font-bold uppercase tracking-wider mb-1', u.kind === 'testimony' ? 'text-acc-strong' : 'text-ink-muted')}>{u.kind === 'testimony' ? t('ui.answeredPrayer') : t('ui.update')} · {ago(u.createdAt, t)}</p>
                <p className="text-sm text-ink-soft whitespace-pre-line">{u.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── List ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-danger text-xs">{tr(error)}</p>}
      {user && isLeader && (
        <button onClick={() => setView('raise')} className="w-full py-2.5 bg-card text-acc-strong border border-acc rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-acc-soft">
          <Plus className="w-4 h-4" /> Raise a prayer altar
        </button>
      )}
      {myRequests.some((r) => r.status !== 'approved') && (
        <div className="bg-card rounded-2xl border border-edge p-3 space-y-1.5">
          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">{t('globalAlerts.yourAltarRequests')}</p>
          {myRequests.filter((r) => r.status !== 'approved').map((r) => (
            <p key={r.id} className="text-xs text-ink-soft"><strong>{r.title}</strong> · {r.status === 'pending' ? 'waiting for approval' : `not approved${r.note ? `: ${r.note}` : ''}`}</p>
          ))}
        </div>
      )}
      {alerts === null && !error ? (
        <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('globalAlerts.loading')}</p>
      ) : alerts && alerts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-edge p-8 text-center">
          <Megaphone className="w-10 h-10 text-ink-ghost mx-auto mb-2" />
          <p className="text-ink-muted text-sm">{t('globalAlerts.noUrgentPrayerNeedsRight')}</p>
          <p className="text-ink-faint text-xs mt-1">{t('globalAlerts.whenSomethingNeedsTheWhole')}</p>
        </div>
      ) : (
        (alerts ?? []).map((a) => (
          <button key={a.id} onClick={() => { setOpenId(a.id); setDetail(null); }} data-testid="alert-card"
            className="w-full text-left bg-card border border-edge rounded-2xl p-4 hover:border-acc-edge transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center flex-shrink-0"><Siren className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-ink font-bold text-sm leading-snug">{a.title}</h3>
                <p className="text-ink-muted text-xs mt-0.5">{a.country ? `${a.country} · ` : ''}{ago(a.createdAt, t)}{a.source === 'leader' ? ` · ${a.authorName}` : ''}</p>
                {a.summary && <p className="text-ink-soft text-xs mt-1 line-clamp-2">{a.summary}</p>}
                <p className="text-acc-strong text-xs font-semibold mt-1.5 flex items-center gap-1"><Flame className="w-3 h-3" /> {peopleText(a, t)}{a.iAmPraying ? ` · ${t('ui.youArePraying')}` : ''}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

/** A Leader raises a prayer altar for a country or issue: PUBLIC (everyone, after the admin approves) or PRIVATE (their own group). */
function RaiseAltar({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [audience, setAudience] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [summary, setSummary] = useState('');
  const [scriptures, setScriptures] = useState('');
  const [points, setPoints] = useState('');
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDirectory().then((r) => {
      if (!r.ok) return;
      const mine = r.data.groups.filter((g) => (g.myRole === 'leader' || g.myRole === 'co_leader'));
      setGroups(mine);
      setGroupId(mine[0]?.id ?? '');
    });
  }, []);

  async function submit() {
    if (busy || title.trim().length < 3) return;
    setBusy(true);
    setMessage(null);
    if (audience === 'public') {
      const res = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', title, country, summary, scriptures, points }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ kind: 'ok', text: t('ui.sentYourAltarGoesPublic') });
        setTitle(''); setSummary(''); setScriptures(''); setPoints(''); setCountry('');
      } else setMessage({ kind: 'error', text: data.error || t('ui.couldNotSendTheRequest') });
    } else {
      const lines = [`🔥 ${title.trim()}${country.trim() ? ` (${country.trim()})` : ''}`, summary.trim(), scriptures.trim() ? `Scriptures: ${scriptures.split('\n').map((x) => x.trim()).filter(Boolean).join('; ')}` : '', points.trim() ? `Prayer points:\n${points.split('\n').map((x, i) => x.trim() ? `${i + 1}. ${x.trim()}` : '').filter(Boolean).join('\n')}` : ''].filter(Boolean);
      const r = await groupAction({ action: 'post', groupId, kind: 'alert', body: lines.join('\n\n').slice(0, 2000) });
      if (r.ok) {
        setMessage({ kind: 'ok', text: t('ui.postedToYourGroupAs') });
        setTitle(''); setSummary(''); setScriptures(''); setPoints(''); setCountry('');
      } else setMessage({ kind: 'error', text: r.error });
    }
    setBusy(false);
  }

  const field = 'w-full bg-card border border-edge-strong rounded-xl px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40';
  return (
    <div className="space-y-3" data-testid="raise-altar">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong"><ChevronLeft className="w-4 h-4" /> {t('globalAlerts.allAlerts')}</button>
      <h2 className="font-serif-heading text-lg font-bold text-ink">{t('globalAlerts.raiseAPrayerAltar')}</h2>
      <p className="text-ink-muted text-xs leading-relaxed">{t('ui.altarsIntro1')} <strong>{t('globalAlerts.public')}</strong> {t('ui.altarsIntro2')} <strong>{t('globalAlerts.private')}</strong> {t('ui.altarsIntro3')}</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('globalAlerts.whoCanSeeIt')}>
        {(['public', 'private'] as const).map((a) => (
          <button key={a} role="radio" aria-checked={audience === a} onClick={() => setAudience(a)} className={cn('py-2.5 rounded-xl border-2 text-sm font-bold', audience === a ? 'border-acc bg-acc-soft text-acc-strong' : 'border-edge bg-card text-ink-muted')}>
            {a === 'public' ? t('ui.publicEveryone') : t('ui.privateMyGroup')}
          </button>
        ))}
      </div>
      {audience === 'private' && (groups.length === 0
        ? <p className="text-warn-strong text-xs bg-warn-soft border border-warn-edge rounded-xl p-3">{t('globalAlerts.youNeedAGroupTo')}</p>
        : <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label={t('globalAlerts.group')} className={field}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>)}
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={t('globalAlerts.titleEGPrayFor')} aria-label={t('globalAlerts.title')} className={field} />
      <input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder={t('globalAlerts.countryOrPlaceOptional')} aria-label={t('globalAlerts.country')} className={field} />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={1500} placeholder={t('globalAlerts.whatIsHappeningShortSummary')} aria-label={t('globalAlerts.summary')} className={cn(field, 'resize-none')} />
      <textarea value={scriptures} onChange={(e) => setScriptures(e.target.value)} rows={2} placeholder={'Scriptures, one per line\nPsalm 91:1-2'} aria-label={t('globalAlerts.scriptures')} className={cn(field, 'resize-none')} />
      <textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={4} placeholder={'Prayer points, one per line\nProtection for families'} aria-label={t('globalAlerts.prayerPoints')} className={cn(field, 'resize-none')} />
      {message && <p role="status" className={cn('text-sm rounded-xl p-3 border', message.kind === 'ok' ? 'text-acc-strong bg-acc-soft border-acc-edge' : 'text-danger bg-danger-soft border-danger-edge')}>{message.text}</p>}
      <button onClick={submit} disabled={busy || title.trim().length < 3 || (audience === 'private' && !groupId)} className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : audience === 'public' ? <Send className="w-4 h-4" /> : <Siren className="w-4 h-4" />} {audience === 'public' ? t('ui.sendForApproval') : t('ui.postToMyGroup')}
      </button>
      <button onClick={onBack} className="w-full py-2 text-ink-muted text-xs flex items-center justify-center gap-1"><X className="w-3 h-3" /> {t('customizablePrayerSchedule.cancel')}</button>
    </div>
  );
}
