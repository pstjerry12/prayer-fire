'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ScrollText, BookOpen, Bookmark } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import BibleLibrary from '@/app/components/BibleLibrary';
import BibleReader from '@/app/components/BibleReader';
import BookmarksPanel from '@/app/components/BookmarksPanel';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { migrateLegacyFavorites } from '@/lib/bookmarks';

type Mode = 'read' | 'verses' | 'bookmarks';
// The tab is remembered for this session so Back from a verse or topic page returns to the same tab.
const TAB_KEY = 'pfm_bible_tab';

export default function BiblePage() {
  const [mode, setModeState] = useState<Mode>('read');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY);
      // Read after mount (not in the initial state) so the server and first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'read' || saved === 'verses' || saved === 'bookmarks') setModeState(saved);
    } catch {
      // ignore
    }
    migrateLegacyFavorites(KJV_BIBLE_VERSES);
  }, []);

  function setMode(next: Mode) {
    setModeState(next);
    try {
      sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-acc" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Holy Bible</h1>
            <p className="text-xs text-ink-muted">Read by book &amp; chapter, in your chosen translation — fully offline</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-card-2 p-1 mb-5">
          <button
            onClick={() => setMode('read')}
            className={cn('py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all', mode === 'read' ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted')}
          >
            <BookOpen className="w-4 h-4" /> Read
          </button>
          <button
            onClick={() => setMode('verses')}
            className={cn('py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all', mode === 'verses' ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted')}
          >
            <ScrollText className="w-4 h-4" /> Prayer Verses
          </button>
          <button
            onClick={() => setMode('bookmarks')}
            className={cn('py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all', mode === 'bookmarks' ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted')}
          >
            <Bookmark className="w-4 h-4" /> Bookmarks
          </button>
        </div>

        {mode === 'read' ? <BibleReader /> : mode === 'verses' ? <BibleLibrary /> : <BookmarksPanel />}
      </main>
      <Footer />
    </>
  );
}
