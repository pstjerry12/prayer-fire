'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Globe, HandHeart, ChevronLeft, ShieldCheck,
  Trash2, Check, X, RefreshCw, Loader2, Search, Megaphone, Send, Crown, UserMinus,
  Settings, MessageSquareHeart, CalendarDays, DollarSign, Key, ExternalLink,
  AlertTriangle, Flame, Eye, EyeOff, Plus, Edit3, Save, Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/app/utils/cn';

type Tab = 'overview' | 'users' | 'requests' | 'testimonials' | 'donations' | 'announcements' | 'events' | 'settings';

interface Stats {
  users: number;
  partnerRequests: number;
  approvedRequests: number;
  donations: number;
  donationTotal: number;
}

interface UserRow {
  id: string; name: string | null; email: string | null; phone: string | null;
  countryCode: string | null; role: string; provider: string; createdAt: string | null;
}

interface RequestRow {
  id: string; name: string; location: string | null; request: string;
  prayers: number; approved: boolean; createdAt: string | null;
}

interface DonationRow {
  id: string; name: string | null; email: string | null; amount: number;
  currency: string; reference: string | null; status: string; createdAt: string | null;
}

interface AnnouncementRow {
  id: string; title: string; body: string; createdAt: string | null;
}

interface TestimonialRow {
  id: string; name: string; location: string | null; testimony: string;
  approved: boolean; createdAt: string | null;
}

interface EventRow {
  id: string; title: string; description: string | null; date: string;
  time: string | null; link: string | null; createdAt: string | null;
}

interface SettingsData {
  paystack: { mode: string; publicKey: string; secretKey: string; isLive: boolean };
  adminEmail: string; jwtConfigured: boolean; googleConfigured: boolean;
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSending, setAnnSending] = useState(false);
  const [annMsg, setAnnMsg] = useState('');
  // Event form
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evLink, setEvLink] = useState('');
  const [evSending, setEvSending] = useState(false);
  // Testimonial form
  const [testName, setTestName] = useState('');
  const [testLoc, setTestLoc] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testSending, setTestSending] = useState(false);
  // Settings from DB
  const [dbSettings, setDbSettings] = useState<Record<string, string>>({});
  const [paystackPublicInput, setPaystackPublicInput] = useState('');
  const [paystackSecretInput, setPaystackSecretInput] = useState('');
  const [pricePartnerMonthly, setPricePartnerMonthly] = useState('2.99');
  const [pricePartnerYearly, setPricePartnerYearly] = useState('23.99');
  const [priceLeaderMonthly, setPriceLeaderMonthly] = useState('9.99');
  const [priceLeaderYearly, setPriceLeaderYearly] = useState('89.99');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const fetchStats = useCallback(async () => { const res = await fetch('/api/admin/stats'); if (res.ok) setStats(await res.json()); }, []);
  const fetchUsers = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/users'); if (res.ok) setUsers((await res.json()).users); setLoading(false); }, []);
  const fetchRequests = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/partner-requests'); if (res.ok) setRequests((await res.json()).requests); setLoading(false); }, []);
  const fetchDonations = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/donations'); if (res.ok) setDonations((await res.json()).donations); setLoading(false); }, []);
  const fetchAnnouncements = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/announcements'); if (res.ok) setAnnouncements((await res.json()).announcements); setLoading(false); }, []);
  const fetchTestimonials = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/testimonials'); if (res.ok) setTestimonials((await res.json()).testimonials); setLoading(false); }, []);
  const fetchEvents = useCallback(async () => { setLoading(true); const res = await fetch('/api/admin/events'); if (res.ok) setEvents((await res.json()).events); setLoading(false); }, []);
  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      if (data.settings) {
        setDbSettings(data.settings);
        if (data.settings.paystack_public_key) setPaystackPublicInput(data.settings.paystack_public_key);
        if (data.settings.paystack_secret_key) setPaystackSecretInput('••••••••'); // masked
        if (data.settings.price_partner_monthly) setPricePartnerMonthly(data.settings.price_partner_monthly);
        if (data.settings.price_partner_yearly) setPricePartnerYearly(data.settings.price_partner_yearly);
        if (data.settings.price_leader_monthly) setPriceLeaderMonthly(data.settings.price_leader_monthly);
        if (data.settings.price_leader_yearly) setPriceLeaderYearly(data.settings.price_leader_yearly);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/me');
      if (res.ok) { const data = await res.json(); setIsAdmin(data.admin); setAdminName(data.name || data.email || 'Admin'); }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'overview') fetchStats();
    if (tab === 'users') fetchUsers();
    if (tab === 'requests') fetchRequests();
    if (tab === 'testimonials') fetchTestimonials();
    if (tab === 'donations') fetchDonations();
    if (tab === 'announcements') fetchAnnouncements();
    if (tab === 'events') fetchEvents();
    if (tab === 'settings') fetchSettings();
  }, [tab, isAdmin, fetchStats, fetchUsers, fetchRequests, fetchDonations, fetchAnnouncements, fetchTestimonials, fetchEvents, fetchSettings]);

  const approveRequest = async (id: string, approved: boolean) => { await fetch('/api/admin/partner-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, approved }) }); fetchRequests(); };
  const deleteRequest = async (id: string) => { if (!confirm('Delete this prayer request?')) return; await fetch(`/api/admin/partner-requests?id=${id}`, { method: 'DELETE' }); fetchRequests(); fetchStats(); };
  const deleteUser = async (id: string) => { if (!confirm('Delete this user account? This cannot be undone.')) return; await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' }); fetchUsers(); fetchStats(); };
  const setUserRole = async (id: string, role: 'admin' | 'user') => { if (!confirm(role === 'admin' ? 'Promote to admin?' : 'Remove admin role?')) return; await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) }); fetchUsers(); };

  const sendAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) { setAnnMsg('Please enter both a title and a message.'); return; }
    setAnnSending(true); setAnnMsg('');
    const res = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: annTitle, body: annBody }) });
    setAnnSending(false);
    if (res.ok) { setAnnTitle(''); setAnnBody(''); setAnnMsg('✅ Announcement broadcast!'); fetchAnnouncements(); } else { setAnnMsg('Failed to send.'); }
  };
  const deleteAnnouncement = async (id: string) => { if (!confirm('Delete?')) return; await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' }); fetchAnnouncements(); };

  const approveTestimonial = async (id: string, approved: boolean) => { await fetch('/api/admin/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, approved }) }); fetchTestimonials(); };
  const deleteTestimonial = async (id: string) => { if (!confirm('Delete this testimony?')) return; await fetch('/api/admin/testimonials', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchTestimonials(); };
  const addTestimonial = async () => {
    if (!testName.trim() || !testBody.trim()) return;
    setTestSending(true);
    await fetch('/api/admin/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: testName, location: testLoc, testimony: testBody, approved: true }) });
    setTestName(''); setTestLoc(''); setTestBody(''); setTestSending(false); fetchTestimonials();
  };

  const addEvent = async () => {
    if (!evTitle.trim() || !evDate.trim()) return;
    setEvSending(true);
    await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: evTitle, description: evDesc, date: evDate, time: evTime, link: evLink }) });
    setEvTitle(''); setEvDesc(''); setEvDate(''); setEvTime(''); setEvLink(''); setEvSending(false); fetchEvents();
  };
  const deleteEvent = async (id: string) => { if (!confirm('Delete this event?')) return; await fetch('/api/admin/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchEvents(); };

  const saveSettings = async (updates: Record<string, string>) => {
    setSettingsSaving(true); setSettingsMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setSettingsSaving(false);
    if (res.ok) {
      setSettingsMsg('✅ Saved! Changes are live.');
      fetchSettings();
      setTimeout(() => setSettingsMsg(''), 3000);
    } else {
      setSettingsMsg('❌ Failed to save.');
    }
  };

  const fmtMoney = (smallest: number, currency: string) => {
    const isNaira = currency === 'NGN';
    const value = smallest / 100;
    return `${isNaira ? '₦' : '$'}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  if (checking) return (<div className="min-h-screen bg-page flex items-center justify-center"><Loader2 className="w-8 h-8 text-acc animate-spin" /></div>);
  if (!isAdmin) return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="bg-card border border-edge rounded-2xl p-8 text-center max-w-sm">
        <ShieldCheck className="w-12 h-12 text-danger mx-auto mb-3" />
        <h1 className="font-serif-heading text-xl font-bold text-ink mb-2">Access Denied</h1>
        <p className="text-ink-muted text-sm mb-5">You must be signed in as an administrator.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500">Back to Home</Link>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'requests', label: 'Requests', icon: Globe },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquareHeart },
    { id: 'donations', label: 'Donations', icon: HandHeart },
    { id: 'announcements', label: 'Broadcast', icon: Megaphone },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-page">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-edge">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-card-2 rounded-full text-ink-muted"><ChevronLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="font-serif-heading text-lg font-bold text-ink">🔥 Admin Command Center</h1>
              <p className="text-[11px] text-ink-muted">Signed in as {adminName}</p>
            </div>
          </div>
          <span className="bg-acc-soft-2 text-acc-strong text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ADMIN</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all', tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card text-ink-muted border border-edge hover:bg-card-2')}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-acc animate-spin" /></div>}

        {/* ══════ OVERVIEW ══════ */}
        {tab === 'overview' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Users" value={String(stats.users)} icon={<Users className="w-5 h-5" />} />
              <StatCard label="Prayer Requests" value={String(stats.partnerRequests)} icon={<Globe className="w-5 h-5" />} />
              <StatCard label="Approved" value={String(stats.approvedRequests)} icon={<Check className="w-5 h-5" />} />
              <StatCard label="Donations" value={`${stats.donations}`} sub={`≈ ${fmtMoney(stats.donationTotal, 'NGN')}`} icon={<HandHeart className="w-5 h-5" />} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Testimonials" value={String(testimonials.length)} icon={<MessageSquareHeart className="w-5 h-5" />} color="amber" />
              <StatCard label="Events" value={String(events.length)} icon={<CalendarDays className="w-5 h-5" />} color="blue" />
              <StatCard label="Paystack" value={settings?.paystack.isLive ? 'LIVE' : 'TEST'} icon={<Key className="w-5 h-5" />} color={settings?.paystack.isLive ? 'emerald' : 'amber'} />
            </div>
            {/* Quick actions */}
            <div className="card p-5">
              <h3 className="font-bold text-ink mb-3">⚡ Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onClick={() => setTab('announcements')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-bg-card-2 hover:bg-bg-acc-soft transition text-sm">
                  <Megaphone size={20} className="text-text-warn" /> Broadcast
                </button>
                <button onClick={() => setTab('events')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-bg-card-2 hover:bg-bg-acc-soft transition text-sm">
                  <CalendarDays size={20} className="text-text-acc" /> New Event
                </button>
                <button onClick={() => setTab('testimonials')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-bg-card-2 hover:bg-bg-acc-soft transition text-sm">
                  <MessageSquareHeart size={20} className="text-text-premium" /> Testimonies
                </button>
                <button onClick={() => setTab('settings')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-bg-card-2 hover:bg-bg-acc-soft transition text-sm">
                  <Settings size={20} className="text-text-ink-soft" /> Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ USERS ══════ */}
        {tab === 'users' && (
          <div className="bg-card border border-edge rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-edge">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input type="text" placeholder="Search users by name, email or phone..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-page border border-edge-strong rounded-lg pl-10 pr-4 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
              </div>
            </div>
            <div className="divide-y divide-edge">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">{u.name || 'Anonymous'}</p>
                    <p className="text-ink-muted text-xs truncate">{u.email || (u.phone ? `${u.countryCode ?? ''} ${u.phone}` : '—')}</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-card-2 text-ink-muted')}>
                    {u.role === 'admin' ? 'ADMIN' : 'USER'}
                  </span>
                  {u.role === 'admin' ? (
                    <button onClick={() => setUserRole(u.id, 'user')} className="p-2 text-ink-faint hover:text-warn" title="Remove admin"><UserMinus className="w-4 h-4" /></button>
                  ) : (
                    <button onClick={() => setUserRole(u.id, 'admin')} className="p-2 text-ink-faint hover:text-acc" title="Promote to admin"><Crown className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => deleteUser(u.id)} className="p-2 text-ink-faint hover:text-danger" title="Delete user"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {filteredUsers.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No users found.</p>}
            </div>
          </div>
        )}

        {/* ══════ PRAYER REQUESTS ══════ */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className={cn('bg-card border rounded-2xl p-4', r.approved ? 'border-acc-edge' : 'border-edge')}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-ink font-bold text-sm">{r.name}</p>
                    <p className="text-ink-muted text-xs">{r.location || 'Unknown location'} · {r.prayers} prayers</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', r.approved ? 'bg-acc-soft-2 text-acc-strong' : 'bg-amber-100 text-amber-700')}>
                    {r.approved ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-ink-soft text-sm">{r.request}</p>
                <div className="flex gap-2 mt-3">
                  {r.approved ? (
                    <button onClick={() => approveRequest(r.id, false)} className="flex items-center gap-1 px-3 py-1.5 bg-card-2 text-ink-soft rounded-lg text-xs font-semibold hover:bg-card-3"><X className="w-3 h-3" /> Unapprove</button>
                  ) : (
                    <button onClick={() => approveRequest(r.id, true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500"><Check className="w-3 h-3" /> Approve</button>
                  )}
                  <button onClick={() => deleteRequest(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-danger rounded-lg text-xs font-semibold hover:bg-danger-soft"><Trash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            ))}
            {requests.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No prayer requests yet.</p>}
          </div>
        )}

        {/* ══════ TESTIMONIALS ══════ */}
        {tab === 'testimonials' && (
          <div className="space-y-4">
            {/* Add testimony */}
            <div className="bg-card border border-edge rounded-2xl p-5">
              <h2 className="font-bold text-ink mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-acc" /> Add Testimony</h2>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Name" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                <input type="text" placeholder="Location (optional)" value={testLoc} onChange={(e) => setTestLoc(e.target.value)} className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
              </div>
              <textarea placeholder="Their testimony..." value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={3}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none mb-3" />
              <button onClick={addTestimonial} disabled={testSending || !testName.trim() || !testBody.trim()}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500 disabled:opacity-50">
                {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add & Approve
              </button>
            </div>
            {/* List */}
            <div className="bg-card border border-edge rounded-2xl overflow-hidden">
              <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">All Testimonials — you have the final say</p>
              <div className="divide-y divide-edge">
                {testimonials.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-ink font-semibold text-sm">{t.name}</p>
                        <span className="text-ink-muted text-xs">{t.location}</span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', t.approved ? 'bg-acc-soft-2 text-acc-strong' : 'bg-amber-100 text-amber-700')}>
                          {t.approved ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </div>
                      <p className="text-ink-soft text-xs">{t.testimony}</p>
                    </div>
                    <button onClick={() => approveTestimonial(t.id, !t.approved)} className={cn('p-2 rounded-lg', t.approved ? 'text-ink-faint hover:text-warn' : 'text-ink-faint hover:text-acc')} title={t.approved ? 'Hide' : 'Approve'}>
                      {t.approved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteTestimonial(t.id)} className="p-2 text-ink-faint hover:text-danger" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {testimonials.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No testimonials yet. Add one above!</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ DONATIONS ══════ */}
        {tab === 'donations' && (
          <div className="bg-card border border-edge rounded-2xl overflow-hidden">
            <div className="divide-y divide-edge">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">{d.name || 'Anonymous'}</p>
                    <p className="text-ink-muted text-xs truncate">{d.email || '—'} · {d.reference ? `ref: ${d.reference}` : 'no ref'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-ink font-bold text-sm">{fmtMoney(d.amount, d.currency)}</p>
                    <p className="text-acc-strong text-[10px] font-bold uppercase">{d.status}</p>
                  </div>
                </div>
              ))}
              {donations.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No donations recorded yet.</p>}
            </div>
          </div>
        )}

        {/* ══════ ANNOUNCEMENTS / BROADCAST ══════ */}
        {tab === 'announcements' && (
          <div className="space-y-4">
            <div className="bg-card border border-edge rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-warn-soft text-warn"><Megaphone className="w-4 h-4" /></span>
                <div>
                  <h2 className="font-bold text-ink">Broadcast to All Users</h2>
                  <p className="text-xs text-ink-muted">Appears on every user&apos;s home page</p>
                </div>
              </div>
              <input type="text" placeholder="Title (e.g. 🔥 Global Prayer Conference)" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-2" />
              <textarea placeholder="Message to the community…" value={annBody} onChange={(e) => setAnnBody(e.target.value)} rows={3}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none mb-3" />
              {annMsg && <p className="text-xs font-semibold text-acc-strong mb-2">{annMsg}</p>}
              <button onClick={sendAnnouncement} disabled={annSending}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500 disabled:opacity-50">
                {annSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {annSending ? 'Sending…' : 'Broadcast to Everyone'}
              </button>
            </div>
            <div className="bg-card border border-edge rounded-2xl overflow-hidden">
              <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">Past announcements</p>
              <div className="divide-y divide-edge">
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold text-sm">{a.title}</p>
                      <p className="text-ink-soft text-xs mt-0.5">{a.body}</p>
                      <p className="text-ink-faint text-[10px] mt-1">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</p>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)} className="p-2 text-ink-faint hover:text-danger shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {announcements.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No announcements yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ GLOBAL EVENTS ══════ */}
        {tab === 'events' && (
          <div className="space-y-4">
            <div className="bg-card border border-edge rounded-2xl p-5">
              <h2 className="font-bold text-ink mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-text-fire" /> Announce Global Prayer Event</h2>
              <input type="text" placeholder="Event title (e.g. 🔥 21-Day Global Prayer Challenge)" value={evTitle} onChange={(e) => setEvTitle(e.target.value)}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-2" />
              <textarea placeholder="Description (optional)" value={evDesc} onChange={(e) => setEvDesc(e.target.value)} rows={2}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none mb-2" />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs font-semibold text-ink-muted mb-1 block">Date</label>
                  <input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)}
                    className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted mb-1 block">Time</label>
                  <input type="text" placeholder="e.g. 4:00 AM WAT" value={evTime} onChange={(e) => setEvTime(e.target.value)}
                    className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
              </div>
              <input type="url" placeholder="Link (Zoom/YouTube — optional)" value={evLink} onChange={(e) => setEvLink(e.target.value)}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-3" />
              <button onClick={addEvent} disabled={evSending || !evTitle.trim() || !evDate}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500 disabled:opacity-50">
                {evSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Event
              </button>
            </div>
            <div className="bg-card border border-edge rounded-2xl overflow-hidden">
              <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">Upcoming Events</p>
              <div className="divide-y divide-edge">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold text-sm">{ev.title}</p>
                      {ev.description && <p className="text-ink-soft text-xs mt-0.5">{ev.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-muted">
                        <span>📅 {ev.date}</span>
                        {ev.time && <span>🕐 {ev.time}</span>}
                        {ev.link && <a href={ev.link} target="_blank" rel="noopener" className="text-acc-strong hover:underline flex items-center gap-0.5"><LinkIcon className="w-3 h-3" /> Join</a>}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="p-2 text-ink-faint hover:text-danger shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {events.length === 0 && <p className="text-center text-ink-muted text-sm py-8">No events yet. Create one above!</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ SETTINGS ══════ */}
        {tab === 'settings' && settings && (
          <div className="space-y-4">
            {settingsMsg && (
              <div className={cn('rounded-xl p-3 text-sm font-semibold text-center', settingsMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                {settingsMsg}
              </div>
            )}

            {/* Paystack — PASTE YOUR KEY HERE */}
            <div className="bg-card border-2 rounded-2xl p-5" style={{ borderColor: dbSettings.paystack_public_key?.startsWith('pk_live_') ? '#059669' : '#d97706' }}>
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-5 h-5 text-text-fire" />
                <h2 className="font-bold text-ink text-lg">💳 Paystack Live Key</h2>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto',
                  dbSettings.paystack_public_key?.startsWith('pk_live_') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {dbSettings.paystack_public_key?.startsWith('pk_live_') ? 'LIVE' : 'TEST'}
                </span>
              </div>

              {dbSettings.paystack_public_key?.startsWith('pk_live_') ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 mb-3">
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✅ Paystack is LIVE — donations are working!</p>
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">Public key: <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">{dbSettings.paystack_public_key}</code></p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-3">
                  <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">⏳ Donations show "Coming Soon" — paste your live key below when Paystack approves you</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Public Key (pk_live_...)</label>
                  <input
                    type="text"
                    placeholder="pk_live_...paste your public key here..."
                    value={paystackPublicInput}
                    onChange={(e) => setPaystackPublicInput(e.target.value)}
                    className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink font-mono placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1">Secret Key (sk_live_...) — stored securely in DB</label>
                  <input
                    type="password"
                    placeholder="sk_live_...paste your secret key here..."
                    value={paystackSecretInput}
                    onChange={(e) => setPaystackSecretInput(e.target.value)}
                    className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink font-mono placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <button
                  onClick={() => {
                    const updates: Record<string, string> = {};
                    if (paystackPublicInput && paystackPublicInput !== '••••••••') updates.paystack_public_key = paystackPublicInput;
                    if (paystackSecretInput && paystackSecretInput !== '••••••••') updates.paystack_secret_key = paystackSecretInput;
                    if (Object.keys(updates).length > 0) saveSettings(updates);
                  }}
                  disabled={settingsSaving}
                  className="w-full py-2.5 bg-gradient-to-r from-[#ff6a00] to-[#ff3d00] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {settingsSaving ? 'Saving...' : 'Save Paystack Keys'}
                </button>
              </div>

              <div className="mt-3 bg-card-2 rounded-xl p-3">
                <p className="text-xs text-ink-muted leading-relaxed">
                  💡 <strong>How it works:</strong> Paste your keys here and click Save. The app reads from the database first, so donations switch from "Coming Soon" to the real payment form <strong>instantly</strong> — no Vercel redeploy needed. You can also add these same keys to Vercel env vars as a backup.
                </p>
              </div>
            </div>

            {/* Pricing — EDIT HERE */}
            <div className="bg-card border border-edge rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-text-warn" />
                <h2 className="font-bold text-ink text-lg">💰 Edit Pricing</h2>
              </div>

              <div className="bg-card-2 rounded-xl p-3 mb-3">
                <p className="text-xs text-ink-muted">
                  💡 Changes are saved to the database and take effect <strong>immediately</strong> — no redeploy needed. Currency conversion is automatic (NGN, KES, GHS, ZAR, GBP, EUR).
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-3">
                <p className="font-bold text-ink text-sm mb-1">👑 Prayer Fire Partner</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">Monthly (USD)</label>
                    <input type="number" step="0.01" value={pricePartnerMonthly} onChange={(e) => setPricePartnerMonthly(e.target.value)}
                      className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">Yearly (USD)</label>
                    <input type="number" step="0.01" value={pricePartnerYearly} onChange={(e) => setPricePartnerYearly(e.target.value)}
                      className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3">
                <p className="font-bold text-ink text-sm mb-1">🔥 Fire Partner Leader</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">Monthly (USD)</label>
                    <input type="number" step="0.01" value={priceLeaderMonthly} onChange={(e) => setPriceLeaderMonthly(e.target.value)}
                      className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-muted block mb-1">3Yearly (USD)</label>
                    <input type="number" step="0.01" value={priceLeaderYearly} onChange={(e) => setPriceLeaderYearly(e.target.value)}
                      className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => saveSettings({
                  price_partner_monthly: pricePartnerMonthly,
                  price_partner_yearly: pricePartnerYearly,
                  price_leader_monthly: priceLeaderMonthly,
                  price_leader_yearly: priceLeaderYearly,
                })}
                disabled={settingsSaving}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {settingsSaving ? 'Saving...' : 'Save Prices'}
              </button>
            </div>

            {/* App Status */}
            <div className="bg-card border border-edge rounded-2xl p-5">
              <h2 className="font-bold text-ink text-lg mb-3">🔧 App Status</h2>
              <div className="space-y-2">
                {[
                  { label: 'JWT Auth', ok: settings.jwtConfigured, detail: settings.jwtConfigured ? 'Configured' : 'Missing JWT_SECRET' },
                  { label: 'Google OAuth', ok: settings.googleConfigured, detail: settings.googleConfigured ? 'Configured' : 'Missing GOOGLE_CLIENT_ID' },
                  { label: 'Admin Email', ok: !!settings.adminEmail, detail: settings.adminEmail || 'Not set' },
                  { label: 'Paystack Live', ok: dbSettings.paystack_public_key?.startsWith('pk_live_'), detail: dbSettings.paystack_public_key?.startsWith('pk_live_') ? 'LIVE — donations working' : 'TEST — donations show "Coming Soon"' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-card-2 rounded-lg px-4 py-3">
                    <span className="text-sm text-ink-soft">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted">{item.detail}</span>
                      <span className={cn('text-xs font-bold', item.ok ? 'text-emerald-600' : 'text-amber-600')}>{item.ok ? '✅' : '⚠️'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color?: string }) {
  const bg = color === 'amber' ? 'bg-amber-100 text-amber-600' : color === 'blue' ? 'bg-blue-100 text-blue-600' : color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-acc-soft text-acc';
  return (
    <div className="bg-card border border-edge rounded-2xl p-4">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', bg)}>{icon}</div>
      <p className="text-2xl font-bold text-ink leading-none">{value}</p>
      <p className="text-ink-muted text-xs mt-1">{label}</p>
      {sub && <p className="text-acc-strong text-[10px] font-semibold mt-0.5">{sub}</p>}
    </div>
  );
}
