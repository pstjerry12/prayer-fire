'use client';

import { X, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your name, email address, and/or phone number (including your country dial code) together with a securely hashed password. Your prayer points, fasting plans, scripture favorites, and preferences are stored locally on your device by default.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your account details to authenticate you, personalise your experience, and keep your session secure. We do not sell your personal information to third parties.',
  },
  {
    title: '3. Passwords & Security',
    body: 'Passwords are hashed using bcrypt before being stored and are never kept in plain text. Authentication uses signed JSON Web Tokens (JWT) stored in secure, HTTP-only cookies, with a local backup for convenience.',
  },
  {
    title: '4. Local Data',
    body: 'Your prayers, schedules, and preferences are stored in your browser\u2019s local storage. Clearing your browser data will remove them. You can export or delete this data at any time from Account Settings.',
  },
  {
    title: '5. Your Rights',
    body: 'You may request to review, export, or delete your data at any time. Deleting your account removes your profile from our database and clears the data stored on your device.',
  },
  {
    title: '6. Contact',
    body: 'For privacy questions, please reach out to the Prayer Fire Movement team through the app\u2019s support channels.',
  },
];

export default function PrivacyPolicy({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-edge flex items-center justify-between sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-acc" />
              <h2 className="font-serif-heading text-lg font-bold text-ink">Privacy Policy</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <p className="text-ink-muted text-xs leading-relaxed">
              Your privacy matters to us. This policy explains how Prayer Fire Movement handles
              your information.
            </p>
            {SECTIONS.map((s) => (
              <div key={s.title} className="space-y-1.5">
                <h3 className="text-acc-strong text-sm font-bold">{s.title}</h3>
                <p className="text-ink-muted text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
            <button
              onClick={onClose}
              className="w-full py-3 bg-card-3 text-ink-soft rounded-xl font-bold hover:bg-card-3 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
