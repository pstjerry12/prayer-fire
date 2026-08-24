'use client';

import { useState } from 'react';
import { HandHeart, Heart, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { openPaystack } from '@/lib/paystack';

type GiveCurrency = 'NGN' | 'USD';

export default function DonationCard() {
  const [expanded, setExpanded] = useState(false);
  const [currency, setCurrency] = useState<GiveCurrency>('NGN');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [paying, setPaying] = useState(false);

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const isTestMode = publicKey?.startsWith('pk_test_') ?? false;

  const handleDonate = async () => {
    const value = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setError('Please enter a donation amount.');
      return;
    }

    if (!publicKey) {
      setError(
        'Payment is not connected. NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing. Add it to Vercel env vars and redeploy.'
      );
      return;
    }

    setError('');
    setPaying(true);

    const amountInSmallestUnit = Math.round(value * 100);
    const donorEmail = email.trim() || 'donor@prayerfiremovement.com';

    console.log('[DonationCard] Opening Paystack with:', {
      key: publicKey.substring(0, 10) + '...',
      email: donorEmail,
      amount: amountInSmallestUnit,
      currency,
    });

    try {
      const opened = await openPaystack({
        key: publicKey,
        email: donorEmail,
        amount: amountInSmallestUnit,
        currency,
        name: name.trim() || 'Anonymous',
        onSuccess: (reference) => {
          fetch('/api/donations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim() || 'Anonymous',
              email: donorEmail,
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
          console.error('[DonationCard] Paystack error:', err);
          setError('Paystack error: ' + (err?.message || 'Unknown error'));
          setPaying(false);
        },
      });

      if (!opened) {
        setError('Could not open Paystack payment window. Please check your internet connection and try again.');
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
        {isTestMode && (
          <p className="text-amber-500 text-xs font-bold mb-4">
            🧪 Test payment — no real money was charged.
          </p>
        )}
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
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-amber-500 text-white text-[10px] font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          TEST MODE — No real money will be charged
        </div>
      )}

      {/* Collapsed header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <HandHeart className="w-4 h-4 text-[#ff6a00]" />
          <span className="text-[#ff6a00] text-[10px] font-bold uppercase tracking-wider">Support the Movement</span>
        </div>
        <p className="text-ink-muted text-xs leading-relaxed mb-4">
          Your gift fuels the global prayer movement — reaching nations and standing in the gap.
        </p>

        {!expanded && (
          <button
            onClick={() => { setExpanded(true); setError(''); }}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ff6a00] to-[#ff3d00] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4" /> Donate Now
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-edge px-4 pb-4">
          {/* Currency */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Choose currency</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setCurrency('NGN')}
                className={cn(
                  'py-2 rounded-lg border-2 text-sm font-bold transition-all',
                  currency === 'NGN'
                    ? 'border-[#ff6a00] bg-[#fff4ec] text-[#ff6a00] dark:bg-warn-soft dark:text-warn-strong'
                    : 'border-edge bg-card-2 text-ink-muted hover:border-edge-strong'
                )}
              >
                ₦ Naira
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={cn(
                  'py-2 rounded-lg border-2 text-sm font-bold transition-all',
                  currency === 'USD'
                    ? 'border-[#ff6a00] bg-[#fff4ec] text-[#ff6a00] dark:bg-warn-soft dark:text-warn-strong'
                    : 'border-edge bg-card-2 text-ink-muted hover:border-edge-strong'
                )}
              >
                $ Dollar
              </button>
            </div>

            {/* Amount — use type="tel" so mobile keyboard works properly */}
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Amount ({currency === 'NGN' ? '₦' : '$'})</label>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-muted pointer-events-none">
                {currency === 'NGN' ? '₦' : '$'}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={currency === 'NGN' ? 'e.g. 1000' : 'e.g. 10'}
                value={amount}
                onChange={(e) => {
                  // Only allow numbers and decimal point
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(val);
                  setError('');
                }}
                className="w-full bg-card border border-edge-strong rounded-lg pl-9 pr-3 py-3 text-base font-bold text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/40 focus:border-[#ff6a00]"
              />
            </div>
          </div>

          {/* Donor fields */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Name (optional)</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/40 focus:border-[#ff6a00]"
            />
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 mt-2.5">Email (optional)</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/40 focus:border-[#ff6a00]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-danger-soft text-danger border border-danger-edge rounded-lg px-3 py-2.5 text-xs mb-3">
              {error}
            </div>
          )}

          {/* Key status debug — shows whether Paystack key is loaded */}
          <div className="text-[9px] text-ink-faint mb-3 px-1">
            {publicKey
              ? `✅ Paystack key loaded (${isTestMode ? 'TEST' : 'LIVE'} mode)`
              : '❌ Paystack key NOT found — add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to Vercel'}
          </div>

          {/* No key warning */}
          {!publicKey && (
            <div className="bg-warn-soft text-warn-strong border border-warn-edge rounded-lg px-3 py-2.5 text-[11px] mb-3">
              ⚠️ Payment gateway not connected. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to Vercel env vars, then redeploy.
            </div>
          )}

          {/* Test card info */}
          {isTestMode && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-3 text-[11px] mb-3 text-amber-700 dark:text-amber-400 leading-relaxed">
              <p className="font-bold mb-1">🧪 Test Mode — Use this test card:</p>
              <p>Card: <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono">4084 0840 8408 4081</code></p>
              <p>PIN: <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono">408408</code></p>
              <p>OTP: <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono">123456</code></p>
              <p>Expiry: any future date · CVV: any 3 digits</p>
            </div>
          )}

          {/* Confirm Donation button */}
          <button
            onClick={handleDonate}
            disabled={paying || !publicKey}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all",
              publicKey
                ? "bg-gradient-to-r from-[#ff6a00] to-[#ff3d00] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                : "bg-gray-400 cursor-not-allowed"
            )}
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            {paying ? 'Opening payment…' : 'Confirm Donation'}
          </button>

          <button
            onClick={() => { setExpanded(false); setError(''); }}
            className="w-full mt-2 py-2.5 rounded-xl font-semibold text-sm text-ink-muted hover:text-ink flex items-center justify-center gap-1.5 transition-colors"
          >
            <ChevronUp className="w-4 h-4" /> Cancel
          </button>

          <p className="text-center text-ink-faint text-[10px] mt-2">
            {isTestMode ? '🧪 Paystack Test Mode' : 'Secure giving via Paystack'} · 100% supports the prayer movement
          </p>
        </div>
      )}
    </div>
  );
}
