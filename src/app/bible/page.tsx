'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ScrollText, BookOpen } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import BibleLibrary from '@/app/components/BibleLibrary';
import BibleReader from '@/app/components/BibleReader';

export default function BiblePage() {
  const [mode, setMode] = useState<'read' | 'verses'>('read');

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-acc" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">King James Bible</h1>
            <p className="text-xs text-ink-muted">The complete KJV — read by book &amp; chapter</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-card-2 p-1 mb-5">
          <button
            onClick={() => setMode('read')}
            className={cn('py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all', mode === 'read' ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted')}
          >
            <BookOpen className="w-4 h-4" /> Read the Bible
          </button>
          <button
            onClick={() => setMode('verses')}
            className={cn('py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all', mode === 'verses' ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted')}
          >
            <ScrollText className="w-4 h-4" /> Verse Library
          </button>
        </div>

        {mode === 'read' ? <BibleReader /> : <BibleLibrary />}
      </main>
      <Footer />
    </>
  );
}
