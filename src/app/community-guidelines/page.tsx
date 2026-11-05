import Link from 'next/link';
import { ChevronLeft, HeartHandshake } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import LegalSections from '@/app/components/LegalSections';
import { COMMUNITY_SECTIONS, LEGAL_UPDATED } from '@/app/data/legal';

export const metadata = { title: 'Community Guidelines | Prayer Fire' };

export default function CommunityGuidelinesPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <HeartHandshake className="w-6 h-6 text-acc-strong" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Community Guidelines</h1>
            <p className="text-xs text-ink-muted">Last updated: {LEGAL_UPDATED}</p>
          </div>
        </div>
        <LegalSections sections={COMMUNITY_SECTIONS} />
        <p className="text-ink-muted text-xs mt-5 text-center">
          See also our <Link href="/terms" className="text-acc-strong font-semibold underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-acc-strong font-semibold underline">Privacy Policy</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
