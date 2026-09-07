'use client';

import { useState, useEffect } from 'react';
import { HandHeart, Heart, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { openFlutterwave } from '@/lib/flutterwave';

type GiveCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR';

const ANONYMOUS_DONOR_EMAIL = 'donor@prayerfiremovement.com';

export default function DonationCard() {
  const [expanded, setExpanded] = useState(false);
  const [currency, setCurrency] = useState<GiveCurrency>('NGN');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [paying, setPaying] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Fetch active Flutterwave key from API (DB setting overrides env var)
  useEffect(() => {
    fetch('/api/flutterwave-config').then(r => r.json()).then(data => {
      if (data.publicKey) {
        setPublicKey(data.publicKey);
        setIsLiveMode(data.isLive);
      }
    }).catch(() => {});
  }, []);

  // ── If no key (test or live) is configured, show Coming Soon state ──
  if (!publicKey) {
    return (
      <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HandHeart className="w-5 h-5 text-[#ff6a00]" />
            <span className="text-[#ff6a00] text-xs font-bold uppercase tracking-wider">Support the Movement</span>
          </div>
          <div className="text-4xl mb-3">💝</div>
          <h3 className="font-serif-heading text-lg font-bold text-ink mb-2">
            Donations Coming Soon
          </h3>
          <p className="text-ink-muted text-sm leading-relaxed mb-3">
            We are setting up secure payments through Flutterwave. Once approved, you will be able to give and support the global prayer movement.
          </p>
          <p className="text-ink-faint text-xs leading-relaxed">
            In the meantime, you can still <strong className="text-ink-soft">write prayers, set alarms, track fasting, and use every feature</strong> of the app. The fire doesn&apos;t wait! 🔥
          </p>
        </div>
      </div>
    );
  }

  // ── Live Flutterwave is active — full donation form ──
  const handleDonate = async () => {
    const value = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setError('Please enter a donation amount.');
      return;
    }

    if (!publicKey) {
      setError(
        'Payment is not connected. Add your Flutterwave public key in the admin Settings tab, or set NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY in Vercel env vars.'
      );
      return;
    }

    setError('');
    setPaying(true);

    // Flutterwave expects the actual amount (e.g. 1000 for ₦1000).
    // The DB/donations API stores amounts multiplied by 100 for consistency
    // with the previous Paystack (kobo) records.
    const amountInSmallestUnit = Math.round(value * 100);

    try {
      const opened = await openFlutterwave({
        key: publicKey,
        email: ANONYMOUS_DONOR_EMAIL,
        amount: value,
        currency,
        name: 'Anonymous',
        onSuccess: (reference) => {
          fetch('/api/donations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Anonymous',
              email: ANONYMOUS_DONOR_EMAIL,
              amount: amountInSmallestUnit,
              currency,
              reference,
            }),
          }).catch(() => {});
          setDone(true);
          setPaying(false);
        },
        onCancel: () => {
          setError('Payment was not completed. You can try again.');
          setPaying(false);
        },
        onError: (err) => {
          console.error('[DonationCard] Flutterwave error:', err);
          setError('Flutterwave error: ' + (err?.message || 'Unknown error'));
          setPaying(false);
        },
      });

      if (!opened) {
        setError('Could not open Flutterwave payment window. Please check your internet connection and try again.');
        setPaying(false);
      }
    } catch (err: any) {
      console.error('[DonationCard] Donation error:', err);
      setError('Error: ' + (err?.message || 'Something went wrong. Please try again.'));
      setPaying(false);
    }
  };

  const reset = () => {
    setDone(false);
    setAmount('');
    setError('');
    setExpanded(false);
  };

  if (done) {
    return (
      <div className="bg-card rounded-2xl p-6 text-center border border-acc-edge shadow-sm">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="font-serif-heading text-xl font-bold text-ink mb-2">Thank You!</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-2">
          Your generous gift keeps the fire burning. Together we are curing prayerlessness
          around the world — one prayer, three times a day.
        </p>
        <button
          onClick={reset}
          className="w-full py-3 bg-card-3 text-ink-soft rounded-xl font-bold text-sm hover:bg-card-2 transition-all"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      {/* Live/test mode indicator */}
      <div className={cn(
        'text-white text-[10px] font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1.5',
        isLiveMode ? 'bg-emerald-600' : 'bg-amber-600'
      )}>
        {isLiveMode ? '🔒 Secure giving via Flutterwave (Live)' : '🧪 Test mode — no real money moves'}
      </div>

      {/* Header */}
      <div className="p-4">
        <h3 className="font-serif-heading text-base font-bold text-ink">Partner With Us</h3>
        <p className="text-ink-muted text-xs mt-0.5 mb-4">Kept free by people like you</p>

        <button
          onClick={() => { setExpanded((v) => !v); setError(''); }}
          aria-expanded={expanded}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-[#ff6a00] bg-transparent border border-[#ff6a00]/40 hover:bg-[#ff6a00]/5 transition-colors flex items-center justify-center gap-2"
        >
          Give
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', expanded && 'rotate-180')} />
        </button>
      </div>

      {/* Expanding give panel */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '480px' : '0px' }}
      >
        <div className="border-t border-edge px-4 pt-4 pb-4">
          <p className="text-ink-muted text-xs leading-relaxed mb-4">
            Your voluntary gifts help revive prayer among Christians worldwide.
          </p>

          {/* Currency */}
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as GiveCurrency)}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink mb-3 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/40 focus:border-[#ff6a00]"
          >
            <option value="NGN">NGN — Naira</option>
            <option value="USD">USD — Dollar</option>
            <option value="GBP">GBP — Pound</option>
            <option value="EUR">EUR — Euro</option>
          </select>

          {/* Amount */}
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">Amount</label>
          <input
            type="tel"
            inputMode="decimal"
            placeholder="Enter any amount"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '');
              setAmount(val);
              setError('');
            }}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-3 text-base font-bold text-ink placeholder-ink-faint mb-4 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/40 focus:border-[#ff6a00]"
          />

          {/* Error */}
          {error && (
            <div className="bg-danger-soft text-danger border border-danger-edge rounded-lg px-3 py-2.5 text-xs mb-3">
              {error}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleDonate}
            disabled={paying}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ff6a00] to-[#ff3d00] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            {paying ? 'Opening payment…' : 'Continue'}
          </button>

          <p className="text-center text-ink-faint text-[10px] mt-2">
            Secure giving via Flutterwave · 100% supports the prayer movement
          </p>
        </div>
      </div>
    </div>
  );
}
