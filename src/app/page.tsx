'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, Sparkles, Globe, Plus, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from './components/Navbar';

export default function HomePage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Navbar />

      <main className="bg-white min-h-screen pb-28">
        <div className="max-w-md mx-auto px-4 pt-5">
          {/* Hero card (light gray) */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center shadow-sm">
            <span className="inline-flex items-center gap-1.5 border border-emerald-300 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <Flame className="w-3.5 h-3.5" /> A Cure For Prayerlessness
            </span>
            <h1 className="font-serif-heading text-2xl font-bold text-slate-900">Prayer Fire Movement</h1>
            <p className="text-slate-500 text-sm mt-1">Write it. Speak it. Pray it. Trust God.</p>
            <p className="text-slate-900 text-sm font-medium mt-3">Pray 3 times a day — beat prayerlessness for good.</p>
            <div className={expanded ? 'max-h-40 opacity-100 mt-2 transition-all duration-300' : 'max-h-0 opacity-0 overflow-hidden transition-all duration-300'}>
              <p className="text-slate-500 text-xs leading-relaxed">
                Prayer Fire Movement helps you build a consistent 3-times-a-day prayer habit.
                Write your prayer points, carry them with you, and get gentle reminders to stay on track.
                Then join the Partner Network and stand in the gap with believers around the world.
              </p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-emerald-700 text-xs font-semibold hover:text-emerald-600 flex items-center justify-center gap-1 mx-auto"
            >
              {expanded ? 'Show less' : 'Read more'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Two side-by-side cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Link
              href="/workshop"
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-emerald-300 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-slate-900 font-bold text-sm leading-tight">Write Prayer Point</h3>
              <p className="text-emerald-600 text-xs font-semibold mt-1">Prayer Workshop</p>
            </Link>

            <Link
              href="/startup"
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-emerald-300 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-slate-900 font-bold text-sm leading-tight">Start-Up Prayer</h3>
              <p className="text-emerald-600 text-xs font-semibold mt-1">7-step guided</p>
            </Link>
          </div>

          {/* Daily schedule banner */}
          <Link
            href="/schedule"
            className="block bg-white rounded-2xl mt-4 p-4 border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm hover:border-emerald-300 hover:-translate-y-0.5 transition-all"
          >
            <h3 className="text-slate-900 font-bold text-base">Daily Schedule</h3>
            <p className="text-emerald-600 text-sm font-semibold mt-0.5">12am · 12pm · 4am</p>
          </Link>

          {/* Global partner wall */}
          <div className="bg-white border border-slate-200 rounded-2xl mt-4 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                Global Partner Wall
              </span>
            </div>
            <h2 className="text-slate-900 font-bold text-lg leading-tight">Prayer Fire Movement Network</h2>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              4,892 active partners standing in agreement across 84 nations.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link
                href="/network"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all"
              >
                <Plus className="w-4 h-4" /> Post Partner Request
              </Link>
              <Link
                href="/network"
                className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                <Heart className="w-4 h-4" /> Support Network
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
