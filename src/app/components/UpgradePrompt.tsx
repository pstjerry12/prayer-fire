'use client';

import { Crown, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context';
import { GATE_MESSAGES } from '@/lib/tiers';

const PARTNER_EXTRAS = [
  'Join prayer groups and the Partner Network',
  'Back up and sync My Study across phones',
  'Unlimited reminders, sermon notes and worship songs',
  'The 21-day and 40-day fasting plans',
];

/**
 * The friendly stop shown when someone on Free reaches a limit (a fourth reminder, a longer fast ...). It says what
 * they reached and what Partner adds, and takes them to the plans page. Nothing is bought here.
 */
export default function UpgradePrompt() {
  const { upgradePrompt, closeUpgradePrompt } = useApp();
  const router = useRouter();
  if (!upgradePrompt) return null;
  const msg = GATE_MESSAGES[upgradePrompt];

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={msg.title} data-testid="upgrade-prompt">
      <button aria-label="Close" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={closeUpgradePrompt} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border border-edge shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acc-soft text-acc-strong"><Crown className="w-5 h-5" /></span>
            <h2 className="font-serif-heading text-lg font-bold text-ink leading-tight">{msg.title}</h2>
          </div>
          <button onClick={closeUpgradePrompt} aria-label="Close" className="p-1.5 rounded-full text-ink-muted hover:bg-card-3"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">{msg.body}</p>
        <div className="rounded-2xl bg-acc-soft border border-acc-edge p-3">
          <p className="text-acc-strong text-[0.6875rem] font-bold uppercase tracking-wider mb-2">Prayer Fire Partner adds</p>
          <ul className="space-y-1.5">
            {PARTNER_EXTRAS.map((x) => (
              <li key={x} className="flex items-start gap-2 text-ink-soft text-xs"><Check className="w-3.5 h-3.5 text-acc-strong mt-0.5 shrink-0" /> {x}</li>
            ))}
          </ul>
          <p className="text-ink-muted text-[0.6875rem] mt-2">Start with a 7-day free trial. Cancel any time.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { closeUpgradePrompt(); router.push('/partner'); }}
            className="flex-1 py-3 rounded-xl bg-acc text-on-acc font-bold text-sm hover:bg-acc-hover"
          >
            See Partner
          </button>
          <button onClick={closeUpgradePrompt} className="px-5 py-3 rounded-xl border border-edge-strong text-ink-soft font-bold text-sm hover:bg-card-2">Not now</button>
        </div>
      </div>
    </div>
  );
}
