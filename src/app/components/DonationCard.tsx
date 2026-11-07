'use client';

import { useState, useEffect } from 'react';
import { HandHeart, Heart, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { openFlutterwave } from '@/lib/flutterwave';
import { useI18n } from '@/app/i18n';

type GiveCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR';

const ANONYMOUS_DONOR_EMAIL = 'donor@prayerfiremovement.com';

export default function DonationCard() {
  const { t, tr } = useI18n();
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
            <HandHeart className="w-5 h-5 text-acc-strong" />
            <span className="text-acc-strong text-xs font-bold uppercase tracking-wider">{t('donationCard.supportPrayerFire')}</span>
          </div>
          <div className="text-4xl mb-3">💝</div>
          <h3 className="font-serif-heading text-lg font-bold text-ink mb-2">{t('donationCard.donationsComingSoon')}</h3>
          <p className="text-ink-muted text-sm leading-relaxed mb-3">{t('donationCard.weAreSettingUpSecure')}</p>
          <p className="text-ink-faint text-xs leading-relaxed">
            {t('ui.meantime', { what: t('donationCard.writePrayersSetAlarmsTrack') })}
          </p>
        </div>
      </div>
    );
  }

  // ── Live Flutterwave is active — full donation form ──
  const handleDonate = async () => {
    const value = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setError(t('ui.pleaseEnterADonationAmount'));
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
          setError(t('ui.paymentWasNotCompletedYou'));
          setPaying(false);
        },
        onError: (err) => {
          console.error('[DonationCard] Flutterwave error:', err);
          setError(t('ui.flutterwaveError') + (err?.message || t('ui.unknownError')));
          setPaying(false);
        },
      });

      if (!opened) {
        setError(t('ui.couldNotOpenFlutterwavePayment'));
        setPaying(false);
      }
    } catch (err: any) {
      console.error('[DonationCard] Donation error:', err);
      setError('Error: ' + (err?.message || t('ui.somethingWentWrongPleaseTry')));
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
        <h2 className="font-serif-heading text-xl font-bold text-ink mb-2">{t('donationCard.thankYou')}</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-2">{t('donationCard.yourGenerousGiftKeepsThe')}</p>
        <button
          onClick={reset}
          className="w-full py-3 bg-card-3 text-ink-soft rounded-xl font-bold text-sm hover:bg-card-2 transition-all"
        >{t('donationCard.makeAnotherDonation')}</button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      {/* Live/test mode indicator */}
      <div className={cn(
        'text-on-acc text-[0.625rem] font-bold text-center py-1.5 px-3 flex items-center justify-center gap-1.5',
        isLiveMode ? 'bg-acc' : 'bg-acc'
      )}>
        {isLiveMode ? '🔒 Secure giving via Flutterwave (Live)' : '🧪 Test mode — no real money moves'}
      </div>

      {/* Header */}
      <div className="p-4">
        <h3 className="font-serif-heading text-base font-bold text-ink">{t('donationCard.partnerWithUs')}</h3>
        <p className="text-ink-muted text-xs mt-0.5 mb-4">{t('donationCard.keptFreeByPeopleLike')}</p>

        <button
          onClick={() => { setExpanded((v) => !v); setError(''); }}
          aria-expanded={expanded}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-acc-strong bg-transparent border border-acc/40 hover:bg-acc-soft transition-colors flex items-center justify-center gap-2"
        >
          {t('donationCard.support')}
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', expanded && 'rotate-180')} />
        </button>
      </div>

      {/* Expanding give panel */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '480px' : '0px' }}
      >
        <div className="border-t border-edge px-4 pt-4 pb-4">
          <p className="text-ink-muted text-xs leading-relaxed mb-4">{t('donationCard.yourVoluntaryGiftsHelpRevive')}</p>

          {/* Currency */}
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('donationCard.currency')}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as GiveCurrency)}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink mb-3 focus:outline-none focus:ring-2 focus:ring-acc/40 focus:border-acc"
          >
            <option value="NGN">{t('donationCard.ngnNaira')}</option>
            <option value="USD">{t('donationCard.usdDollar')}</option>
            <option value="GBP">{t('donationCard.gbpPound')}</option>
            <option value="EUR">{t('donationCard.eurEuro')}</option>
          </select>

          {/* Amount */}
          <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('donationCard.amount')}</label>
          <input
            type="tel"
            inputMode="decimal"
            placeholder={t('donationCard.enterAnyAmount')}
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '');
              setAmount(val);
              setError('');
            }}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-3 text-base font-bold text-ink placeholder-ink-faint mb-4 focus:outline-none focus:ring-2 focus:ring-acc/40 focus:border-acc"
          />

          {/* Error */}
          {error && (
            <div className="bg-danger-soft text-danger border border-danger-edge rounded-lg px-3 py-2.5 text-xs mb-3">
              {tr(error)}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleDonate}
            disabled={paying}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-on-acc bg-acc hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            {paying ? t('ui.openingPayment') : 'Continue'}
          </button>

          <p className="text-center text-ink-faint text-[0.625rem] mt-2">{t('donationCard.secureGivingViaFlutterwave100')}</p>
        </div>
      </div>
    </div>
  );
}
