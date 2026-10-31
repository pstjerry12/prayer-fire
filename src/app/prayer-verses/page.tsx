'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import BibleLibrary from '@/app/components/BibleLibrary';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { migrateLegacyFavorites } from '@/lib/study';

/** Prayer Verses on their own page (they used to be a tab on the Bible page). Reached from a tile on the home screen. */
export default function PrayerVersesPage() {
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
        <BibleLibrary />
      </main>
      <Footer />
    </>
  );
}
