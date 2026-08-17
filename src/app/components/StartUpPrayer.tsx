'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Droplets, Award, Music, Heart, Users, Sparkles, Home, Plus, Check,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';
import AllPrayersList from './AllPrayersList';

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
  const [timer, setTimer] = useState(120);
  const [isActive, setIsActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCategory, setNewCategory] = useState('Individual by Name & Challenge');

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
    playChime();
    if (step < 7) {
      goToStep(step + 1);
    } else {
      setShowCelebration(true);
    }
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
          <h1 className="font-serif-heading text-xl font-bold text-slate-900">Start-Up Prayer</h1>
          <p className="text-xs text-slate-500">7-step guided prayer · Praying like Daniel</p>
        </div>
        <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 text-xs font-semibold transition-colors">
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-5">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => goToStep(s.id)}
            className={cn('w-3 h-3 rounded-full transition-all', step === s.id ? 'bg-emerald-600 scale-125' : s.id < step ? 'bg-emerald-400' : 'bg-slate-300')}
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
            <span className="text-3xl font-bold text-slate-900">{formatTime(timer)}</span>
            <span className="text-xs text-slate-500">remaining</span>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="text-center mb-5">
        <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-full mb-3', step <= 4 ? 'bg-emerald-50 text-emerald-600' : step <= 6 ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600')}>
          {currentStep?.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">{currentStep?.title}</h3>
        <p className="text-slate-500 text-sm">{currentStep?.subtitle}</p>
      </div>

      {currentStep?.verse && (
        <div className="rounded-xl p-4 mb-5 border bg-emerald-50 border-emerald-200">
          <p className="text-emerald-700 text-xs mb-2 font-semibold">{currentStep.verse}</p>
          <p className="text-slate-700 text-sm leading-relaxed italic">"{currentStep.verseText}"</p>
        </div>
      )}

      {currentStep?.isPrayerList && (
        <div className="mb-5 space-y-2 max-h-80 overflow-y-auto">
          <AllPrayersList prayers={prayers} intercessoryPrayers={intercessoryPrayers} categories={categories} />
        </div>
      )}

      {currentStep?.isSpecialPrayer && (
        <div className="mb-5 space-y-2 max-h-80 overflow-y-auto">
          {prayers.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
              <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-slate-500 text-xs">No special prayers yet.</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Add them in the Prayer Workshop → Special Prayer.</p>
            </div>
          ) : (
            prayers.map((prayer) => (
              <div key={prayer.id} className={cn('rounded-xl p-3 border-l-4 transition-all', prayer.isAnswered ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200' : prayer.urgency === 'high' ? 'bg-white border-l-red-500 border border-slate-200' : 'bg-white border-l-slate-400 border border-slate-200')}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-slate-500">🙏 {prayer.category} · Special Prayer</p>
                <h4 className="text-slate-900 font-bold text-sm">{prayer.title}</h4>
                {prayer.notes && <p className="text-slate-600 text-xs mt-1 italic">{prayer.notes}</p>}
                {prayer.scripture && <p className="text-emerald-700 text-xs mt-1 italic">📖 {prayer.scripture}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {currentStep?.isIntercessory && (
        <div className="mb-5 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Intercessory Prayer</p>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 border border-slate-300">
              {['Individual by Name & Challenge', 'Family Member — By Name', 'Church Family / Fellow Believer', 'Business / Career', 'Government Officials', 'Missionaries / Evangelists', 'Youth & Children', 'The Sick & Suffering', 'The Lost & Searching', 'Persecuted Church'].map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="text" placeholder="Name or title (e.g. Sister Mary)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-300" />
            <textarea placeholder="Prayer details (e.g. healing, salvation...)" value={newDetails} onChange={(e) => setNewDetails(e.target.value)} rows={2} className="w-full bg-white rounded-lg px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 border border-slate-300 resize-none" />
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
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center"><p className="text-slate-500 text-xs">No prayers added yet.</p></div>
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
        <button onClick={() => setIsActive(!isActive)} className={cn('flex-1 py-3 rounded-xl font-bold transition-all', isActive ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-500')}>
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={handleNext} className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all">
          {step < 7 ? 'Next' : 'Finish'}
        </button>
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
                Well done! You have spent time in the presence of God. He sees you, He hears you, and He will answer you. Keep the fire burning! 🔥
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">📖 James 5:16</p>
                <p className="text-slate-700 text-sm italic">"The effectual fervent prayer of a righteous man availeth much."</p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetAll} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Pray Again</button>
                <Link href="/" onClick={resetAll} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all flex items-center justify-center">Amen 🙏</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
