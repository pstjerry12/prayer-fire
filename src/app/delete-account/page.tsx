'use client';

import Link from 'next/link';
import { ChevronLeft, Trash2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useApp } from '@/app/context';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/app/data/legal';

/**
 * Delete your Prayer Fire account from the web (the address Google Play asks for), without needing the Android app.
 * Public page: anyone can read it. Signed-in people can delete right here; others sign in first, or email us.
 */
export default function DeleteAccountPage() {
  const { user, authChecked, deleteAccount, setShowAuth } = useApp();
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-danger-soft flex items-center justify-center"><Trash2 className="w-6 h-6 text-danger" /></div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Delete your Prayer Fire account</h1>
            <p className="text-xs text-ink-muted">Last updated: {LEGAL_UPDATED}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-edge p-5 space-y-3">
          <h2 className="font-serif-heading text-base font-bold text-ink">What gets deleted</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-soft text-sm leading-relaxed">
            <li>Your profile: name, email, phone and password.</li>
            <li>Your online backups: sermon notes, bookmarks and highlights, and intercessory prayers.</li>
            <li>Your prayer-group memberships, posts, comments, &quot;I&apos;m praying&quot; marks and check-ins, and the groups you lead (with their content).</li>
            <li>Your Global Prayer Alert taps and altar requests, your app-activity record and your reports.</li>
            <li>The link between your account and any feedback you sent (the message itself may stay, anonymously).</li>
            <li>The data saved on the phone or browser you delete from.</li>
          </ul>
          <p className="text-ink-soft text-sm leading-relaxed">
            <strong>This cannot be undone.</strong> A Google Play subscription is not cancelled by deleting your account: cancel it in Google
            Play (Payments &amp; subscriptions, Subscriptions, Prayer Fire) so you are not charged again. Records we must keep for billing or
            legal reasons may be kept for as long as the law requires.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-edge p-5 mt-4 space-y-3" data-testid="delete-box">
          {!authChecked ? (
            <p className="text-ink-muted text-sm">Checking your sign-in...</p>
          ) : user ? (
            <>
              <p className="text-ink-soft text-sm">You are signed in as <strong>{user.email || user.phone || user.name}</strong>.</p>
              <button onClick={deleteAccount} className="w-full py-3 rounded-xl bg-danger text-white font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete my account and data
              </button>
              <p className="text-ink-faint text-xs">You will be asked to confirm.</p>
            </>
          ) : (
            <>
              <p className="text-ink-soft text-sm">Sign in to the account you want to delete. You will then see the delete button here.</p>
              <button onClick={() => setShowAuth(true)} className="w-full py-3 rounded-xl bg-acc text-on-acc font-bold text-sm hover:bg-acc-hover">Sign in</button>
            </>
          )}
          <p className="text-ink-muted text-xs leading-relaxed">
            Cannot sign in? Email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20Prayer%20Fire%20account`} className="text-acc-strong font-semibold underline">{CONTACT_EMAIL}</a> from the
            address (or tell us the phone number) on your account, with the subject &quot;Delete my Prayer Fire account&quot;. We delete it within 30 days.
          </p>
        </div>

        <p className="text-ink-muted text-xs mt-5 text-center">
          <Link href="/privacy" className="text-acc-strong font-semibold underline">Privacy Policy</Link> ·{' '}
          <Link href="/terms" className="text-acc-strong font-semibold underline">Terms of Service</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
