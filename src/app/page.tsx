'use client';

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { PrayerPoint, IntercessoryPrayer, PartnerRequest, FastingPlan, IntercessoryCategory, PrayerEntry } from './types';
import { KJV_BIBLE_CATEGORIES, KJV_BIBLE_VERSES, SCRIPTURE_CARDS, DEFAULT_INTERCESSORY_CATEGORIES } from './data/bibleVerses';
import { cn } from './utils/cn';
import { Sparkles, Menu, X, Heart, BookOpen, Users, Flame, Shield, ChevronDown, ChevronUp, Search, Copy, Check, Share2, Volume2, Lock, Plus, Trash2, MicOff, Mic, Globe, MapPin, Cross, Music, ScrollText, Home, Coffee, Utensils, CloudSun, Droplets, Award, Globe2, ChevronRight, StickyNote, Save, Lightbulb, BookHeart, Crown, Eye, Bell, LogIn, LogOut, UserCircle } from 'lucide-react';
import { WISDOM_CHAPTERS, COLOR_CLASSES } from './data/wisdomData';
import { Currency, getDefaultCurrency } from './data/pricingPlans';
import CustomizablePrayerSchedule, { PrayerAppointment } from './components/CustomizablePrayerSchedule';
import PricingPage from './components/PricingPage';
import AccountSettings from './components/AccountSettings';
import DailyVerseModal from './components/DailyVerseModal';
import DailyWisdomModal from './components/DailyWisdomModal';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import { getStoredUser, fetchMe, apiLogout, apiDeleteAccount, type AuthUser } from '@/lib/authClient';

// Utility functions
const playChime = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
};

const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};

const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Speech-to-text helper
interface SpeechRecognitionType extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition() as SpeechRecognitionType;
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = () => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    setError(null);
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      onResult(transcript);
    };
    recognition.onerror = (event: any) => {
      setError(event.error || 'Speech recognition error');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const stopListening = () => {
    const recognition = getSpeechRecognition();
    if (recognition) recognition.abort();
    setIsListening(false);
  };

  return { isListening, error, startListening, stopListening };
}

// Icons for categories
const CATEGORY_ICONS: Record<string, ReactElement> = {
  'Family': <Users className="w-4 h-4" />,
  'Personal Needs': <Sparkles className="w-4 h-4" />,
  'Divine Protection': <Shield className="w-4 h-4" />,
  'Divine Healing': <Heart className="w-4 h-4" />,
  'Divine Intervention': <Sparkles className="w-4 h-4" />,
  'Church & Ministry': <Cross className="w-4 h-4" />,
  'Nation & Leaders': <Globe className="w-4 h-4" />,
};

// Navbar Component
function Navbar({
  streak,
  onUpgradeClick,
  user,
  onSignIn,
  onSignOut,
}: {
  streak: number;
  onUpgradeClick: () => void;
  user: AuthUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '#prayer-workshop', label: 'Workshop' },
    { href: '#scripture-vault', label: 'Scripture' },
    { href: '#wisdom', label: 'Learn to Pray' },
    { href: '#fasting', label: 'Fasting' },
    { href: '#partner-network', label: 'Partners' },
  ];

  return (
    <nav className="sticky top-0 z-50 safe-top bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-red-50 ring-1 ring-red-200 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif-heading text-base font-bold text-slate-900 leading-tight">Prayer Fire Movement</h1>
            <p className="text-[10px] text-slate-500">A Cure For Prayerlessness</p>
            <p className="text-[10px] text-red-600 font-semibold italic leading-tight">Praying like Daniel</p>
          </div>
        </a>

        <div className="flex items-center gap-2">
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 mr-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-bold text-sm">{streak}</span>
          </div>

          {/* Sign in / avatar */}
          {user ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hidden md:flex w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold items-center justify-center hover:bg-emerald-500 transition-colors"
              title={user.name || 'Account'}
            >
              {(user.name || user.email || 'P').charAt(0).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="hidden md:block px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              Sign In
            </button>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-4 space-y-2 shadow-lg">
          {user ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                {(user.name || user.email || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold text-sm truncate">{user.name || 'Prayer Partner'}</p>
                <p className="text-slate-500 text-[10px] truncate">
                  {user.email || (user.phone ? `${user.countryCode ?? ''} ${user.phone}` : 'Signed in')}
                </p>
              </div>
              <button
                onClick={() => { onSignOut(); setMenuOpen(false); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onSignIn(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200"
            >
              <LogIn className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p className="font-bold text-sm">Sign In / Create Account</p>
                <p className="text-slate-500 text-[10px]">Join the Prayer Fire community</p>
              </div>
            </button>
          )}

          <button
            onClick={() => { onUpgradeClick(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200"
          >
            <Crown className="w-5 h-5" />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Upgrade to Prayer Fire Partner</p>
              <p className="text-slate-500 text-[10px]">Join the global intercessory community</p>
            </div>
          </button>

          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 p-3 bg-white rounded-xl text-slate-700 hover:bg-slate-50 border border-slate-200"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}

// Hero Section
function HeroSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="text-center py-8 px-4">
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 mb-4">
        <Flame className="w-3.5 h-3.5" /> A Cure For Prayerlessness
      </span>
      <h1 className="font-serif-heading text-3xl font-bold text-slate-900 mb-2">
        Prayer Fire Movement
      </h1>
      <p className="text-lg bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent font-serif-heading font-semibold mb-3">
        Write it. Speak it. Pray it. Trust God.
      </p>

      <div className="max-w-md mx-auto mt-4">
        <p className="text-slate-700 text-sm font-medium">
          Beat prayerlessness for good.
        </p>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            expanded ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
          )}
        >
          <p className="text-slate-500 text-xs leading-relaxed">
            Prayer Fire Movement helps you build a consistent 3-times-a-day prayer habit.
            Write your prayer points, carry them with you, and get gentle reminders to stay on track.
            Then join the Partner Network and stand in the gap with believers around the world.
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-emerald-600 text-xs font-semibold hover:text-emerald-500 transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          {expanded ? 'Show less' : 'Read more'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
    </section>
  );
}

// Start-Up Launch Card
function StartUpLaunchCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full self-start bg-white rounded-3xl p-5 text-center border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all shadow-sm"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-200">
          <Sparkles className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="font-serif-heading text-lg font-bold text-slate-900">Start-Up Prayer</h3>
        <p className="text-slate-600 text-sm">Make your prayer now</p>
        <p className="text-emerald-600 text-xs font-semibold">7-step guided</p>
      </div>
    </button>
  );
}

// Start-Up Modal
function StartUpModal({
  isOpen,
  onClose,
  prayers,
  intercessoryPrayers,
  setIntercessoryPrayers,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  prayers: PrayerPoint[];
  intercessoryPrayers: IntercessoryPrayer[];
  setIntercessoryPrayers: (p: IntercessoryPrayer[]) => void;
  categories: IntercessoryCategory[];
}) {
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCategory, setNewCategory] = useState('Individual by Name & Challenge');
  const [showCelebration, setShowCelebration] = useState(false);

  const steps = [
    { id: 1, title: 'Mercy Prayer', subtitle: 'Cleansing & Confession', verse: '1 John 1:9', verseText: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', icon: <Droplets className="w-6 h-6" />, duration: 120 },
    { id: 2, title: 'Thanksgiving', subtitle: 'Appreciate God\'s Goodness', verse: 'Psalm 100:4', verseText: 'Enter into his gates with thanksgiving, and into his courts with praise.', icon: <Award className="w-6 h-6" />, duration: 120 },
    { id: 3, title: 'Invite Holy Spirit', subtitle: 'Holy Spirit Assistance', verse: 'John 14:26', verseText: 'But the Comforter, which is the Holy Ghost, whom the Father will send in my name, he shall teach you all things.', icon: <Wind className="w-6 h-6" />, duration: 120 },
    { id: 4, title: 'Praise & Worship', subtitle: 'Sing Unto the Lord', verse: 'Psalm 95:1-2', verseText: 'O come, let us sing unto the Lord: let us make a joyful noise to the rock of our salvation.', icon: <Music className="w-6 h-6" />, duration: 180 },
    { id: 5, title: 'My Prayer List', subtitle: 'Personal Prayers', verse: '', verseText: '', icon: <Heart className="w-6 h-6" />, duration: 240, isPrayerList: true },
    { id: 6, title: 'Special Prayer', subtitle: 'Praying like Daniel', verse: 'Daniel 6:10', verseText: 'Now when Daniel knew that the writing was signed, he went into his house; and his windows being open in his chamber toward Jerusalem, he kneeled upon his knees three times a day, and prayed, and gave thanks before his God, as he did aforetime.', icon: <Sparkles className="w-6 h-6" />, duration: 240, isSpecialPrayer: true },
    { id: 7, title: 'Intercessory Prayer', subtitle: 'Pray for Others', verse: '', verseText: '', icon: <Users className="w-6 h-6" />, duration: 300, isIntercessory: true },
  ];

  useEffect(() => {
    let interval: number;
    if (isActive && timer > 0) {
      interval = window.setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
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

  const handleNext = () => {
    playChime();
    if (step < 7) {
      setStep(step + 1);
      setTimer(steps.find((s) => s.id === step + 1)?.duration || 0);
      setIsActive(false);
    } else {
      setShowCelebration(true);
    }
  };

  const finishAndClose = () => {
    setShowCelebration(false);
    setStep(1);
    setTimer(steps[0]?.duration || 0);
    setIsActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-slate-900">Start-Up Prayer</h2>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 text-xs font-semibold transition-colors"
            title="Back to Home"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 p-4 flex-shrink-0">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => { setStep(s.id); setTimer(steps[s.id - 1].duration); setIsActive(false); }}
              className={cn(
                'w-3 h-3 rounded-full transition-all',
                step === s.id ? 'bg-emerald-600 scale-125' : s.id < step ? 'bg-emerald-400' : 'bg-slate-300'
              )}
            />
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Timer Ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="58" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke={step <= 4 ? '#059669' : step <= 6 ? '#475569' : '#dc2626'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={364}
                  strokeDashoffset={364 - (364 * progress) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{formatTime(timer)}</span>
                <span className="text-xs text-slate-500">remaining</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-6">
            <div className={cn(
              'inline-flex items-center justify-center w-14 h-14 rounded-full mb-3',
              step <= 4 ? 'bg-emerald-50 text-emerald-600' : step <= 6 ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'
            )}>
              {currentStep?.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{currentStep?.title}</h3>
            <p className="text-slate-500 text-sm">{currentStep?.subtitle}</p>
          </div>

          {/* Verse Card */}
          {currentStep?.verse && (
            <div className="rounded-xl p-4 mb-6 border bg-emerald-50 border-emerald-200">
              <p className="text-emerald-700 text-xs mb-2 font-semibold">{currentStep.verse}</p>
              <p className="text-slate-700 text-sm leading-relaxed italic">"{currentStep.verseText}"</p>
            </div>
          )}

          {/* Step 5: My Prayer List */}
          {currentStep?.isPrayerList && (
            <div className="mb-6 space-y-2 max-h-80 overflow-y-auto">
              <AllPrayersList
                prayers={prayers}
                intercessoryPrayers={intercessoryPrayers}
                categories={categories}
              />
            </div>
          )}

          {/* Step 6: Special Prayer */}
          {currentStep?.isSpecialPrayer && (
            <div className="mb-6 space-y-2 max-h-80 overflow-y-auto">
              {prayers.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-slate-500 text-xs">No special prayers yet.</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Add them in the Prayer Workshop → Special Prayer session.</p>
                </div>
              ) : (
                prayers.map((prayer) => (
                  <div
                    key={prayer.id}
                    className={cn(
                      'rounded-xl p-3 border-l-4 transition-all',
                      prayer.isAnswered
                        ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
                        : prayer.urgency === 'high'
                          ? 'bg-white border-l-red-500 border border-slate-200'
                          : 'bg-white border-l-slate-400 border border-slate-200'
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-slate-500">
                      🙏 {prayer.category} · Special Prayer
                    </p>
                    <h4 className="text-slate-900 font-bold text-sm">{prayer.title}</h4>
                    {prayer.notes && <p className="text-slate-600 text-xs mt-1 italic">{prayer.notes}</p>}
                    {prayer.scripture && <p className="text-emerald-700 text-xs mt-1 italic">📖 {prayer.scripture}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 7: Intercessory Prayer */}
          {currentStep?.isIntercessory && (
            <div className="mb-6 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-red-700 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add Intercessory Prayer
                </p>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 border border-slate-300"
                >
                  {[
                    'Individual by Name & Challenge',
                    'Family Member — By Name',
                    'Church Family / Fellow Believer',
                    'Business / Career',
                    'Government Officials',
                    'Missionaries / Evangelists',
                    'Youth & Children',
                    'The Sick & Suffering',
                    'The Lost & Searching',
                    'Persecuted Church',
                  ].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Name or title (e.g. Sister Mary)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-300"
                />
                <textarea
                  placeholder="Prayer details (e.g. healing, salvation...)"
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-300 resize-none"
                />
                <button
                  onClick={() => {
                    if (!newName.trim()) return;
                    setIntercessoryPrayers([
                      ...intercessoryPrayers,
                      {
                        id: Date.now().toString(),
                        category: newCategory,
                        title: newName,
                        details: newDetails,
                        isAnswered: false,
                        createdAt: new Date().toISOString(),
                      }
                    ]);
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
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                    <p className="text-slate-500 text-xs">No prayers added yet. Use the form above to add one.</p>
                  </div>
                ) : (
                  intercessoryPrayers.map((prayer) => (
                    <div key={prayer.id} className="bg-red-50/50 border border-red-200 rounded-xl p-3 border-l-4 border-l-red-500">
                      <h4 className="text-slate-900 font-bold text-sm">[{prayer.category}] {prayer.title}</h4>
                      {prayer.details && <p className="text-slate-600 text-xs mt-1 italic">{prayer.details}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'flex-1 py-3 rounded-xl font-bold transition-all',
                isActive ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'
              )}
            >
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
            >
              {step < 7 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>

      {/* Celebration popup */}
      {showCelebration && (
        <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-6 py-8 text-center">
              <div className="text-5xl mb-3">🎉🙏🎊</div>
              <h2 className="font-serif-heading text-2xl font-bold text-white mb-1">Congratulations!</h2>
              <p className="text-emerald-50 text-sm">Your prayer session is complete</p>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">
                Well done! You have spent time in the presence of God. He sees you, He hears you,
                and He will answer you. Keep the fire burning! 🔥
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">📖 James 5:16</p>
                <p className="text-slate-700 text-sm italic">
                  "The effectual fervent prayer of a righteous man availeth much."
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCelebration(false); setStep(1); setTimer(steps[0]?.duration || 0); setIsActive(false); }}
                  className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Pray Again
                </button>
                <button
                  onClick={finishAndClose}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all"
                >
                  Amen 🙏
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Prayer Workshop Section
function PrayerWorkshop({
  prayers,
  setPrayers,
  intercessoryPrayers,
  setIntercessoryPrayers,
  categories,
  setCategories,
}: {
  prayers: PrayerPoint[];
  setPrayers: (p: PrayerPoint[]) => void;
  intercessoryPrayers: IntercessoryPrayer[];
  setIntercessoryPrayers: (p: IntercessoryPrayer[]) => void;
  categories: IntercessoryCategory[];
  setCategories: (c: IntercessoryCategory[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<'family' | 'special' | 'intercessory' | null>('family');
  const [filter, setFilter] = useState<'active' | 'answered'>('active');
  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'personal' | 'intercessory'>('personal');

  return (
    <section id="prayer-workshop" className="scroll-mt-24">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-5 flex flex-col items-center justify-center gap-1 hover:bg-emerald-50/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center mb-1">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-serif-heading text-xl font-bold text-slate-900">Write your prayer point here</h2>
          <p className="text-emerald-600 text-sm font-semibold">Prayer Workshop</p>
          <div className="mt-2 flex items-center gap-2 text-slate-400 text-xs">
            <ChevronDown className="w-4 h-4" />
            <span>Tap to Open</span>
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full bg-white max-w-3xl mx-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between safe-top">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-serif-heading text-base font-bold text-slate-900 leading-tight">Prayer Workshop</h2>
                  <p className="text-[10px] text-slate-500">Write it. Speak it. Pray it. Trust God.</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 text-xs font-semibold transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-slate-600 text-sm font-semibold text-center">
                ✍️ Write your prayer point — tap a session below:
              </p>

              {/* Session 1: Family */}
              <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'family' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200')}>
                <button
                  onClick={() => setActiveSession(activeSession === 'family' ? null : 'family')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-emerald-800">Session 1: My Family Prayers</p>
                    <p className="text-[10px] text-slate-500">Cover your loved ones in prayer</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">MY FAMILY</span>
                  {activeSession === 'family' ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {activeSession === 'family' && (
                  <div className="px-3 pb-3">
                    <FamilyPrayerSession categories={categories} setCategories={setCategories} />
                  </div>
                )}
              </div>

              {/* Session 2: Special Prayer */}
              <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'special' ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200')}>
                <button
                  onClick={() => setActiveSession(activeSession === 'special' ? null : 'special')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">Session 2: Special Prayer</p>
                    <p className="text-[10px] text-slate-500">Special prayer points for your own journey</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-600">FOR YOU</span>
                  {activeSession === 'special' ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {activeSession === 'special' && (
                  <div className="px-3 pb-3">
                    <SpecialPrayerForm onAdd={(prayer) => {
                      setPrayers([...prayers, { ...prayer, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
                    }} />
                  </div>
                )}
              </div>

              {/* Session 3: Intercessory */}
              <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'intercessory' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200')}>
                <button
                  onClick={() => setActiveSession(activeSession === 'intercessory' ? null : 'intercessory')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-red-700">Session 3: Intercessory Prayer</p>
                    <p className="text-[10px] text-slate-500">Standing in the gap for others</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">FOR OTHERS</span>
                  {activeSession === 'intercessory' ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {activeSession === 'intercessory' && (
                  <div className="px-3 pb-3">
                    <IntercessoryForm onAdd={(prayer) => {
                      setIntercessoryPrayers([...intercessoryPrayers, { ...prayer, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
                    }} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-lg p-2 border border-slate-200">
                <Lock className="w-3 h-3" />
                <span>Private prayers are protected with your PIN</span>
              </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-slate-200"></div>
                <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  My Saved Prayers
                </h3>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setListTab('personal')}
                  className={cn(
                    'py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    listTab === 'personal'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-white text-slate-500 border border-slate-200'
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Personal ({prayers.length})
                </button>
                <button
                  onClick={() => setListTab('intercessory')}
                  className={cn(
                    'py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    listTab === 'intercessory'
                      ? 'bg-red-50 text-red-700 border border-red-300'
                      : 'bg-white text-slate-500 border border-slate-200'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Intercessory ({intercessoryPrayers.length})
                </button>
              </div>

              {listTab === 'personal' && (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setFilter('active')}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                        filter === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-white text-slate-500 border border-slate-200'
                      )}
                    >
                      Active ({prayers.filter((p) => !p.isAnswered).length})
                    </button>
                    <button
                      onClick={() => setFilter('answered')}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                        filter === 'answered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-white text-slate-500 border border-slate-200'
                      )}
                    >
                      Answered ({prayers.filter((p) => p.isAnswered).length})
                    </button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search personal prayers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                  </div>
                  <PrayerList prayers={prayers} setPrayers={setPrayers} filter={filter} search={search} />
                </>
              )}

              {listTab === 'intercessory' && (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search intercessory prayers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
                    />
                  </div>
                  <IntercessoryPrayerList
                    prayers={intercessoryPrayers}
                    setPrayers={setIntercessoryPrayers}
                    search={search}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </section>
  );
}

// Family Prayer Session (Session 1)
function FamilyPrayerSession({
  categories,
  setCategories,
}: {
  categories: IntercessoryCategory[];
  setCategories: (c: IntercessoryCategory[]) => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const editNameSpeech = useSpeechToText((text) => setEditName((prev) => (prev ? prev + ' ' + text : text)));
  const editDetailsSpeech = useSpeechToText((text) => setEditDetails((prev) => (prev ? prev + ' ' + text : text)));

  const addEntry = (catId: string, subId: string) => {
    const newEntry: PrayerEntry = { id: Date.now().toString(), name: '', details: '', isAnswered: false };
    setCategories(categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          subCategories: cat.subCategories.map((sub) => {
            if (sub.id === subId) {
              return { ...sub, entries: [...sub.entries, newEntry] };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
    setEditingId(newEntry.id);
    setEditName('');
    setEditDetails('');
    playChime();
  };

  const removeEntry = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          subCategories: cat.subCategories.map((sub) => {
            if (sub.id === subId) {
              return { ...sub, entries: sub.entries.filter((e) => e.id !== entryId) };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
  };

  const startEdit = (entry: PrayerEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditDetails(entry.details);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDetails('');
  };

  const saveEdit = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          subCategories: cat.subCategories.map((sub) => {
            if (sub.id === subId) {
              return {
                ...sub,
                entries: sub.entries.map((e) => (e.id === entryId ? { ...e, name: editName, details: editDetails } : e))
              };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
    cancelEdit();
  };

  const toggleEntryAnswered = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          subCategories: cat.subCategories.map((sub) => {
            if (sub.id === subId) {
              return {
                ...sub,
                entries: sub.entries.map((e) => (e.id === entryId ? { ...e, isAnswered: !e.isAnswered } : e))
              };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
  };

  return (
    <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              className="w-full p-3 flex items-center justify-between hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[cat.name] || <Sparkles className="w-4 h-4 text-emerald-600" />}
                <span className="text-slate-900 text-sm font-medium">{cat.name}</span>
                <span className="text-slate-400 text-[10px]">
                  ({cat.subCategories.reduce((acc, s) => acc + s.entries.length, 0)})
                </span>
              </div>
              {expandedCat === cat.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedCat === cat.id && (
              <div className="p-3 pt-0 space-y-2">
                {cat.subCategories.map((sub) => (
                  <div key={sub.id} className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    <button
                      onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                      className="w-full p-2 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 text-xs font-semibold">{sub.name}</span>
                        {sub.entries.length > 0 && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded">
                            {sub.entries.filter((e) => e.isAnswered).length}/{sub.entries.length}
                          </span>
                        )}
                      </div>
                      {expandedSub === sub.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>
                    {expandedSub === sub.id && (
                      <div className="p-2 pt-0 space-y-2">
                        {sub.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'rounded-xl p-4 border-l-4 transition-all',
                              entry.isAnswered
                                ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
                                : 'bg-white border-l-emerald-500 border border-slate-200'
                            )}
                          >
                            {editingId === entry.id ? (
                              <div className="space-y-2">
                                <p className="text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  NEW ENTRY — [{sub.name}] · {cat.name}
                                </p>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Name (e.g. Princess, Prince)"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                  />
                                  <SpeechToTextButton
                                    isListening={editNameSpeech.isListening}
                                    onStart={editNameSpeech.startListening}
                                    onStop={editNameSpeech.stopListening}
                                    error={editNameSpeech.error}
                                  />
                                </div>
                                <div className="relative">
                                  <textarea
                                    placeholder="Prayer details (e.g. God bless my son)"
                                    value={editDetails}
                                    onChange={(e) => setEditDetails(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                  />
                                  <SpeechToTextButton
                                    isListening={editDetailsSpeech.isListening}
                                    onStart={editDetailsSpeech.startListening}
                                    onStop={editDetailsSpeech.stopListening}
                                    error={editDetailsSpeech.error}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEdit(cat.id, sub.id, entry.id)}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 flex items-center justify-center gap-1.5"
                                  >
                                    <Save className="w-4 h-4" /> Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="mb-2">
                                  <h4 className="text-slate-900 font-bold text-base">
                                    [{sub.name}] {entry.name || 'Unnamed'}
                                  </h4>
                                  <p className="text-emerald-700 text-xs">{cat.name}</p>
                                </div>
                                {entry.details && (
                                  <p className="text-slate-700 text-sm leading-relaxed border-l-2 border-emerald-300 pl-3 italic my-2">
                                    {entry.details}
                                  </p>
                                )}
                                <div className="flex items-center justify-between gap-2 mt-3">
                                  <button
                                    onClick={() => toggleEntryAnswered(cat.id, sub.id, entry.id)}
                                    className={cn(
                                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                      entry.isAnswered
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    )}
                                  >
                                    <Check className="w-3 h-3" />
                                    {entry.isAnswered ? 'Answered ✓' : 'Mark Answered'}
                                  </button>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => startEdit(entry)}
                                      className="text-emerald-600 text-xs font-semibold hover:text-emerald-500 p-1"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => removeEntry(cat.id, sub.id, entry.id)}
                                      className="text-red-500 text-xs hover:text-red-600 p-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => addEntry(cat.id, sub.id)}
                          className="w-full py-2 rounded-lg border border-dashed border-emerald-300 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Add {sub.name}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// Speech-to-Text Button
function SpeechToTextButton({
  isListening,
  onStart,
  onStop,
  error,
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
}) {
  const supported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isListening) {
            onStop();
          } else {
            onStart();
          }
        }}
        title={isListening ? 'Stop listening' : 'Speak instead of typing'}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors',
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
        )}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-1 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 z-10">
          {error}
        </div>
      )}
    </>
  );
}

// Special Prayer Form (Session 2)
function SpecialPrayerForm({ onAdd }: { onAdd: (prayer: Omit<PrayerPoint, 'id' | 'createdAt'>) => void }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Special');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [scripture, setScripture] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const titleSpeech = useSpeechToText((text) => setTitle((prev) => (prev ? prev + ' ' + text : text)));
  const notesSpeech = useSpeechToText((text) => setNotes((prev) => (prev ? prev + ' ' + text : text)));

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title,
      notes,
      category,
      urgency,
      scripture,
      isPrivate,
      isAnswered: false,
    });
    setTitle('');
    setNotes('');
    setScripture('');
    setIsExpanded(false);
  };

  return (
    <div className="space-y-3">
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left">
          <div className="relative">
            <input
              type="text"
              placeholder="What's on your heart?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <SpeechToTextButton
              isListening={titleSpeech.isListening}
              onStart={titleSpeech.startListening}
              onStop={titleSpeech.stopListening}
              error={titleSpeech.error}
            />
          </div>
        </button>
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none h-20"
              />
              <SpeechToTextButton
                isListening={notesSpeech.isListening}
                onStart={notesSpeech.startListening}
                onStop={notesSpeech.stopListening}
                error={notesSpeech.error}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                <option>Special</option>
                <option>Family</option>
                <option>Health</option>
                <option>Work</option>
                <option>Spiritual</option>
              </select>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                <option value="low">Low Urgency</option>
                <option value="medium">Medium</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Scripture anchor (optional)"
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-slate-600 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                Private Prayer
              </label>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500"
              >
                Save Prayer
              </button>
            </div>

            {title.trim() && (
              <div className="mt-3 space-y-2 pt-3 border-t border-slate-200">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Preview — How your card will look:
                </p>
                <div
                  className={cn(
                    'rounded-xl p-4 border-l-4 transition-all',
                    urgency === 'high'
                      ? 'bg-white border-l-red-500 border border-slate-200'
                      : 'bg-white border-l-emerald-500 border border-slate-200'
                  )}
                >
                  <div className="mb-2">
                    <h4 className="text-slate-900 font-bold text-base">
                      [{category}] {title}
                    </h4>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      {urgency === 'high' && '🔥 High Priority · '}
                      Special Prayer
                      {isPrivate && <Lock className="w-3 h-3" />}
                    </p>
                  </div>
                  {notes.trim() && (
                    <p className="text-slate-700 text-sm leading-relaxed border-l-2 border-emerald-300 pl-3 italic my-2">
                      {notes}
                    </p>
                  )}
                  {scripture.trim() && (
                    <p className="text-emerald-700 text-xs mt-2 italic">📖 {scripture}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

// Intercessory Form (Session 3)
function IntercessoryForm({ onAdd }: { onAdd: (prayer: Omit<IntercessoryPrayer, 'id' | 'createdAt'>) => void }) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('Individual by Name & Challenge');

  const categories = [
    'Individual by Name & Challenge',
    'Family Member — By Name',
    'Church Family / Fellow Believer',
    'Business / Career',
    'Government Officials',
    'Missionaries / Evangelists',
    'Youth & Children',
    'The Sick & Suffering',
    'The Lost & Searching',
    'Persecuted Church',
  ];

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title,
      details,
      category,
      isAnswered: false,
    });
    setTitle('');
    setDetails('');
  };

  return (
    <div className="space-y-3">
        <div className="bg-red-50/50 rounded-xl p-3 border border-red-200">
          <p className="text-red-700 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">1</span>
            Who are you praying for?
          </p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="bg-red-50/50 rounded-xl p-3 border border-red-200">
          <p className="text-red-700 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">2</span>
            Name or Title
          </p>
          <input
            type="text"
            placeholder="e.g. Sister Mary, Pastor John, Bro James"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>

        <div className="bg-red-50/50 rounded-xl p-3 border border-red-200">
          <p className="text-red-700 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">3</span>
            What are you praying for?
          </p>
          <textarea
            placeholder="e.g. healing, salvation, breakthrough, family restoration, financial wisdom..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 border border-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          Add to Intercessory Prayer List
        </button>

        {title.trim() && (
          <div className="mt-3 space-y-2 pt-3 border-t border-red-200">
            <p className="text-red-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Preview — How your card will look:
            </p>
            <div className="rounded-xl p-4 border-l-4 border-l-red-500 bg-white border border-red-200">
              <div className="mb-2">
                <h4 className="text-slate-900 font-bold text-base">
                  [{category}] {title}
                </h4>
                <p className="text-red-600 text-xs">Intercessory Prayer</p>
              </div>
              {details.trim() && (
                <p className="text-slate-700 text-sm leading-relaxed border-l-2 border-red-300 pl-3 italic my-2">
                  {details}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-red-500/70 text-[10px] text-center italic">
          "Praying for others is standing in the gap for them"
        </p>
    </div>
  );
}

// Prayer List (Session 2 — Special Prayers)
function PrayerList({ prayers, setPrayers, filter, search }: { prayers: PrayerPoint[]; setPrayers: (p: PrayerPoint[]) => void; filter: 'active' | 'answered'; search: string }) {
  const filtered = prayers.filter((p) => {
    const matchesFilter = filter === 'answered' ? p.isAnswered : !p.isAnswered;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.notes.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleAnswered = (id: string) => {
    setPrayers(prayers.map((p) => (p.id === id ? { ...p, isAnswered: !p.isAnswered, answeredAt: p.isAnswered ? undefined : new Date().toISOString() } : p)));
  };

  const deletePrayer = (id: string) => {
    setPrayers(prayers.filter((p) => p.id !== id));
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No prayers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((prayer) => (
        <div
          key={prayer.id}
          className={cn(
            'rounded-xl p-4 border-l-4 transition-all',
            prayer.isAnswered
              ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
              : prayer.urgency === 'high'
                ? 'bg-white border-l-red-500 border border-slate-200'
                : 'bg-white border-l-emerald-500 border border-slate-200'
          )}
        >
          <div className="mb-2">
            <h4 className="text-slate-900 font-bold text-base">
              [{prayer.category}] {prayer.title}
            </h4>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              {prayer.urgency === 'high' && '🔥 High Priority · '}
              Special Prayer
              {prayer.isPrivate && <Lock className="w-3 h-3" />}
            </p>
          </div>
          {prayer.notes && (
            <p className="text-slate-700 text-sm leading-relaxed border-l-2 border-emerald-300 pl-3 italic my-2">
              {prayer.notes}
            </p>
          )}
          {prayer.scripture && (
            <p className="text-emerald-700 text-xs mt-2 italic">📖 {prayer.scripture}</p>
          )}
          <div className="flex items-center justify-between gap-2 mt-3">
            <button
              onClick={() => toggleAnswered(prayer.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                prayer.isAnswered
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              )}
            >
              <Check className="w-3 h-3" />
              {prayer.isAnswered ? 'Answered ✓' : 'Mark Answered'}
            </button>
            <button
              onClick={() => deletePrayer(prayer.id)}
              className="text-red-500 text-xs font-semibold hover:text-red-600 flex items-center gap-1 px-2 py-1.5"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Intercessory Prayer List (Session 3)
function IntercessoryPrayerList({
  prayers,
  setPrayers,
  search,
}: {
  prayers: IntercessoryPrayer[];
  setPrayers: (p: IntercessoryPrayer[]) => void;
  search: string;
}) {
  const filtered = prayers.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.details.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAnswered = (id: string) => {
    setPrayers(prayers.map((p) => (p.id === id ? { ...p, isAnswered: !p.isAnswered } : p)));
  };

  const deletePrayer = (id: string) => {
    setPrayers(prayers.filter((p) => p.id !== id));
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No intercessory prayers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((prayer) => (
        <div
          key={prayer.id}
          className={cn(
            'rounded-xl p-4 border-l-4 transition-all',
            prayer.isAnswered
              ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
              : 'bg-red-50/50 border-l-red-500 border border-red-200'
          )}
        >
          <div className="mb-2">
            <h4 className="text-slate-900 font-bold text-base">
              [{prayer.category}] {prayer.title}
            </h4>
            <p className="text-red-600 text-xs">Intercessory Prayer</p>
          </div>
          {prayer.details && (
            <p className="text-slate-700 text-sm leading-relaxed border-l-2 border-red-300 pl-3 italic my-2">
              {prayer.details}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 mt-3">
            <button
              onClick={() => toggleAnswered(prayer.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                prayer.isAnswered
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              )}
            >
              <Check className="w-3 h-3" />
              {prayer.isAnswered ? 'Answered ✓' : 'Mark Answered'}
            </button>
            <button
              onClick={() => deletePrayer(prayer.id)}
              className="text-red-500 text-xs font-semibold hover:text-red-600 flex items-center gap-1 px-2 py-1.5"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Scripture Vault
function ScriptureVault() {
  const [lang, setLang] = useState('en');
  const [copied, setCopied] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const langs = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
  ];

  const filtered = SCRIPTURE_CARDS.filter((c) => c.language === lang);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speaking === id) {
      stopSpeech();
      setSpeaking(null);
    } else {
      speakText(text);
      setSpeaking(id);
      setTimeout(() => setSpeaking(null), 5000);
    }
  };

  return (
    <section id="scripture-vault" className="py-3 px-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Scripture Vault</h2>
            <p className="text-xs text-slate-500">Key verses in five languages</p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  lang === l.code ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                )}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {filtered.map((card) => (
              <div key={card.id} className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-emerald-700 text-xs font-semibold mb-2">{card.reference}</p>
                <p className="text-slate-700 text-sm leading-relaxed italic">"{card.text}"</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleCopy(card.id, `"${card.text}" — ${card.reference}`)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {copied === card.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied === card.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleSpeak(card.id, card.text)}
                    className={cn(
                      'flex items-center gap-1 text-xs transition-colors',
                      speaking === card.id ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    {speaking === card.id ? <MicOff className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    {speaking === card.id ? 'Stop' : 'Listen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Wisdom Section
function WisdomSection() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem('upp_wisdom_read');
    return stored ? JSON.parse(stored) : {};
  });

  const markAsRead = (id: number) => {
    const newProgress = { ...readingProgress, [id]: true };
    setReadingProgress(newProgress);
    localStorage.setItem('upp_wisdom_read', JSON.stringify(newProgress));
    playChime();
  };

  const currentChapter = selectedChapter
    ? WISDOM_CHAPTERS.find((c) => c.id === selectedChapter)
    : null;

  const colors = COLOR_CLASSES[currentChapter?.color || 'emerald'];
  const readCount = Object.values(readingProgress).filter(Boolean).length;

  if (currentChapter) {
    return (
      <section id="wisdom" className="py-3 px-4 scroll-mt-24">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
            <button
              onClick={() => setSelectedChapter(null)}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <ChevronDown className="w-5 h-5 text-slate-500 rotate-90" />
            </button>
            <div className="flex-1">
              <p className="text-xs text-emerald-700 font-semibold">Chapter {currentChapter.id} of {WISDOM_CHAPTERS.length}</p>
              <h2 className="font-bold text-slate-900 text-base">{currentChapter.title}</h2>
            </div>
            <span className="text-2xl">{currentChapter.icon}</span>
          </div>

          <div className="p-5 space-y-5">
            <div className="text-center">
              <p className="text-slate-500 text-sm font-medium italic">{currentChapter.subtitle}</p>
            </div>

            {currentChapter.verses.map((verse, idx) => (
              <div key={idx} className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-4">
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">📖 Scripture</p>
                <p className="text-slate-700 text-sm leading-relaxed italic">"{verse}"</p>
              </div>
            ))}

            <div className="space-y-3">
              {currentChapter.paragraphs.map((para, idx) => (
                <p key={idx} className="text-slate-700 text-sm leading-relaxed">{para}</p>
              ))}
            </div>

            <div className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-5 border ${colors.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center flex-shrink-0 text-emerald-700`}>
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Key Takeaway</p>
                  <p className="text-slate-900 text-sm leading-relaxed font-medium italic">"{currentChapter.highlight}"</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {!readingProgress[currentChapter.id] ? (
                <button
                  onClick={() => markAsRead(currentChapter.id)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark as Read
                </button>
              ) : (
                <div className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-200 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Completed ✓
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (currentChapter.id > 1) setSelectedChapter(currentChapter.id - 1);
                  }}
                  disabled={currentChapter.id === 1}
                  className="py-2.5 bg-white text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => {
                    if (currentChapter.id < WISDOM_CHAPTERS.length) {
                      setSelectedChapter(currentChapter.id + 1);
                    } else {
                      setSelectedChapter(null);
                    }
                  }}
                  className="py-2.5 bg-white text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1"
                >
                  {currentChapter.id < WISDOM_CHAPTERS.length ? 'Next →' : 'Done ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="wisdom" className="py-3 px-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BookHeart className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900 text-lg">Learn to Pray</h2>
              <p className="text-slate-500 text-xs italic">Wisdom from Pastor Jerry Chijioke's book</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${(readCount / WISDOM_CHAPTERS.length) * 100}%` }}
              />
            </div>
            <span className="text-emerald-700 text-[10px] font-semibold">{readCount}/{WISDOM_CHAPTERS.length}</span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-slate-500 text-xs leading-relaxed mb-3 italic text-center">
            "Wisdom and guidance from Pastor Jerry Chijioke's book to deepen your daily prayer life."
          </p>

          {WISDOM_CHAPTERS.map((chapter) => {
            const c = COLOR_CLASSES[chapter.color];
            const isRead = readingProgress[chapter.id];
            return (
              <button
                key={chapter.id}
                onClick={() => setSelectedChapter(chapter.id)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {chapter.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Chapter {chapter.id}</span>
                      {isRead && (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">✓ READ</span>
                      )}
                    </div>
                    <h3 className="text-slate-900 font-bold text-sm truncate">{chapter.title}</h3>
                    <p className="text-slate-500 text-[11px] italic truncate">{chapter.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-emerald-600 transition-transform" />
                </div>
              </button>
            );
          })}

          {readCount === WISDOM_CHAPTERS.length && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-700 font-bold text-sm">All Chapters Completed!</p>
              <p className="text-emerald-600/80 text-xs">You've finished all wisdom teachings. May they transform your prayer life.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Bible Library
function BibleLibrary() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_bible_favorites');
    return stored ? JSON.parse(stored) : [];
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredVerses = useMemo(() => {
    let verses = selectedCategory
      ? KJV_BIBLE_VERSES.filter((v) => v.category === selectedCategory)
      : KJV_BIBLE_VERSES;

    if (search) {
      verses = verses.filter((v) =>
        v.reference.toLowerCase().includes(search.toLowerCase()) ||
        v.text.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (showFavorites) {
      verses = verses.filter((v) => favorites.includes(v.id));
    }

    return verses;
  }, [selectedCategory, search, favorites, showFavorites]);

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('upp_bible_favorites', JSON.stringify(newFavs));
  };

  const handleCopy = (verse: typeof KJV_BIBLE_VERSES[0]) => {
    navigator.clipboard.writeText(`"${verse.text}" — ${verse.reference}`);
    setCopied(verse.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speaking === id) {
      stopSpeech();
      setSpeaking(null);
    } else {
      speakText(text);
      setSpeaking(id);
      setTimeout(() => setSpeaking(null), 10000);
    }
  };

  return (
    <section id="bible-library" className="py-3 px-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">KJV Bible Library</h2>
            <p className="text-xs text-slate-500">Search, favorite, and share verses</p>
          </div>
        </div>
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search verses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>

          {!selectedCategory && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {KJV_BIBLE_CATEGORIES.map((cat) => {
                const catVerses = KJV_BIBLE_VERSES.filter((v) => v.category === cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="bg-white rounded-xl p-3 text-left hover:bg-emerald-50/50 transition-all border border-slate-200 hover:border-emerald-300"
                  >
                    <span className="text-xl mb-1 block">{cat.icon}</span>
                    <span className="text-slate-900 text-sm font-semibold">{cat.name}</span>
                    <span className="text-slate-400 text-xs ml-1">({catVerses.length})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                showFavorites ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Heart className={cn('w-4 h-4 inline mr-1', favorites.length > 0 && 'fill-red-500')} />
              Favorites ({favorites.length})
            </button>
          </div>

          {selectedCategory || search || showFavorites ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredVerses.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No verses found</p>
              ) : (
                filteredVerses.map((verse) => (
                  <div key={verse.id} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-emerald-700 text-xs font-semibold">{verse.reference}</p>
                      <button
                        onClick={() => toggleFavorite(verse.id)}
                        className={cn(
                          'transition-all',
                          favorites.includes(verse.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-500'
                        )}
                      >
                        <Heart className={cn('w-4 h-4', favorites.includes(verse.id) && 'fill-red-500')} />
                      </button>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">"{verse.text}"</p>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleCopy(verse)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
                      >
                        {copied === verse.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copied === verse.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleSpeak(verse.id, `${verse.reference}. ${verse.text}`)}
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          speaking === verse.id ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
                        )}
                      >
                        {speaking === verse.id ? <MicOff className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        {speaking === verse.id ? 'Stop' : 'Listen'}
                      </button>
                      <button
                        onClick={() => navigator.share?.({
                          title: verse.reference,
                          text: `"${verse.text}" — ${verse.reference}`
                        })}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-center text-slate-500 text-sm py-4">
              Select a category above or search for verses
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// Fasting Tracker
function FastingTracker() {
  const [plan, setPlan] = useState<FastingPlan | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('upp_fasting_plan');
    return stored ? JSON.parse(stored) : null;
  });

  const startFast = (days: number) => {
    const newPlan: FastingPlan = {
      id: Date.now().toString(),
      days,
      startDate: new Date().toISOString(),
      completedDays: 0,
      checkedDays: [],
    };
    setPlan(newPlan);
    localStorage.setItem('upp_fasting_plan', JSON.stringify(newPlan));
  };

  const toggleDay = (day: number) => {
    if (!plan) return;
    const newChecked = plan.checkedDays.includes(day.toString())
      ? plan.checkedDays.filter((d) => d !== day.toString())
      : [...plan.checkedDays, day.toString()];
    const newPlan = {
      ...plan,
      checkedDays: newChecked,
      completedDays: newChecked.length,
    };
    setPlan(newPlan);
    localStorage.setItem('upp_fasting_plan', JSON.stringify(newPlan));
  };

  const resetPlan = () => {
    setPlan(null);
    localStorage.removeItem('upp_fasting_plan');
  };

  const plans = [
    { days: 3, title: '3 Days', subtitle: 'Starter Fast', icon: <Coffee className="w-5 h-5" /> },
    { days: 7, title: '7 Days', subtitle: 'Week Fast', icon: <CloudSun className="w-5 h-5" /> },
    { days: 21, title: '21 Days', subtitle: 'Daniel Fast', icon: <BookOpen className="w-5 h-5" /> },
    { days: 40, title: '40 Days', subtitle: 'Full Fast', icon: <Flame className="w-5 h-5" /> },
  ];

  return (
    <section id="fasting" className="py-3 px-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Fasting Tracker</h2>
            <p className="text-xs text-slate-500">Discipline your body, feed your spirit</p>
          </div>
        </div>
        <div className="p-4">
          {!plan ? (
            <>
              <p className="text-slate-500 text-sm mb-4 text-center">Choose your fasting plan</p>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.days}
                    onClick={() => startFast(p.days)}
                    className="p-4 rounded-xl text-left border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                      {p.icon}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{p.title}</h3>
                    <p className="text-slate-500 text-xs">{p.subtitle}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-slate-900 font-bold">{plan.days}-Day Fast</h3>
                  <p className="text-slate-500 text-xs">Started: {new Date(plan.startDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-600 font-bold text-2xl">{plan.completedDays}/{plan.days}</p>
                  <p className="text-slate-500 text-xs">days completed</p>
                </div>
              </div>

              <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${(plan.completedDays / plan.days) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: plan.days }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all',
                      plan.checkedDays.includes(day.toString())
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-emerald-300'
                    )}
                  >
                    {plan.checkedDays.includes(day.toString()) ? <Check className="w-4 h-4" /> : day}
                  </button>
                ))}
              </div>

              {plan.completedDays === plan.days && (
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200 mb-4">
                  <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-emerald-700 font-bold">Fast Completed!</p>
                  <p className="text-emerald-600/80 text-sm">Well done! God honors your dedication.</p>
                </div>
              )}

              <button
                onClick={resetPlan}
                className="w-full py-2 bg-slate-100 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-200"
              >
                Start New Fast
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Partner Network
function PartnerNetwork({
  requests,
  setRequests,
  isPremium,
  onUpgradeClick,
}: {
  requests: PartnerRequest[];
  setRequests: (r: PartnerRequest[]) => void;
  isPremium: boolean;
  onUpgradeClick: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [request, setRequest] = useState('');

  const submitRequest = () => {
    if (!name || !request) return;
    const newRequest: PartnerRequest = {
      id: Date.now().toString(),
      name,
      location,
      request,
      prayers: 0,
      createdAt: new Date().toISOString(),
    };
    setRequests([newRequest, ...requests]);
    setName('');
    setLocation('');
    setRequest('');
    setShowForm(false);
    playChime();
  };

  const prayForRequest = (id: string) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, prayers: r.prayers + 1 } : r)));
    playChime();
  };

  return (
    <section id="partner-network" className="py-3 px-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">Partner Network</h2>
              {isPremium ? (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> PREMIUM
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PREMIUM
                </span>
              )}
            </div>
          </div>
          {isPremium && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-semibold hover:bg-emerald-500"
            >
              {showForm ? 'Cancel' : '+ Add Request'}
            </button>
          )}
        </div>

        {!isPremium && (
          <div className="p-4">
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
              <Crown className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-slate-900 font-bold text-base">Prayer Fire Partner Required</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Join our global intercessory community. Submit prayer requests, join prayer groups,
                and stand in the gap with believers worldwide.
              </p>
              <ul className="text-left text-slate-700 text-xs space-y-1.5 max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Join approved prayer groups</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Submit & pray for partner requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Global prayer alerts & reminders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Create & manage groups (admin role)</span>
                </li>
              </ul>
              <button
                onClick={onUpgradeClick}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Prayer Fire Partner
              </button>
              <p className="text-slate-500 text-[10px]">Starting at ₦1,000/month • 14-day free trial</p>
            </div>
          </div>
        )}
        <div className="p-4">
          {showForm && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200 space-y-3">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="Location (city, country)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400"
              />
              <textarea
                placeholder="Share your prayer request..."
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none h-20"
              />
              <button
                onClick={submitRequest}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500"
              >
                Submit Request
              </button>
            </div>
          )}

          <p className="text-slate-500 text-xs mb-3 text-center">
            {requests.length} prayer requests from around the world
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Globe2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No requests yet</p>
                <p className="text-slate-400 text-xs">Be the first to share!</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-slate-900 font-semibold text-sm">{req.name}</h4>
                      <p className="text-slate-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {req.location || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                      <Flame className="w-3 h-3 text-red-500" />
                      <span className="text-red-600 text-xs font-bold">{req.prayers}</span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm">{req.request}</p>
                  <button
                    onClick={() => prayForRequest(req.id)}
                    className="mt-3 flex items-center gap-2 text-red-600 text-xs font-semibold hover:text-red-500"
                  >
                    <Heart className="w-4 h-4" /> Pray for this request
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-8 px-4 text-center border-t border-slate-200 mt-8">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-emerald-600" />
        <span className="text-slate-900 font-serif font-bold">Prayer Fire Movement</span>
      </div>
      <p className="text-slate-500 text-xs mb-1">Ignite. Intercede. Overcome.</p>
      <p className="text-slate-400 text-[10px]">© 2024 Prayer Fire Movement. All rights reserved.</p>
    </footer>
  );
}

// All Prayers List
function AllPrayersList({
  prayers,
  intercessoryPrayers,
  categories,
}: {
  prayers: PrayerPoint[];
  intercessoryPrayers: IntercessoryPrayer[];
  categories: IntercessoryCategory[];
}) {
  const familyPrayers = categories.flatMap((cat) =>
    cat.subCategories.flatMap((sub) =>
      sub.entries.map((entry) => ({
        id: `family-${cat.id}-${sub.id}-${entry.id}`,
        category: cat.name,
        subCategory: sub.name,
        title: entry.name || 'Unnamed',
        details: entry.details,
        isAnswered: entry.isAnswered,
        type: 'family' as const,
      }))
    )
  );

  const personalPrayers = prayers.map((p) => ({
    id: `personal-${p.id}`,
    category: p.category,
    subCategory: 'Special Prayer',
    title: p.title,
    details: p.notes,
    isAnswered: p.isAnswered,
    type: 'personal' as const,
  }));

  const intercessory = intercessoryPrayers.map((p) => ({
    id: `intercessory-${p.id}`,
    category: p.category,
    subCategory: 'Intercessory Prayer',
    title: p.title,
    details: p.details,
    isAnswered: p.isAnswered,
    type: 'intercessory' as const,
  }));

  const allPrayers = [...familyPrayers, ...personalPrayers, ...intercessory];

  if (allPrayers.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
        <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No saved prayers yet</p>
        <p className="text-slate-400 text-xs">Write your prayer points in the Prayer Workshop</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allPrayers.map((prayer) => (
        <div
          key={prayer.id}
          className={cn(
            'rounded-xl p-3 border-l-4 transition-all',
            prayer.isAnswered
              ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
              : prayer.type === 'family'
                ? 'bg-emerald-50/40 border-l-emerald-500 border border-emerald-200'
                : prayer.type === 'personal'
                  ? 'bg-white border-l-slate-400 border border-slate-200'
                  : 'bg-red-50/40 border-l-red-500 border border-red-200'
          )}
        >
          <p className={cn(
            'text-[10px] font-semibold uppercase tracking-wider mb-1',
            prayer.type === 'family' && 'text-emerald-700',
            prayer.type === 'personal' && 'text-slate-500',
            prayer.type === 'intercessory' && 'text-red-600'
          )}>
            {prayer.type === 'family' && `👨‍👩‍👧‍👦 ${prayer.category} · ${prayer.subCategory}`}
            {prayer.type === 'personal' && `🙏 ${prayer.category} · ${prayer.subCategory}`}
            {prayer.type === 'intercessory' && `🤝 ${prayer.category} · ${prayer.subCategory}`}
          </p>
          <h4 className="text-slate-900 font-bold text-sm">{prayer.title}</h4>
          {prayer.details && <p className="text-slate-600 text-xs mt-1 italic">{prayer.details}</p>}
        </div>
      ))}
    </div>
  );
}

// Wind icon for Holy Spirit step
function Wind({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

// Main App
export default function App() {
  const [streak, setStreak] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem('upp_streak_count');
    return stored ? parseInt(stored) : 0;
  });
  const [prayers, setPrayers] = useState<PrayerPoint[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_prayer_points');
    return stored ? JSON.parse(stored) : [];
  });
  const [intercessoryPrayers, setIntercessoryPrayers] = useState<IntercessoryPrayer[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_intercessory_prayers');
    return stored ? JSON.parse(stored) : [];
  });
  const [categories, setCategories] = useState<IntercessoryCategory[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_INTERCESSORY_CATEGORIES;
    const stored = localStorage.getItem('upp_intercessory_categories');
    return stored ? JSON.parse(stored) : DEFAULT_INTERCESSORY_CATEGORIES;
  });
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_partner_requests');
    return stored ? JSON.parse(stored) : [];
  });
  const [showStartUp, setShowStartUp] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = localStorage.getItem('preferred_currency') as Currency;
    return stored || getDefaultCurrency();
  });
  const [appointments, setAppointments] = useState<PrayerAppointment[]>(() => {
    const defaults = [
      { id: 'morning', time: '04:00', label: 'Morning Watch', enabled: true },
      { id: 'noon', time: '12:00', label: 'Noon Prayer', enabled: true },
      { id: 'midnight', time: '00:00', label: 'Midnight Hour', enabled: true },
    ];
    if (typeof window === 'undefined') return defaults;
    const stored = localStorage.getItem('upp_prayer_appointments');
    return stored ? JSON.parse(stored) : defaults;
  });
  const [isPremium, setIsPremium] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('upp_is_premium') === 'true';
  });
  const [showDailyVerse, setShowDailyVerse] = useState(false);
  const [showDailyWisdom, setShowDailyWisdom] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Restore / verify session
  useEffect(() => {
    (async () => {
      const stored = getStoredUser();
      if (stored) setUser(stored);
      const me = await fetchMe();
      if (me) setUser(me);
      setAuthChecked(true);
    })();
  }, []);

  // Prompt to sign in once per device (after daily devotionals)
  useEffect(() => {
    if (!authChecked || user) return;
    if (showDailyVerse || showDailyWisdom) return;
    if (typeof window !== 'undefined' && localStorage.getItem('pfm_auth_prompted')) return;
    setShowAuth(true);
    localStorage.setItem('pfm_auth_prompted', '1');
  }, [authChecked, user, showDailyVerse, showDailyWisdom]);

  // Check for daily devotionals
  useEffect(() => {
    const lastDailyShown = localStorage.getItem('upp_daily_devotion_shown');
    const today = new Date().toDateString();
    if (lastDailyShown !== today) {
      setShowDailyVerse(true);
    }
  }, []);

  const handleDailyVerseClose = () => {
    setShowDailyVerse(false);
    setShowDailyWisdom(true);
  };

  const handleDailyWisdomClose = () => {
    setShowDailyWisdom(false);
    localStorage.setItem('upp_daily_devotion_shown', new Date().toDateString());
  };

  // Persist data
  useEffect(() => {
    localStorage.setItem('upp_prayer_points', JSON.stringify(prayers));
  }, [prayers]);

  useEffect(() => {
    localStorage.setItem('upp_intercessory_prayers', JSON.stringify(intercessoryPrayers));
  }, [intercessoryPrayers]);

  useEffect(() => {
    localStorage.setItem('upp_intercessory_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('upp_partner_requests', JSON.stringify(partnerRequests));
  }, [partnerRequests]);

  useEffect(() => {
    localStorage.setItem('preferred_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('upp_prayer_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('upp_is_premium', isPremium.toString());
  }, [isPremium]);

  // Update streak
  useEffect(() => {
    const lastPrayer = localStorage.getItem('upp_last_prayer_date');
    const today = new Date().toDateString();
    if (lastPrayer !== today) {
      const newStreak = lastPrayer === new Date(Date.now() - 86400000).toDateString() ? streak + 1 : 1;
      setStreak(newStreak);
      localStorage.setItem('upp_streak_count', newStreak.toString());
      localStorage.setItem('upp_last_prayer_date', today);
    }
  }, []);

  // Export user data
  const exportUserData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      prayers,
      intercessoryPrayers,
      categories,
      appointments,
      streak,
      isPremium,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prayer-fire-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sign out
  const handleSignOut = async () => {
    await apiLogout();
    setUser(null);
  };

  // Delete account
  const deleteAccount = () => {
    if (!confirm('Are you absolutely sure? This will delete ALL your data permanently.')) return;
    if (user) apiDeleteAccount().catch(() => {});
    localStorage.clear();
    window.location.reload();
  };

  // Handle plan selection
  const handlePlanSelect = (planId: string) => {
    const confirmUpgrade = confirm(
      `Payment Integration Demo\n\n` +
      `In production, selecting plan "${planId}" will:\n` +
      `1. Redirect you to Paystack/Stripe checkout\n` +
      `2. Verify payment via secure webhook\n` +
      `3. Activate your Prayer Fire Partner subscription\n\n` +
      `For this demo, click OK to simulate a successful subscription.`
    );
    if (confirmUpgrade) {
      setIsPremium(true);
      setShowPricing(false);
      alert('🎉 Welcome to Prayer Fire Partner! Your premium features are now active.');
    }
  };

  // Navigation functions
  const scrollToHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToWorkshop = () => {
    const el = document.getElementById('prayer-workshop');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const button = el.querySelector('button');
      if (button) button.click();
    }
  };

  const scrollToNetwork = () => {
    const el = document.getElementById('partner-network');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToBible = () => {
    const el = document.getElementById('bible-library');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getCurrentView = (): 'home' | 'workshop' | 'network' | 'bible' | 'settings' => {
    const scrollY = window.scrollY;
    if (scrollY < 300) return 'home';
    if (scrollY < 800) return 'workshop';
    if (scrollY < 1500) return 'network';
    return 'bible';
  };

  const [currentView, setCurrentView] = useState<'home' | 'workshop' | 'network' | 'bible' | 'settings'>('home');

  useEffect(() => {
    const handleScroll = () => {
      setCurrentView(getCurrentView());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div id="top" className="min-h-screen bg-white">
      <Navbar
        streak={streak}
        onUpgradeClick={() => setShowPricing(true)}
        user={user}
        onSignIn={() => setShowAuth(true)}
        onSignOut={handleSignOut}
      />

      <main className="max-w-3xl mx-auto pb-24">
        <HeroSection />

        <div className="px-4 space-y-4">
          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <PrayerWorkshop
              prayers={prayers}
              setPrayers={setPrayers}
              intercessoryPrayers={intercessoryPrayers}
              setIntercessoryPrayers={setIntercessoryPrayers}
              categories={categories}
              setCategories={setCategories}
            />
            <StartUpLaunchCard onClick={() => setShowStartUp(true)} />
          </div>

          {/* Upgrade card */}
          {!isPremium && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="w-6 h-6 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-slate-900 font-bold text-sm">Prayer Fire Partner</p>
                  <p className="text-slate-500 text-xs">Unlock the global intercessory community</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { icon: <Users className="w-4 h-4" />, label: 'Prayer Groups' },
                  { icon: <Globe2 className="w-4 h-4" />, label: 'Global Requests' },
                  { icon: <Bell className="w-4 h-4" />, label: 'Prayer Alerts' },
                  { icon: <Mic className="w-4 h-4" />, label: 'Voice Prayer' },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setShowPricing(true)}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 text-center hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                  >
                    <span className="text-emerald-600 flex justify-center mb-1 group-hover:scale-110 transition-transform">{f.icon}</span>
                    <span className="text-slate-700 text-[11px] font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPricing(true)}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Prayer Fire Partner
              </button>
            </div>
          )}

          <CustomizablePrayerSchedule appointments={appointments} onUpdate={setAppointments} />
        </div>

        <ScriptureVault />
        <WisdomSection />
        <BibleLibrary />
        <FastingTracker />
        <PartnerNetwork
          requests={partnerRequests}
          setRequests={setPartnerRequests}
          isPremium={isPremium}
          onUpgradeClick={() => setShowPricing(true)}
        />
        <Footer />
      </main>

      <StartUpModal
        isOpen={showStartUp}
        onClose={() => setShowStartUp(false)}
        prayers={prayers}
        intercessoryPrayers={intercessoryPrayers}
        setIntercessoryPrayers={setIntercessoryPrayers}
        categories={categories}
      />

      <PricingPage
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        onSelectPlan={handlePlanSelect}
      />

      <AccountSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        prayerCount={prayers.length}
        intercessoryCount={intercessoryPrayers.length}
        streakCount={streak}
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        onDeleteAccount={deleteAccount}
        onExportData={exportUserData}
        user={user}
        onSignIn={() => setShowAuth(true)}
        onSignOut={handleSignOut}
        onOpenPrivacy={() => setShowPrivacy(true)}
      />

      <DailyVerseModal
        isOpen={showDailyVerse}
        onClose={handleDailyVerseClose}
      />

      <DailyWisdomModal
        isOpen={showDailyWisdom}
        onClose={handleDailyWisdomClose}
      />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={(u) => { setUser(u); setShowAuth(false); }}
      />

      <PrivacyPolicy
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {!showStartUp && !showPricing && !showSettings && !showDailyVerse && !showDailyWisdom && !showAuth && !showPrivacy && (
        <BottomNav
          currentView={currentView}
          onHome={scrollToHome}
          onWorkshop={scrollToWorkshop}
          onNetwork={scrollToNetwork}
          onBible={scrollToBible}
          onSettings={() => setShowSettings(true)}
        />
      )}
    </div>
  );
}
