'use client';

import Link from 'next/link';
import { ChevronLeft, Flame } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import PrayerWorkshop from '@/app/components/PrayerWorkshop';

export default function WorkshopPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Write Your Prayer Point</h1>
            <p className="text-xs text-ink-muted">Prayer Workshop</p>
          </div>
        </div>
        <PrayerWorkshop />
      </main>
      <Footer />
    </>
  );
}
