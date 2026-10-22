'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ScrollText } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import PrayerVerseCard from '@/app/components/PrayerVerseCard';
import { KJV_BIBLE_CATEGORIES, KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';

/** All the verses of one Prayer Verses topic, on their own page. */
export default function TopicPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params.category ?? '');
  const category = KJV_BIBLE_CATEGORIES.find((c) => c.id === id);
  const verses = KJV_BIBLE_VERSES.filter((v) => v.category === id);

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Prayer Verses
        </button>

        {!category ? (
          <div className="bg-card rounded-2xl border border-edge p-8 text-center">
            <p className="text-ink-muted text-sm">That topic could not be found.</p>
            <button onClick={() => router.push('/bible')} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
              Back to the Bible
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-acc-soft flex items-center justify-center text-2xl">{category.icon}</div>
              <div>
                <h1 className="font-serif-heading text-2xl font-bold text-ink">{category.name}</h1>
                <p className="text-xs text-ink-muted flex items-center gap-1">
                  <ScrollText className="w-3.5 h-3.5" /> {verses.length} prayer verses
                </p>
              </div>
            </div>
            <p className="mb-4 text-[0.6875rem] text-ink-muted">Hold a verse for 2 seconds to copy or bookmark it</p>
            <div className="space-y-3">
              {verses.map((verse) => (
                <PrayerVerseCard key={verse.id} verse={verse} />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
