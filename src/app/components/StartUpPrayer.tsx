'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Droplets, Award, Music, Heart, Users, Sparkles, Home, Check, Clock, Pencil, Loader2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime, playCelebration } from '@/lib/clientUtils';
import { fetchIntercessoryPrayers } from '@/lib/intercessoryPrayersClient';
import type { IntercessoryPrayer } from '@/app/types';
import PrayerReader, { type ReaderItem } from './PrayerReader';
import WorshipPlayer from './WorshipPlayer';
import { useI18n } from '@/app/i18n';

function Wind({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

export default function StartUpPrayer() {
  const { t } = useI18n();
  const { user, prayers, intercessoryPrayers, categories } = useApp();
  const [step, setStep] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [specialOpenIndex, setSpecialOpenIndex] = useState<number | null>(null);
  const [intercessoryOpenIndex, setIntercessoryOpenIndex] = useState<number | null>(null);
  // Signed-in users' prayer points live in Supabase (written from the Prayer
  // Workshop) — null means "not fetched yet"; guests fall back to the local
  // intercessoryPrayers array below so they don't lose the feature.
  const [remoteIntercessory, setRemoteIntercessory] = useState<IntercessoryPrayer[] | null>(null);

  // Overall prayer duration in seconds (default 5 minutes).
  const [totalSeconds, setTotalSeconds] = useState(() => {
    if (typeof window === 'undefined') return 300;
    const stored = localStorage.getItem('pfm_prayer_total_seconds');
    const n = stored ? parseInt(stored) : 300;
    return Number.isFinite(n) && n >= 120 ? n : 300;
  });
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalMinutesInput, setTotalMinutesInput] = useState(() => {
    if (typeof window === 'undefined') return '5';
    const stored = localStorage.getItem('pfm_prayer_total_seconds');
    const n = stored ? parseInt(stored) : 300;
    return String(Math.round((Number.isFinite(n) && n >= 120 ? n : 300) / 60));
  });
  const [timer, setTimer] = useState(30);

  // Fixed first three sessions: Mercy (30s), Thanksgiving (30s), Invite Holy Spirit (30s).
  const FIXED = [30, 30, 30];

  const stepDurations = useMemo(() => {
    const fixedTotal = FIXED.reduce((a, b) => a + b, 0);
    const rest = Math.max(0, totalSeconds - fixedTotal);
    const per = Math.floor(rest / 4);
    return [...FIXED, per, per, per, rest - per * 3];
  }, [totalSeconds]);

  const steps = [
    { id: 1, title: t('ui.mercyPrayer'), subtitle: t('ui.cleansingConfession'), verse: '1 John 1:9', verseText: t('ui.ifWeConfessOurSins'), icon: <Droplets className="w-6 h-6" />, duration: stepDurations[0] },
    { id: 2, title: t('ui.thanksgiving'), subtitle: t('ui.appreciateGodSGoodness'), verse: 'Psalm 100:4', verseText: t('ui.enterIntoHisGatesWith'), icon: <Award className="w-6 h-6" />, duration: stepDurations[1] },
    { id: 3, title: t('ui.inviteHolySpirit'), subtitle: t('ui.holySpiritAssistance'), verse: 'John 14:26', verseText: t('ui.butTheComforterWhichIs'), icon: <Wind className="w-6 h-6" />, duration: stepDurations[2] },
    { id: 4, title: t('feat.worship'), subtitle: t('ui.singUntoTheLord'), verse: 'Psalm 95:1-2', verseText: t('ui.oComeLetUsSing'), icon: <Music className="w-6 h-6" />, duration: stepDurations[3] },
    { id: 5, title: t('ui.myPrayerList'), subtitle: t('ui.familyPrayers'), verse: '', verseText: '', icon: <Heart className="w-6 h-6" />, duration: stepDurations[4], isPrayerList: true },
    { id: 6, title: t('ui.specialPrayer'), subtitle: t('app.subtagline'), verse: 'Daniel 6:10', verseText: t('ui.nowWhenDanielKnewThat'), icon: <Sparkles className="w-6 h-6" />, duration: stepDurations[5], isSpecialPrayer: true },
    { id: 7, title: t('ui.intercessoryPrayer'), subtitle: t('ui.prayForOthers'), verse: '', verseText: '', icon: <Users className="w-6 h-6" />, duration: stepDurations[6], isIntercessory: true },
  ];

  useEffect(() => {
    let interval: number;
    if (isActive && timer > 0) {
      interval = window.setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && isActive) {
      playChime();
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const currentStep = steps.find((s) => s.id === step);

  useEffect(() => {
    // remoteIntercessory !== null means it's already been fetched this
    // mount — no need to re-fetch every time the step is revisited.
    if (!currentStep?.isIntercessory || !user || remoteIntercessory !== null) return;
    let cancelled = false;
    fetchIntercessoryPrayers().then((rows) => {
      if (!cancelled) setRemoteIntercessory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [currentStep?.isIntercessory, user, remoteIntercessory]);

  // Local state is the reliable, always-instant source — it's the exact
  // same array the Prayer Workshop's form just wrote to, so whatever you
  // add there shows up here immediately regardless of network/login state.
  // Supabase only adds entries written from a *different* device/session
  // that aren't already in the local list — it never hides what's local.
  const loadingIntercessory =
    !!user && !!currentStep?.isIntercessory && remoteIntercessory === null && intercessoryPrayers.length === 0;
  const displayedIntercessory = useMemo(() => {
    if (!remoteIntercessory) return intercessoryPrayers;
    const localIds = new Set(intercessoryPrayers.map((p) => p.id));
    const remoteOnly = remoteIntercessory.filter((p) => !localIds.has(p.id));
    return [...intercessoryPrayers, ...remoteOnly];
  }, [intercessoryPrayers, remoteIntercessory]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = currentStep ? ((currentStep.duration - timer) / currentStep.duration) * 100 : 0;

  const goToStep = (id: number) => {
    setStep(id);
    setTimer(steps[id - 1].duration);
    setIsActive(false);
  };

  const handleNext = () => {
    if (step < 7) {
      playChime();
      goToStep(step + 1);
    } else {
      setShowCelebration(true);
      playCelebration();
    }
  };

  // Swipe right-to-left on the step content = the same action as tapping
  // "Next" — on small screens the button sits below the fold, so this is
  // often the faster way to move to the next prayer. Only touchend decides
  // whether it was a swipe (no touchmove preventDefault), so the vertical
  // scroll on the special/intercessory lists inside this area is untouched.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const deltaX = t.clientX - start.x;
    const deltaY = t.clientY - start.y;
    if (deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      handleNext();
    }
  };

  const saveTotal = () => {
    const minutes = Number(totalMinutesInput);
    if (Number.isFinite(minutes) && minutes >= 2) {
      const secs = Math.round(minutes * 60);
      setTotalSeconds(secs);
      localStorage.setItem('pfm_prayer_total_seconds', String(secs));
      // Reset the current step's timer to its new duration.
      const current = steps.find((s) => s.id === step);
      if (current) setTimer(current.duration);
      setIsActive(false);
    }
    setEditingTotal(false);
  };

  const resetAll = () => {
    setShowCelebration(false);
    setStep(1);
    setTimer(steps[0].duration);
    setIsActive(false);
  };

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif-heading text-xl font-bold text-ink">{t('startUpPrayer.startUpPrayer')}</h1>
          <p className="text-xs text-ink-muted">{t('startUpPrayer.7StepGuidedPrayerPraying')}</p>
        </div>
        <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-card-3 hover:bg-card-3 rounded-full text-ink-muted text-xs font-semibold transition-colors">
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>

      {/* Total prayer duration (editable) */}
      <div className="mb-5 bg-card rounded-xl border border-edge p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-acc-strong flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-ink-muted font-semibold">{t('startUpPrayer.totalPrayerTime')}</p>
              <p className="text-sm font-bold text-ink">
                {formatTime(totalSeconds)}
                <span className="text-ink-faint font-normal text-[0.6875rem] ml-1">{t('startUpPrayer.30sMercy30sThanks30s')}</span>
              </p>
            </div>
          </div>

          {editingTotal ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input
                type="number"
                min={2}
                step={1}
                value={totalMinutesInput}
                onChange={(e) => setTotalMinutesInput(e.target.value)}
                className="w-16 bg-card border border-edge-strong rounded-lg px-2 py-1.5 text-sm font-bold text-ink text-center focus:outline-none focus:ring-2 focus:ring-acc-hover/40"
              />
              <span className="text-ink-muted text-xs">{t('startUpPrayer.min')}</span>
              <button
                onClick={saveTotal}
                className="p-1.5 bg-acc text-on-acc rounded-lg hover:bg-acc-hover"
                title={t('startUpPrayer.saveDuration')}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTotal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-acc-strong text-xs font-bold rounded-lg hover:bg-acc-soft transition-colors flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-5">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => goToStep(s.id)}
            className={cn('w-3 h-3 rounded-full transition-all', step === s.id ? 'bg-acc scale-125' : s.id < step ? 'bg-acc' : 'bg-card-3')}
          />
        ))}
      </div>

      {/* Timer Ring */}
      <div className="flex justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="58" fill="none" className="stroke-acc-soft-2" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="58" fill="none"
              stroke={step <= 4 ? 'var(--acc)' : step <= 6 ? 'var(--ink-muted)' : 'var(--ink)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={364} strokeDashoffset={364 - (364 * progress) / 100}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-ink">{formatTime(timer)}</span>
            <span className="text-xs text-ink-muted">{t('startUpPrayer.remaining')}</span>
          </div>
        </div>
      </div>

      {/* Step content — swipe right-to-left to advance, same as Next */}
      <div key={step} className="animate-[step-flip_0.35s_ease-out]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="text-center mb-5">
        <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-full mb-3', step <= 4 ? 'bg-acc-soft text-acc-strong' : step <= 6 ? 'bg-card-3 text-ink-muted' : 'bg-danger-soft text-danger')}>
          {currentStep?.icon}
        </div>
        <h3 className="text-xl font-bold text-ink mb-1">{currentStep?.title}</h3>
        <p className="text-ink-muted text-sm">{currentStep?.subtitle}</p>
        <p className="text-ink-faint text-[0.6875rem] mt-1">{t('startUpPrayer.swipeLeftForNext')}</p>
      </div>

      {currentStep?.verse && (
        <div className="rounded-xl p-4 mb-5 border bg-acc-soft border-acc-edge">
          <p className="text-acc-strong text-xs mb-2 font-semibold">{currentStep.verse}</p>
          <p className="text-ink-soft text-sm leading-relaxed italic">"{currentStep.verseText}"</p>
        </div>
      )}

      {/* Step 4: Praise & Worship music player */}
      {step === 4 && (
        <div className="mb-5">
          <WorshipPlayer compact />
        </div>
      )}

      {currentStep?.isPrayerList && (
        <FamilyPrayersList />
      )}

      {currentStep?.isSpecialPrayer && (
        <div className="mb-5 space-y-2 max-h-80 overflow-y-auto">
          {prayers.length === 0 ? (
            <div className="bg-card-2 rounded-xl p-3 border border-edge text-center">
              <Sparkles className="w-6 h-6 text-ink-ghost mx-auto mb-1" />
              <p className="text-ink-muted text-xs">{t('startUpPrayer.noSpecialPrayersYet')}</p>
              <p className="text-ink-faint text-[0.625rem] mt-0.5">{t('startUpPrayer.addThemInThePrayer')}</p>
            </div>
          ) : (
            prayers.map((prayer, idx) => (
              <button
                key={prayer.id}
                onClick={() => setSpecialOpenIndex(idx)}
                className={cn('w-full text-left rounded-xl p-3 border-l-4 transition-all hover:brightness-95 active:scale-[0.99]', prayer.isAnswered ? 'bg-acc-soft border-l-acc border border-acc-edge' : prayer.urgency === 'high' ? 'bg-card border-l-danger border border-edge' : 'bg-card border-l-edge-strong border border-edge')}
              >
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider mb-1 text-ink-muted">🙏 {prayer.category} · Special Prayer</p>
                <h4 className="text-ink font-bold text-sm">{prayer.title}</h4>
                {prayer.notes && <p className="text-ink-muted text-xs mt-1 italic line-clamp-2">{prayer.notes}</p>}
                {prayer.scripture && <p className="text-acc-strong text-xs mt-1 italic">📖 {prayer.scripture}</p>}
              </button>
            ))
          )}
        </div>
      )}

      {specialOpenIndex !== null && (
        <PrayerReader
          items={prayers.map((p) => ({ id: p.id, title: p.title, category: p.category, subCategory: t('ui.specialPrayer'), details: p.notes, scripture: p.scripture }))}
          initialIndex={specialOpenIndex}
          onClose={() => setSpecialOpenIndex(null)}
        />
      )}

      {currentStep?.isIntercessory && (
        <div className="mb-5 space-y-3">
          {!user && (
            <p className="text-ink-faint text-[0.625rem] text-center">{t('startUpPrayer.signInToHaveYour')}</p>
          )}

          <div className="max-h-48 overflow-y-auto space-y-2">
            {loadingIntercessory ? (
              <div className="bg-card-2 rounded-xl p-3 border border-edge text-center flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-ink-faint animate-spin" />
                <p className="text-ink-muted text-xs">{t('startUpPrayer.loadingYourPrayers')}</p>
              </div>
            ) : displayedIntercessory.length === 0 ? (
              <div className="bg-card-2 rounded-xl p-3 border border-edge text-center"><p className="text-ink-muted text-xs">{t('startUpPrayer.noPrayersAddedYet')}</p></div>
            ) : (
              displayedIntercessory.map((prayer, idx) => (
                <button
                  key={prayer.id}
                  onClick={() => setIntercessoryOpenIndex(idx)}
                  className="w-full text-left bg-danger-soft/50 border border-danger-edge rounded-xl p-3 border-l-4 border-l-danger transition-all hover:brightness-95 active:scale-[0.99]"
                >
                  <p className="text-[0.625rem] font-semibold uppercase tracking-wider mb-1 text-danger">🙏 {prayer.category} · Intercessory Prayer</p>
                  <h4 className="text-ink font-bold text-sm">{prayer.title}</h4>
                  {prayer.details && <p className="text-ink-muted text-xs mt-1 italic line-clamp-2">{prayer.details}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {intercessoryOpenIndex !== null && (
        <PrayerReader
          items={displayedIntercessory.map((p) => ({ id: p.id, title: p.title, category: p.category, subCategory: t('ui.intercessoryPrayer'), details: p.details }))}
          initialIndex={intercessoryOpenIndex}
          onClose={() => setIntercessoryOpenIndex(null)}
        />
      )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button onClick={() => setIsActive(!isActive)} className={cn('flex-1 py-3 rounded-xl font-bold transition-all', isActive ? 'bg-card-3 text-ink-soft' : 'bg-acc text-on-acc hover:bg-acc-hover')}>
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={handleNext} className="flex-1 py-3 rounded-xl font-bold bg-acc text-on-acc hover:bg-acc-hover transition-all">
          {step < 7 ? 'Next' : 'Finish'}
        </button>
      </div>

      {/* Celebration popup */}
      {showCelebration && (
        <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-sm border border-edge shadow-2xl overflow-hidden">
            <div className="bg-navy px-6 py-8 text-center">
              <div className="text-5xl mb-3">🎉🙏🎊</div>
              <h2 className="font-serif-heading text-2xl font-bold text-cream mb-1">{t('startUpPrayer.congratulations')}</h2>
              <p className="text-cream/90 text-sm">{t('startUpPrayer.yourPrayerSessionIsComplete')}</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-ink-soft text-sm leading-relaxed">{t('startUpPrayer.wellDoneYouHaveSpent')}</p>
              <div className="bg-acc-soft border border-acc-edge rounded-xl p-4">
                <p className="text-acc-strong text-xs font-semibold uppercase tracking-wider mb-1">{t('startUpPrayer.james516')}</p>
                <p className="text-ink-soft text-sm italic">{t('startUpPrayer.theEffectualFerventPrayerOf')}</p>
              </div>
              <Link href="/" onClick={resetAll} className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold text-sm hover:bg-acc-hover transition-all flex items-center justify-center">{t('dailyVerseModal.amen')}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 5: only the FAMILY prayer list (from the Prayer Workshop → Session 1).
function FamilyPrayersList() {
  const { t } = useI18n();
  const { categories } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const familyPrayers = categories.flatMap((cat) =>
    cat.subCategories.flatMap((sub) =>
      sub.entries.map((entry) => ({
        id: `${cat.id}-${sub.id}-${entry.id}`,
        category: cat.name,
        subCategory: sub.name,
        title: entry.name || 'Unnamed',
        details: entry.details,
        isAnswered: entry.isAnswered,
      }))
    )
  );

  if (familyPrayers.length === 0) {
    return (
      <div className="mb-5 bg-card-2 rounded-xl p-4 border border-edge text-center">
        <Heart className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
        <p className="text-ink-muted text-sm">{t('startUpPrayer.noFamilyPrayersYet')}</p>
        <p className="text-ink-faint text-xs mt-1">{t('startUpPrayer.addThemInThePrayer2')}</p>
      </div>
    );
  }

  const readerItems: ReaderItem[] = familyPrayers.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    subCategory: p.subCategory,
    details: p.details,
  }));

  return (
    <>
      <div className="mb-5 space-y-2 max-h-80 overflow-y-auto">
        {familyPrayers.map((prayer, idx) => (
          <button
            key={prayer.id}
            onClick={() => setOpenIndex(idx)}
            className={cn(
              'w-full text-left rounded-xl p-3 border-l-4 transition-all hover:brightness-95 active:scale-[0.99]',
              prayer.isAnswered
                ? 'bg-acc-soft border-l-acc border border-acc-edge'
                : 'bg-card border-l-acc border border-edge'
            )}
          >
            <p className="text-[0.625rem] font-semibold uppercase tracking-wider mb-1 text-acc-strong">
              👨‍👩‍👧‍👦 {prayer.category} · {prayer.subCategory}
            </p>
            <h4 className="text-ink font-bold text-sm">{prayer.title}</h4>
            {prayer.details && <p className="text-ink-muted text-xs mt-1 italic line-clamp-2">{prayer.details}</p>}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <PrayerReader items={readerItems} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
