'use client';

import Link from 'next/link';
import {
  Flame, Sparkles, Users, Music, Globe, BookOpen, Crown, Moon, Sun, Sunrise, ChevronRight,
} from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
// DonationCard removed — public donations paused until Paystack approves
import AnnouncementBanner from './components/AnnouncementBanner';
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

export default function HomePage() {
  const { appointments, groups } = useApp();
  const sorted = [...appointments].sort((a, b) => (RANK[a.id] ?? 99) - (RANK[b.id] ?? 99)).slice(0, 3);

  return (
    <>
      <Navbar />

      <main className="bg-page min-h-screen pb-32 md:pb-16">
        <AnnouncementBanner />
        <div className="max-w-2xl md:max-w-5xl mx-auto px-4 pt-6 md:pt-10">
          {/* ── Hero ─────────────────────────────── */}
          <section className="text-center">
            <span className="inline-flex items-center gap-1.5 bg-warn-soft text-warn-strong text-xs font-bold px-3 py-1 rounded-full border border-warn-edge">
              <Flame className="w-3.5 h-3.5" /> Pray 3x a Day
            </span>
            <h1 className="font-serif-heading text-3xl md:text-5xl font-bold text-ink mt-3">
              Prayer Fire Movement
            </h1>
            <p className="text-base md:text-xl bg-gradient-to-r from-[var(--acc-strong)] via-[var(--acc)] to-[var(--acc-strong)] bg-clip-text text-transparent font-serif-heading font-semibold mt-1">
              Write it. Speak it. Pray it. Trust God.
            </p>
            <p className="text-danger font-semibold italic text-xs md:text-sm mt-1">
              Praying like Daniel — a cure for prayerlessness
            </p>
          </section>

          {/* ── Primary actions ──────────────────── */}
          <section className="grid grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8 md:max-w-2xl md:mx-auto">
            <Link
              href="/workshop"
              className="bg-emerald-600 text-white rounded-2xl p-4 md:p-7 text-center shadow-sm hover:bg-emerald-500 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-card/15 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="font-bold text-sm md:text-lg leading-tight">Write Prayer Point</h3>
              <p className="text-emerald-50 text-[11px] md:text-xs font-semibold mt-1">Prayer Workshop</p>
            </Link>

            <Link
              href="/startup"
              className="bg-card text-ink rounded-2xl p-4 md:p-7 text-center border border-acc-edge shadow-sm hover:border-acc hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-acc-soft text-acc flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="font-bold text-sm md:text-lg leading-tight">Start-Up Prayer</h3>
              <p className="text-acc text-[11px] md:text-xs font-semibold mt-1">7-step guided</p>
            </Link>
          </section>

          {/* ── Daily Schedule (horizontal) ───────── */}
          <Link
            href="/schedule"
            className="block bg-card rounded-2xl mt-4 md:mt-6 p-4 md:p-6 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif-heading font-bold text-ink md:text-lg">Daily Schedule</h3>
              <ChevronRight className="w-4 h-4 text-ink-ghost" />
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {sorted.map((a) => (
                <div key={a.id} className="bg-card-2 rounded-xl py-2.5 md:py-4 px-1 text-center border border-edge">
                  <span className="flex justify-center text-acc mb-1">{watchIcon(a.id)}</span>
                  <p className="text-ink font-bold text-sm md:text-base leading-none">{formatTime(a.time)}</p>
                  <p className="text-ink-muted text-[9px] md:text-xs mt-1 truncate">{a.label}</p>
                </div>
              ))}
            </div>
          </Link>

          {/* ── Prayer Groups (horizontal) ────────── */}
          <Link
            href="/groups"
            className="block bg-card rounded-2xl mt-4 p-4 md:p-5 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-acc-soft text-acc flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm md:text-base">Prayer Groups</h3>
                <p className="text-ink-muted text-[11px] md:text-sm mt-0.5">
                  Pray together in teams{groups.length > 0 ? ` · ${groups.length} teams` : ''}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-ghost shrink-0" />
            </div>
          </Link>

          {/* ── Prayer Network (horizontal) ───────── */}
          <Link
            href="/network"
            className="block bg-card rounded-2xl mt-4 p-4 md:p-5 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-acc-soft text-acc flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm md:text-base">Prayer Network</h3>
                <p className="text-ink-muted text-[11px] md:text-sm mt-0.5">Stand in the gap for others worldwide</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-ghost shrink-0" />
            </div>
          </Link>

          {/* ── KJV Bible (horizontal) ────────────── */}
          <Link
            href="/bible"
            className="block bg-card rounded-2xl mt-4 p-4 md:p-5 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-acc-soft text-acc flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm md:text-base">KJV Bible</h3>
                <p className="text-ink-muted text-[11px] md:text-sm mt-0.5">Read the full Bible by book &amp; chapter</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-ghost shrink-0" />
            </div>
          </Link>

          {/* ── Donation removed — paused until Paystack approves ── */}

          {/* ── User Manual ───────────────────────── */}
          <Link
            href="/manual"
            className="flex items-center gap-3 mt-4 bg-card border border-edge rounded-2xl p-4 md:p-6 shadow-sm hover:border-acc transition-all"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg bg-acc-soft text-acc flex items-center justify-center flex-shrink-0">
              <span className="text-xl md:text-2xl">📖</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-ink font-bold text-sm md:text-base">User Manual &amp; Benefits</h3>
              <p className="text-ink-muted text-[11px] md:text-sm mt-0.5">Discover how this app transforms your prayer life — and the spiritual power of each feature</p>
            </div>
            <span className="text-ink-faint text-lg md:text-xl">›</span>
          </Link>

          {/* ── Premium banner ───────────────────── */}
          <Link
            href="/partner"
            className="flex items-center gap-3 mt-4 bg-gradient-to-r from-[var(--warn-soft)] to-[var(--card)] border border-warn-edge rounded-2xl p-4 md:p-6 shadow-sm hover:border-warn transition-all"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg bg-warn-soft-2 text-warn flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-bold text-sm md:text-base">Become a Prayer Fire Partner</p>
              <p className="text-ink-muted text-[11px] md:text-sm">Unlock the full intercessory community</p>
            </div>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-warn" />
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
