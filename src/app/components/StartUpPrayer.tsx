'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Droplets, Award, Music, Heart, Users, Sparkles, Home, Plus, Check, Clock, Pencil,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime, playCelebration } from '@/lib/clientUtils';
import PrayerReader, { type ReaderItem } from './PrayerReader';
import WorshipPlayer from './WorshipPlayer';

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
  const { prayers, intercessoryPrayers, setIntercessoryPrayers, categories } = useApp();
  const [step, setStep] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCategory, setNewCategory] = useState('Individual by Name & Challenge');
  const [specialOpenIndex, setSpecialOpenIndex] = useState<number | null>(null);
  const [intercessoryOpenIndex, setIntercessoryOpenIndex] = useState<number | null>(null);

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
    { id: 1, title: 'Mercy Prayer', subtitle: 'Cleansing & Confession', verse: '1 John 1:9', verseText: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', icon: <Droplets className="w-6 h-6" />, duration: stepDurations[0] },
    { id: 2, title: 'Thanksgiving', subtitle: 'Appreciate God\'s Goodness', verse: 'Psalm 100:4', verseText: 'Enter into his gates with thanksgiving, and into his courts with praise.', icon: <Award className="w-6 h-6" />, duration: stepDurations[1] },
    { id: 3, title: 'Invite Holy Spirit', subtitle: 'Holy Spirit Assistance', verse: 'John 14:26', verseText: 'But the Comforter, which is the Holy Ghost, whom the Father will send in my name, he shall teach you all things.', icon: <Wind className="w-6 h-6" />, duration: stepDurations[2] },
    { id: 4, title: 'Praise & Worship', subtitle: 'Sing Unto the Lord', verse: 'Psalm 95:1-2', verseText: 'O come, let us sing unto the Lord: let us make a joyful noise to the rock of our salvation.', icon: <Music className="w-6 h-6" />, duration: stepDurations[3] },
    { id: 5, title: 'My Prayer List', subtitle: 'Family Prayers', verse: '', verseText: '', icon: <Heart className="w-6 h-6" />, duration: stepDurations[4], isPrayerList: true },
    { id: 6, title: 'Special Prayer', subtitle: 'Praying like Daniel', verse: 'Daniel 6:10', verseText: 'Now when Daniel knew that the writing was signed, he went into his house; and his windows being open in his chamber toward Jerusalem, he kneeled upon his knees three times a day, and prayed, and gave thanks before his God, as he did aforetime.', icon: <Sparkles className="w-6 h-6" />, duration: stepDurations[5], isSpecialPrayer: true },
    { id: 7, title: 'Intercessory Prayer', subtitle: 'Pray for Others', verse: '', verseText: '', icon: <Users className="w-6 h-6" />, duration: stepDurations[6], isIntercessory: true },
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
          <h1 className="font-serif-heading text-xl font-bold text-ink">Start-Up Prayer</h1>
          <p className="text-xs text-ink-muted">7-step guided prayer · Praying like Daniel</p>
        </div>
        <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-card-3 hover:bg-card-3 rounded-full text-ink-muted text-xs font-semibold transition-colors">
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>

      {/* Total prayer duration (editable) */}
      <div className="mb-5 bg-card rounded-xl border border-edge p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-acc flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-ink-muted font-semibold">Total Prayer Time</p>
              <p className="text-sm font-bold text-ink">
                {formatTime(totalSeconds)}
                <span className="text-ink-faint font-normal text-[11px] ml-1">
                  · 30s Mercy · 30s Thanks · 30s Holy Spirit · rest shared
                </span>
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
                className="w-16 bg-card border border-edge-strong rounded-lg px-2 py-1.5 text-sm font-bold text-ink text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <span className="text-ink-muted text-xs">min</span>
              <button
                onClick={saveTotal}
                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                title="Save duration"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTotal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-acc text-xs font-bold rounded-lg hover:bg-acc-soft transition-colors flex-shrink-0"
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
            className={cn('w-3 h-3 rounded-full transition-all', step === s.id ? 'bg-emerald-600 scale-125' : s.id < step ? 'bg-emerald-400' : 'bg-card-3')}
          />
        ))}
      </div>

      {/* Timer Ring */}
      <div className="flex justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="58" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="58" fill="none"
              stroke={step <= 4 ? '#059669' : step <= 6 ? '#475569' : '#dc2626'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={364} strokeDashoffset={364 - (364 * progress) / 100}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-ink">{formatTime(timer)}</span>
            <span className="text-xs text-ink-muted">remaining</span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="text-center mb-5">
        <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-full mb-3', step <= 4 ? 'bg-acc-soft text-acc' : step <= 6 ? 'bg-card-3 text-ink-muted' : 'bg-danger-soft text-danger')}>
          {currentStep?.icon}
        </div>
        <h3 className="text-xl font-bold text-ink mb-1">{currentStep?.title}</h3>
        <p className="text-ink-muted text-sm">{currentStep?.subtitle}</p>
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
              <p className="text-ink-muted text-xs">No special prayers yet.</p>
              <p className="text-ink-faint text-[10px] mt-0.5">Add them in the Prayer Workshop → Special Prayer.</p>
            </div>
          ) : (
            prayers.map((prayer, idx) => (
              <button
                key={prayer.id}
                onClick={() => setSpecialOpenIndex(idx)}
                className={cn('w-full text-left rounded-xl p-3 border-l-4 transition-all hover:brightness-95 active:scale-[0.99]', prayer.isAnswered ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge' : prayer.urgency === 'high' ? 'bg-card border-l-red-500 border border-edge' : 'bg-card border-l-edge-strong border border-edge')}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-ink-muted">🙏 {prayer.category} · Special Prayer</p>
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
          items={prayers.map((p) => ({ id: p.id, title: p.title, category: p.category, subCategory: 'Special Prayer', details: p.notes, scripture: p.scripture }))}
          initialIndex={specialOpenIndex}
          onClose={() => setSpecialOpenIndex(null)}
        />
      )}

      {currentStep?.isIntercessory && (
        <div className="mb-5 space-y-3">
          <div className="bg-danger-soft border border-danger-edge rounded-xl p-3 space-y-2">
            <p className="text-danger-strong text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Intercessory Prayer</p>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-card rounded-lg px-2 py-1.5 text-xs text-ink border border-edge-strong">
              {['Individual by Name & Challenge', 'Family Member — By Name', 'Church Family / Fellow Believer', 'Business / Career', 'Government Officials', 'Missionaries / Evangelists', 'Youth & Children', 'The Sick & Suffering', 'The Lost & Searching', 'Persecuted Church'].map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="text" placeholder="Name or title (e.g. Sister Mary)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-card rounded-lg px-2 py-1.5 text-xs text-ink placeholder-ink-faint border border-edge-strong" />
            <textarea placeholder="Prayer details (e.g. healing, salvation...)" value={newDetails} onChange={(e) => setNewDetails(e.target.value)} rows={2} className="w-full bg-card rounded-lg px-2 py-1.5 text-xs text-ink placeholder-ink-faint border border-edge-strong resize-none" />
            <button
              onClick={() => {
                if (!newName.trim()) return;
                setIntercessoryPrayers([...intercessoryPrayers, { id: Date.now().toString(), category: newCategory, title: newName, details: newDetails, isAnswered: false, createdAt: new Date().toISOString() }]);
                setNewName('');
                setNewDetails('');
                playChime();
              }}
              disabled={!newName.trim()}
              className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Heart className="w-3 h-3" /> Add Prayer
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {intercessoryPrayers.length === 0 ? (
              <div className="bg-card-2 rounded-xl p-3 border border-edge text-center"><p className="text-ink-muted text-xs">No prayers added yet.</p></div>
            ) : (
              intercessoryPrayers.map((prayer, idx) => (
                <button
                  key={prayer.id}
                  onClick={() => setIntercessoryOpenIndex(idx)}
                  className="w-full text-left bg-danger-soft/50 border border-danger-edge rounded-xl p-3 border-l-4 border-l-red-500 transition-all hover:brightness-95 active:scale-[0.99]"
                >
                  <h4 className="text-ink font-bold text-sm">[{prayer.category}] {prayer.title}</h4>
                  {prayer.details && <p className="text-ink-muted text-xs mt-1 italic line-clamp-2">{prayer.details}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {intercessoryOpenIndex !== null && (
        <PrayerReader
          items={intercessoryPrayers.map((p) => ({ id: p.id, title: p.title, category: p.category, subCategory: 'Intercessory Prayer', details: p.details }))}
          initialIndex={intercessoryOpenIndex}
          onClose={() => setIntercessoryOpenIndex(null)}
        />
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button onClick={() => setIsActive(!isActive)} className={cn('flex-1 py-3 rounded-xl font-bold transition-all', isActive ? 'bg-card-3 text-ink-soft' : 'bg-emerald-600 text-white hover:bg-emerald-500')}>
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={handleNext} className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all">
          {step < 7 ? 'Next' : 'Finish'}
        </button>
      </div>

      {/* Celebration popup */}
      {showCelebration && (
        <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-sm border border-edge shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-6 py-8 text-center">
              <div className="text-5xl mb-3">🎉🙏🎊</div>
              <h2 className="font-serif-heading text-2xl font-bold text-white mb-1">Congratulations!</h2>
              <p className="text-emerald-50 text-sm">Your prayer session is complete</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-ink-soft text-sm leading-relaxed">
                Well done! You have spent time in the presence of God. He sees you, He hears you, and He will answer you. Keep the fire burning! 🔥
              </p>
              <div className="bg-acc-soft border border-acc-edge rounded-xl p-4">
                <p className="text-acc-strong text-xs font-semibold uppercase tracking-wider mb-1">📖 James 5:16</p>
                <p className="text-ink-soft text-sm italic">"The effectual fervent prayer of a righteous man availeth much."</p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetAll} className="flex-1 py-3 bg-card border border-edge-strong text-ink-soft rounded-xl font-bold text-sm hover:bg-card-2 transition-all">Pray Again</button>
                <Link href="/" onClick={resetAll} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all flex items-center justify-center">Amen 🙏</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 5: only the FAMILY prayer list (from the Prayer Workshop → Session 1).
function FamilyPrayersList() {
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
        <p className="text-ink-muted text-sm">No family prayers yet.</p>
        <p className="text-ink-faint text-xs mt-1">Add them in the Prayer Workshop → My Family Prayers.</p>
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
                ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge'
                : 'bg-card border-l-emerald-500 border border-edge'
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-acc-strong">
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
