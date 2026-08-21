'use client';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import StartUpPrayer from '@/app/components/StartUpPrayer';

export default function StartUpPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-10">
        <StartUpPrayer />
      </main>
      <Footer />
    </>
  );
}
