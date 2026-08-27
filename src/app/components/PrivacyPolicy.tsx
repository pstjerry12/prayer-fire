'use client';

import { X, ShieldCheck } from 'lucide-react';
import { PRIVACY_SECTIONS } from '@/app/data/legal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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
            {PRIVACY_SECTIONS.map((s) => (
              <div key={s.title} className="space-y-1.5">
                <h3 className="text-acc-strong text-sm font-bold">{s.title}</h3>
                <p className="text-ink-soft text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
            <button
              onClick={onClose}
              className="w-full py-3 bg-card-3 text-ink-soft rounded-xl font-bold hover:bg-card-2 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
