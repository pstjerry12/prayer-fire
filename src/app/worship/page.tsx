'use client';

import Link from 'next/link';
import { ChevronLeft, Music } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import WorshipPlayer from '@/app/components/WorshipPlayer';

export default function WorshipPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Praise & Worship</h1>
            <p className="text-xs text-ink-muted">Upload songs and play them during your worship session</p>
          </div>
        </div>
        <WorshipPlayer />
        <p className="text-center text-ink-faint text-xs mt-4">
          Songs are stored privately on your device. Use the ▶ Start-Up Prayer → Step 4 to play them during worship.
        </p>
      </main>
      <Footer />
    </>
  );
}
