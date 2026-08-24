import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { TERMS_SECTIONS } from '@/app/data/legal';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <FileText className="w-6 h-6 text-acc" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Terms of Service</h1>
            <p className="text-xs text-ink-muted">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="space-y-5">
          {TERMS_SECTIONS.map((s) => (
            <div key={s.title} className="bg-card rounded-2xl border border-edge p-5">
              <h2 className="font-serif-heading text-base font-bold text-ink">{s.title}</h2>
              <p className="text-ink-soft text-sm leading-relaxed mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
