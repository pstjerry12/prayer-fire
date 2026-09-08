import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const CONTACT_EMAIL = 'prayerfiremovemnt@gmail.com';

interface PrivacySection {
  title: string;
  intro?: string;
  bullets?: string[];
}

const SECTIONS: PrivacySection[] = [
  {
    title: 'Information We Collect',
    bullets: [
      'Testimonies: If you submit a testimony, we collect the text you provide and, optionally, your name and location. You may choose to submit anonymously.',
      'Prayer requests: Intercessory prayer points you create are stored to display within your own prayer sessions.',
      'Account information: If you create an account, we collect your email address for authentication purposes.',
      'Payment information: If you choose to give voluntarily, payments are processed securely through Flutterwave. We do not store your card details — Flutterwave handles all payment data according to their own security standards.',
      'Device permissions: The app may request permission to schedule notifications/alarms for your daily prayer reminders. This is used solely to deliver prayer time alerts and is not shared with third parties.',
    ],
  },
  {
    title: 'How We Use Your Information',
    bullets: [
      "To display testimonies and prayer points within the app",
      "To send prayer time reminders you've scheduled",
      'To process voluntary donations',
      "To improve the app's features and content",
    ],
  },
  {
    title: 'Data Sharing',
    intro:
      'We do not sell or share your personal information with third parties, except as necessary to process payments (via Flutterwave) or as required by law.',
  },
  {
    title: 'Data Retention',
    intro: `Testimonies and prayer points remain stored until you request their removal. Contact us at ${CONTACT_EMAIL} to request deletion of your data.`,
  },
  {
    title: "Children's Privacy",
    intro:
      'This app is not directed at children under 13, and we do not knowingly collect data from children under 13.',
  },
  {
    title: 'Changes to This Policy',
    intro:
      'We may update this policy from time to time. Changes will be posted on this page with an updated "Last updated" date.',
  },
  {
    title: 'Contact Us',
    intro: `If you have questions about this privacy policy, contact us at ${CONTACT_EMAIL}.`,
  },
];

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-acc" />
          </div>
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-ink">Privacy Policy — Prayer Fire Movement</h1>
            <p className="text-xs text-ink-muted">Last updated: {lastUpdated}</p>
          </div>
        </div>

        <p className="text-ink-soft text-sm leading-relaxed mt-4 mb-5">
          Prayer Fire Movement (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the app&rdquo;) respects your privacy.
          This policy explains what information we collect and how we use it.
        </p>

        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.title} className="bg-card rounded-2xl border border-edge p-5">
              <h2 className="font-serif-heading text-base font-bold text-ink">{s.title}</h2>
              {s.intro && <p className="text-ink-soft text-sm leading-relaxed mt-2">{s.intro}</p>}
              {s.bullets && (
                <ul className="mt-2 space-y-1.5 list-disc pl-5">
                  {s.bullets.map((b) => (
                    <li key={b} className="text-ink-soft text-sm leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
