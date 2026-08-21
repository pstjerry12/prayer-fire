'use client';

import Link from 'next/link';
import {
  Flame, Sparkles, BookOpen, ScrollText, Utensils, Users, Music, Globe,
  Crown, Moon, Sun, Sunrise, ChevronRight,
} from 'lucide-react';
import Navbar from './components/Navbar';
import DonationCard from './components/DonationCard';
import { useApp } from './context';

function formatTime(time: string): string {
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function watchIcon(id: string) {
  if (id === 'morning') return <Sunrise className="w-4 h-4" />;
  if (id === 'noon') return <Sun className="w-4 h-4" />;
  if (id === 'midnight') return <Moon className="w-4 h-4" />;
  return <Flame className="w-4 h-4" />;
}

const RANK: Record<string, number> = { midnight: 0, noon: 1, morning: 2 };

const CONTENT_CARDS = [
  { href: '/groups', title: 'Prayer Groups', desc: 'WhatsApp-style prayer teams', icon: Users },
  { href: '/worship', title: 'Praise & Worship', desc: 'Upload & play songs', icon: Music },
  { href: '/scripture', title: 'Scripture & Wisdom', desc: 'Vault · Learn to Pray', icon: BookOpen },
  { href: '/bible', title: 'KJV Bible Library', desc: 'Search · Favorite · Share', icon: ScrollText },
  { href: '/fasting', title: 'Fasting Tracker', desc: '3 · 7 · 21 · 40 days', icon: Utensils },
  { href: '/network', title: 'Partner Network', desc: 'Pray for others worldwide', icon: Globe },
];

export default function HomePage() {
  const { appointments } = useApp();
  const sorted = [...appointments].sort((a, b) => (RANK[a.id] ?? 99) - (RANK[b.id] ?? 99)).slice(0, 3);

  return (
    <>
      <Navbar />

      <main className="bg-page min-h-screen pb-28">
        <div className="max-w-md mx-auto px-4 pt-6">
          {/* ── Hero ─────────────────────────────── */}
          <section className="text-center">
            <span className="inline-flex items-center gap-1.5 bg-warn-soft text-warn-strong text-xs font-bold px-3 py-1 rounded-full border border-warn-edge">
              <Flame className="w-3.5 h-3.5" /> Pray 3x a Day
            </span>
            <h1 className="font-serif-heading text-3xl font-bold text-ink mt-3">Prayer Fire Movement</h1>
            <p className="text-base bg-gradient-to-r from-[var(--acc-strong)] via-[var(--acc)] to-[var(--acc-strong)] bg-clip-text text-transparent font-serif-heading font-semibold mt-1">
              Write it. Speak it. Pray it. Trust God.
            </p>
            <p className="text-danger font-semibold italic text-xs mt-1">Praying like Daniel — a cure for prayerlessness</p>
          </section>

          {/* ── Primary actions ──────────────────── */}
          <section className="grid grid-cols-2 gap-3 mt-6">
            <Link
              href="/workshop"
              className="bg-emerald-600 text-white rounded-2xl p-4 text-center shadow-sm hover:bg-emerald-500 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-card/15 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm leading-tight">Write Prayer Point</h3>
              <p className="text-emerald-50 text-[11px] font-semibold mt-1">Prayer Workshop</p>
            </Link>

            <Link
              href="/startup"
              className="bg-card text-ink rounded-2xl p-4 text-center border border-acc-edge shadow-sm hover:border-acc hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-acc-soft text-acc flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm leading-tight">Start-Up Prayer</h3>
              <p className="text-acc text-[11px] font-semibold mt-1">7-step guided</p>
            </Link>
          </section>

          {/* ── Daily schedule ───────────────────── */}
          <Link
            href="/schedule"
            className="block bg-card rounded-2xl mt-4 p-4 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif-heading font-bold text-ink">Daily Schedule</h3>
              <ChevronRight className="w-4 h-4 text-ink-ghost" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sorted.map((a) => (
                <div key={a.id} className="bg-card-2 rounded-xl py-2.5 px-1 text-center border border-edge">
                  <span className="flex justify-center text-acc mb-1">{watchIcon(a.id)}</span>
                  <p className="text-ink font-bold text-sm leading-none">{formatTime(a.time)}</p>
                  <p className="text-ink-muted text-[9px] mt-1 truncate">{a.label}</p>
                </div>
              ))}
            </div>
          </Link>

          {/* ── Content grid ─────────────────────── */}
          <section className="grid grid-cols-2 gap-3 mt-4">
            {CONTENT_CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="bg-card rounded-2xl p-4 border border-edge shadow-sm hover:border-acc-edge hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-acc-soft text-acc flex items-center justify-center mb-2.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-ink font-bold text-sm leading-tight">{c.title}</h3>
                  <p className="text-ink-muted text-[11px] mt-0.5">{c.desc}</p>
                </Link>
              );
            })}
          </section>

          {/* ── Donation ────────────────────────── */}
          <div className="mt-4">
            <DonationCard />
          </div>

          {/* ── Premium banner ───────────────────── */}
          <Link
            href="/partner"
            className="flex items-center gap-3 mt-4 bg-gradient-to-r from-[var(--warn-soft)] to-[var(--card)] border border-warn-edge rounded-2xl p-4 shadow-sm hover:border-warn transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-warn-soft-2 text-warn flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-bold text-sm">Become a Prayer Fire Partner</p>
              <p className="text-ink-muted text-[11px]">Unlock the full intercessory community</p>
            </div>
            <ChevronRight className="w-4 h-4 text-warn" />
          </Link>
        </div>
      </main>
    </>
  );
}
