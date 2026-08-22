'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Globe, HandHeart, ChevronLeft, ShieldCheck,
  Trash2, Check, X, RefreshCw, Loader2, Search, Megaphone, Send, Crown, UserMinus,
} from 'lucide-react';
import { cn } from '@/app/utils/cn';

type Tab = 'overview' | 'users' | 'requests' | 'donations' | 'announcements';

interface Stats {
  users: number;
  partnerRequests: number;
  approvedRequests: number;
  donations: number;
  donationTotal: number;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  role: string;
  provider: string;
  createdAt: string | null;
}

interface RequestRow {
  id: string;
  name: string;
  location: string | null;
  request: string;
  prayers: number;
  approved: boolean;
  createdAt: string | null;
}

interface DonationRow {
  id: string;
  name: string | null;
  email: string | null;
  amount: number;
  currency: string;
  reference: string | null;
  status: string;
  createdAt: string | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  createdAt: string | null;
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
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annSending, setAnnSending] = useState(false);
  const [annMsg, setAnnMsg] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers((await res.json()).users);
    setLoading(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/partner-requests');
    if (res.ok) setRequests((await res.json()).requests);
    setLoading(false);
  }, []);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/donations');
    if (res.ok) setDonations((await res.json()).donations);
    setLoading(false);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/announcements');
    if (res.ok) setAnnouncements((await res.json()).announcements);
    setLoading(false);
  }, []);

  // Check admin access on mount.
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.admin);
        setAdminName(data.name || data.email || 'Admin');
      }
      setChecking(false);
    })();
  }, []);

  // Load data for the active tab.
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'overview') fetchStats();
    if (tab === 'users') fetchUsers();
    if (tab === 'requests') fetchRequests();
    if (tab === 'donations') fetchDonations();
    if (tab === 'announcements') fetchAnnouncements();
  }, [tab, isAdmin, fetchStats, fetchUsers, fetchRequests, fetchDonations, fetchAnnouncements]);

  const approveRequest = async (id: string, approved: boolean) => {
    await fetch('/api/admin/partner-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved }),
    });
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this prayer request?')) return;
    await fetch(`/api/admin/partner-requests?id=${id}`, { method: 'DELETE' });
    fetchRequests();
    fetchStats();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user account? This cannot be undone.')) return;
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    fetchUsers();
    fetchStats();
  };

  const setUserRole = async (id: string, role: 'admin' | 'user') => {
    const action = role === 'admin' ? 'promote this user to admin?' : 'remove this user\'s admin role?';
    if (!confirm(`Are you sure you want to ${action}`)) return;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    fetchUsers();
  };

  const sendAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      setAnnMsg('Please enter both a title and a message.');
      return;
    }
    setAnnSending(true);
    setAnnMsg('');
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: annTitle, body: annBody }),
    });
    setAnnSending(false);
    if (res.ok) {
      setAnnTitle('');
      setAnnBody('');
      setAnnMsg('✅ Announcement broadcast to everyone!');
      fetchAnnouncements();
    } else {
      setAnnMsg('Failed to send announcement.');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
    fetchAnnouncements();
  };

  const fmtMoney = (smallest: number, currency: string) => {
    const isNaira = currency === 'NGN';
    const value = smallest / 100;
    return `${isNaira ? '₦' : '$'}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="bg-card border border-edge rounded-2xl p-8 text-center max-w-sm">
          <ShieldCheck className="w-12 h-12 text-danger mx-auto mb-3" />
          <h1 className="font-serif-heading text-xl font-bold text-ink mb-2">Access Denied</h1>
          <p className="text-ink-muted text-sm mb-5">
            You must be signed in as an administrator to view the back office.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'requests', label: 'Prayer Requests', icon: Globe },
    { id: 'donations', label: 'Donations', icon: HandHeart },
    { id: 'announcements', label: 'Broadcast', icon: Megaphone },
  ];

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-page">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-edge">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-card-2 rounded-full text-ink-muted">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-serif-heading text-lg font-bold text-ink">Admin Back Office</h1>
              <p className="text-[11px] text-ink-muted">Signed in as {adminName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => tab === 'overview' ? fetchStats() : tab === 'users' ? fetchUsers() : tab === 'requests' ? fetchRequests() : fetchDonations()} className="p-2 hover:bg-card-2 rounded-full text-ink-muted" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="bg-acc-soft-2 text-acc-strong text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> ADMIN
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
                  tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card text-ink-muted border border-edge hover:bg-card-2'
                )}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-acc animate-spin" />
          </div>
        )}

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={String(stats.users)} icon={<Users className="w-5 h-5" />} />
            <StatCard label="Prayer Requests" value={String(stats.partnerRequests)} icon={<Globe className="w-5 h-5" />} />
            <StatCard label="Approved" value={String(stats.approvedRequests)} icon={<Check className="w-5 h-5" />} />
            <StatCard
              label="Donations"
              value={`${stats.donations}`}
              sub={`≈ ${fmtMoney(stats.donationTotal, 'NGN')}`}
              icon={<HandHeart className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="bg-card border border-edge rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-edge">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search users by name, email or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-page border border-edge-strong rounded-lg pl-10 pr-4 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>
            <div className="divide-y divide-edge">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">{u.name || 'Anonymous'}</p>
                    <p className="text-ink-muted text-xs truncate">
                      {u.email || (u.phone ? `${u.countryCode ?? ''} ${u.phone}` : '—')}
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', u.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-warn-soft dark:text-warn-strong' : 'bg-card-2 text-ink-muted')}>
                    {u.role === 'admin' ? 'ADMIN' : 'USER'}
                  </span>
                  {u.role === 'admin' ? (
                    <button onClick={() => setUserRole(u.id, 'user')} className="p-2 text-ink-faint hover:text-warn" title="Remove admin role">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => setUserRole(u.id, 'admin')} className="p-2 text-ink-faint hover:text-acc" title="Promote to admin">
                      <Crown className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteUser(u.id)} className="p-2 text-ink-faint hover:text-danger" title="Delete user">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-ink-muted text-sm py-8">No users found.</p>
              )}
            </div>
          </div>
        )}

        {/* Prayer requests */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className={cn('bg-card border rounded-2xl p-4', r.approved ? 'border-acc-edge' : 'border-edge')}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-ink font-bold text-sm">{r.name}</p>
                    <p className="text-ink-muted text-xs">{r.location || 'Unknown location'} · {r.prayers} prayers</p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', r.approved ? 'bg-acc-soft-2 text-acc-strong' : 'bg-amber-100 text-amber-700 dark:bg-warn-soft dark:text-warn-strong')}>
                    {r.approved ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-ink-soft text-sm">{r.request}</p>
                <div className="flex gap-2 mt-3">
                  {r.approved ? (
                    <button onClick={() => approveRequest(r.id, false)} className="flex items-center gap-1 px-3 py-1.5 bg-card-2 text-ink-soft rounded-lg text-xs font-semibold hover:bg-card-3">
                      <X className="w-3 h-3" /> Unapprove
                    </button>
                  ) : (
                    <button onClick={() => approveRequest(r.id, true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                  )}
                  <button onClick={() => deleteRequest(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-danger rounded-lg text-xs font-semibold hover:bg-danger-soft">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-center text-ink-muted text-sm py-8">No prayer requests yet.</p>
            )}
          </div>
        )}

        {/* Donations */}
        {tab === 'donations' && (
          <div className="bg-card border border-edge rounded-2xl overflow-hidden">
            <div className="divide-y divide-edge">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">{d.name || 'Anonymous'}</p>
                    <p className="text-ink-muted text-xs truncate">
                      {d.email || '—'} · {d.reference ? `ref: ${d.reference}` : 'no ref'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-ink font-bold text-sm">{fmtMoney(d.amount, d.currency)}</p>
                    <p className="text-acc-strong text-[10px] font-bold uppercase">{d.status}</p>
                  </div>
                </div>
              ))}
              {donations.length === 0 && (
                <p className="text-center text-ink-muted text-sm py-8">No donations recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Announcements / Broadcast */}
        {tab === 'announcements' && (
          <div className="space-y-4">
            {/* Compose */}
            <div className="bg-card border border-edge rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-warn-soft text-warn">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-bold text-ink">Broadcast Announcement</h2>
                  <p className="text-xs text-ink-muted">This shows on every user's home page</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Title (e.g. Prayer conference this Friday)"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-2"
              />
              <textarea
                placeholder="Message to the community…"
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                rows={3}
                className="w-full bg-page border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none mb-3"
              />
              {annMsg && <p className="text-xs font-semibold text-acc-strong mb-2">{annMsg}</p>}
              <button
                onClick={sendAnnouncement}
                disabled={annSending}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-500 disabled:opacity-50"
              >
                {annSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {annSending ? 'Sending…' : 'Broadcast to Everyone'}
              </button>
            </div>

            {/* Past announcements */}
            <div className="bg-card border border-edge rounded-2xl overflow-hidden">
              <p className="p-4 border-b border-edge text-xs font-bold uppercase tracking-wider text-ink-muted">Past announcements</p>
              <div className="divide-y divide-edge">
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold text-sm">{a.title}</p>
                      <p className="text-ink-soft text-xs mt-0.5">{a.body}</p>
                      <p className="text-ink-faint text-[10px] mt-1">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)} className="p-2 text-ink-faint hover:text-danger shrink-0" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-center text-ink-muted text-sm py-8">No announcements yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-edge rounded-2xl p-4">
      <div className="w-9 h-9 rounded-lg bg-acc-soft text-acc flex items-center justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-ink leading-none">{value}</p>
      <p className="text-ink-muted text-xs mt-1">{label}</p>
      {sub && <p className="text-acc-strong text-[10px] font-semibold mt-0.5">{sub}</p>}
    </div>
  );
}
