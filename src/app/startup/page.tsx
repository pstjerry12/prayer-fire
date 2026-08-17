'use client';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import StartUpPrayer from '@/app/components/StartUpPrayer';

export default function StartUpPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <StartUpPrayer />
      </main>
      <Footer />
    </>
  );
}
