'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import ScriptureVault from '@/app/components/ScriptureVault';
import WisdomSection from '@/app/components/WisdomSection';

export default function ScripturePage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <ScriptureVault />
        <WisdomSection />
      </main>
      <Footer />
    </>
  );
}
