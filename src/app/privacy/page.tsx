import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import LegalSections from '@/app/components/LegalSections';
import { CONTACT_EMAIL, DELETE_ACCOUNT_PATH, LEGAL_UPDATED, PRIVACY_SECTIONS } from '@/app/data/legal';

export const metadata = { title: 'Privacy Policy | Prayer Fire' };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-acc-strong" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Privacy Policy: Prayer Fire</h1>
            <p className="text-xs text-ink-muted">Last updated: {LEGAL_UPDATED}</p>
          </div>
        </div>

        <p className="text-ink-soft text-sm leading-relaxed mt-4 mb-5">
          Prayer Fire respects your privacy. This policy explains what information we collect, why, who we share it with, how long we keep
          it and the rights you have, including under the Nigeria Data Protection Act 2023. Questions: {CONTACT_EMAIL}.{' '}
          <Link href={DELETE_ACCOUNT_PATH} className="text-acc-strong font-semibold underline">How to delete your account</Link>.
        </p>

        <LegalSections sections={PRIVACY_SECTIONS} />
      </main>
      <Footer />
    </>
  );
}
