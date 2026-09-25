'use client';

import { X, Sparkles } from 'lucide-react';
import { LATEST_RELEASE } from '../data/whatsNew';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: Props) {
  if (!isOpen || !LATEST_RELEASE) return null;
  const release = LATEST_RELEASE;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-acc" />
              <h2 className="font-bold text-ink">What&apos;s New</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-acc text-xs font-bold uppercase tracking-wider">App updated &middot; {release.date}</p>
              <h3 className="font-serif-heading text-lg font-bold text-ink mt-1">{release.title}</h3>
            </div>
            <ul className="space-y-3">
              {release.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 bg-card-2 rounded-xl p-3 border border-edge">
                  <span className="text-xl leading-none shrink-0" aria-hidden>{item.emoji}</span>
                  <p className="text-ink-soft text-sm leading-relaxed">{item.text}</p>
                </li>
              ))}
            </ul>
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all"
            >
              Got it 🙏
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
