'use client';

import Link from 'next/link';
import { Flame, Sparkles, Users, Globe, Crown, Clock, ChevronRight } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DonationCard from './components/DonationCard';
import TestimonyCard from './components/TestimonyCard';
import AnnouncementBanner from './components/AnnouncementBanner';
import DailyExaltation from './components/DailyExaltation';
import HomeFold from './components/HomeFold';
import HomeFeatureRow from './components/HomeFeatureRow';
import { useT } from './i18n';
import HomeVideos from './components/HomeVideos';
import HomeAlertCard from './components/HomeAlertCard';
import { useI18n } from '@/app/i18n';

export default function HomePage() {
  const t = useT();
  return (
    <>
      <Navbar />

      <main className="bg-page min-h-screen pb-[calc(8rem+var(--ad-offset,0px))] md:pb-16">
        {/* ── First screen: heading, the two prayer cards, the schedule bar, today's verse, four tiles ── */}
        <div className="max-w-2xl md:max-w-5xl mx-auto px-4 pt-4 md:pt-8">
          {/* ── Urgent Global Prayer Alert (nothing here when there is none) ── */}
          <HomeAlertCard />
          {/* ── Header ───────────────────────────── */}
          <section className="text-center">
            <span className="inline-flex items-center gap-1.5 bg-warn-soft text-warn-strong text-xs font-bold px-3 py-1 rounded-full border border-warn-edge">
              <Flame className="w-3.5 h-3.5" /> {t('home.badge')}
            </span>
            <h1 className="font-serif-heading text-3xl md:text-5xl font-bold text-ink mt-2">
              {t('app.name')}
            </h1>
            <p className="text-base md:text-xl text-acc-strong font-serif-heading font-semibold mt-1">
              {t('home.tagline')}
            </p>
            <p className="text-danger font-semibold italic text-xs md:text-sm mt-1">
              {t('home.daniel')}
            </p>
          </section>

          {/* ── Every feature, newest first: swipe, or use the arrows at the edges ── */}
          <div className="md:max-w-2xl md:mx-auto">
            <HomeFeatureRow />
          </div>

          <div className="mt-5 md:max-w-2xl md:mx-auto space-y-4">
            {/* ── Two prayer cards, side by side ── */}
            <section className="grid grid-cols-2 gap-3 md:gap-4">
              <Link
                href="/workshop"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-edge p-3.5 text-center active:scale-[0.98] transition-transform"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-acc-soft text-acc-strong">
                  <Flame className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-[0.9375rem] leading-tight text-ink">{t('home.writePoints')}</h3>
                <p className="text-xs font-semibold text-ink-muted">{t('home.workshop')}</p>
              </Link>

              <Link
                href="/startup"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-edge p-3.5 text-center active:scale-[0.98] transition-transform"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-acc-soft text-acc-strong">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-[0.9375rem] leading-tight text-ink">{t('home.startUpPrayer')}</h3>
                <p className="text-xs font-semibold text-ink-muted">{t('home.sevenStep')}</p>
              </Link>
            </section>

            {/* ── Daily schedule: one slim bar that opens the schedule page ── */}
            <Link
              href="/schedule"
              className="flex h-12 items-center gap-3 rounded-2xl bg-card border border-edge px-3 text-sm font-bold text-ink active:scale-[0.99] transition-transform"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acc-soft text-acc-strong">
                <Clock className="w-5 h-5" />
              </span>
              <span className="flex-1 text-heading">{t('home.schedule')}</span>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </Link>

            {/* ── Today's verse + the four tiles ── */}
            <HomeFold />
          </div>
        </div>

        <AnnouncementBanner />
        <div className="max-w-2xl md:max-w-5xl mx-auto px-4 pt-4 md:pt-8">
          {/* ── Daily Morning Exaltation (YouTube) ── */}
          <DailyExaltation />

          {/* ── Podcast, short teachings and "How to use Prayer Fire" (nothing until the admin adds videos) ── */}
          <HomeVideos />

          {/* ── Prayer Groups (horizontal) ────────── */}
          <Link
            href="/groups"
            className="block bg-card rounded-2xl mt-4 p-4 md:p-5 border border-edge shadow-sm hover:border-acc-edge transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-acc-soft text-acc-strong flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm md:text-base">{t('home.groups')}</h3>
                <p className="text-ink-muted text-[0.6875rem] md:text-sm mt-0.5">
                  {t('home.groupsHint')}
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
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-acc-soft text-acc-strong flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ink font-bold text-sm md:text-base">{t('home.network')}</h3>
                <p className="text-ink-muted text-[0.6875rem] md:text-sm mt-0.5">{t('home.networkHint')}</p>
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
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg bg-acc-soft text-acc-strong flex items-center justify-center flex-shrink-0">
              <span className="text-xl md:text-2xl">📖</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-ink font-bold text-sm md:text-base">{t('nav.manualCard')}</h3>
              <p className="text-ink-muted text-[0.6875rem] md:text-sm mt-0.5">{t('app.discoverHowThisAppTransforms')}</p>
            </div>
            <span className="text-ink-faint text-lg md:text-xl">›</span>
          </Link>

          {/* ── Premium banner ───────────────────── */}
          <Link
            href="/partner"
            className="flex items-center gap-3 mt-4 bg-gradient-to-r from-[var(--acc-soft)] to-[var(--card)] border border-acc-edge rounded-2xl p-4 md:p-6 shadow-sm hover:border-acc transition-all"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg bg-acc-soft-2 text-acc-strong flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-bold text-sm md:text-base">{t('pricingPage.becomeAPrayerFirePartner')}</p>
              <p className="text-ink-muted text-[0.6875rem] md:text-sm">{t('app.unlockTheFullIntercessoryCommunity')}</p>
            </div>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-acc-strong" />
          </Link>

          <div className="mt-4">
            <DonationCard />
          </div>

          <div className="mt-4">
            <TestimonyCard />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
