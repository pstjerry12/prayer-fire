'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import BibleReader from '@/app/components/BibleReader';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { migrateLegacyFavorites } from '@/lib/study';

/** The Bible: search, translation, then Book › Chapters › Verses. Prayer Verses and My Study have their own pages on the home screen. */
export default function BiblePage() {
  useEffect(() => {
    migrateLegacyFavorites(KJV_BIBLE_VERSES);
  }, []);

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
            <p className="text-xs text-ink-muted">Read or listen</p>
          </div>
        </div>

        <BibleReader />
      </main>
      <Footer />
    </>
  );
}
