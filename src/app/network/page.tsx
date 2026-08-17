'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import PartnerNetwork from '@/app/components/PartnerNetwork';

export default function NetworkPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <PartnerNetwork />
      </main>
      <Footer />
    </>
  );
}
