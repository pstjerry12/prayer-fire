'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { PRICING_PLANS } from '../data/pricingPlans';
import { useApp } from '../context';
import {
  billingConfigured,
  loadPartnerOptions,
  openManageSubscription,
  purchasePartner,
  restorePurchases,
  syncBillingUser,
  syncSubscriptionWithServer,
  type PartnerOption,
} from '@/lib/playBilling';

const PARTNER = PRICING_PLANS.find((p) => p.id === 'partner');

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * The subscription screen of the Android app: Prayer Fire Partner, bought ONLY through Google Play.
 * There is deliberately no other payment button, link or wording here.
 */
export default function PlaySubscription() {
  const { user, subscription, refreshSubscription, setShowAuth } = useApp();
  const [options, setOptions] = useState<PartnerOption[] | null>(null);
  const [problem, setProblem] = useState<'not-configured' | 'unavailable' | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    setOptions(null);
    setProblem(null);
    if (userId) await syncBillingUser(userId);
    const result = await loadPartnerOptions();
    if (result.ok) setOptions(result.options);
    else setProblem(result.reason);
  }, [userId]);

  useEffect(() => {
    if (!userId || !billingConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (userId) setProblem('not-configured');
      return;
    }
    load();
  }, [userId, load]);

  // After a purchase the server may need a moment: ask it, and keep asking briefly until Partner shows.
  async function activate(): Promise<boolean> {
    for (let i = 0; i < 6; i++) {
      const synced = await syncSubscriptionWithServer();
      if (synced && synced !== 'error') {
        await refreshSubscription();
        return true;
      }
      const latest = await refreshSubscription();
      if (latest) return true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  async function buy() {
    const option = options?.find((o) => o.kind === billing);
    if (!option) return;
    setBusy('buy');
    setMessage(null);
    const result = await purchasePartner(option.id);
    if (result.status === 'purchased') {
      const ok = await activate();
      setMessage(ok ? 'Thank you! Prayer Fire Partner is now active.' : 'Your purchase went through. Partner is being activated; if it does not appear in a minute, tap Restore purchases.');
    } else if (result.status === 'error') {
      setMessage(result.message);
    }
    setBusy(null);
  }

  async function restore() {
    setBusy('restore');
    setMessage(null);
    const result = await restorePurchases();
    if (result.status === 'error') {
      setMessage(result.message);
    } else {
      const ok = await activate();
      setMessage(ok ? 'Your subscription has been restored.' : 'No active subscription was found for this Google account.');
    }
    setBusy(null);
  }

  const selected = options?.find((o) => o.kind === billing) ?? null;
  const hasBoth = !!options?.some((o) => o.kind === 'monthly') && !!options?.some((o) => o.kind === 'yearly');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500 bg-acc-soft/50 p-5">
        <span className="mb-3 inline-flex items-center gap-1 bg-emerald-600 text-white text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" /> PRAYER FIRE PARTNER
        </span>
        <h3 className="text-ink font-bold">{PARTNER?.name ?? 'Prayer Fire Partner'}</h3>
        <p className="text-ink-muted text-xs mt-1 mb-3">{PARTNER?.tagline}</p>
        <ul className="space-y-2">
          {(PARTNER?.features ?? []).map((f) => (
            <li key={f} className="flex items-start gap-2 text-ink-muted text-xs">
              <Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {subscription ? (
        <div className="rounded-2xl border border-acc-edge bg-card p-5 text-center">
          <div className="text-3xl mb-2">👑</div>
          <h4 className="text-acc-strong font-bold">You are a Prayer Fire Partner</h4>
          <p className="text-ink-muted text-sm mt-1">
            {subscription.isTrial ? 'Your free trial is active' : 'Your subscription is active'}
            {subscription.expiresAt
              ? subscription.willRenew
                ? `, and renews on ${formatDate(subscription.expiresAt)}.`
                : `, and ends on ${formatDate(subscription.expiresAt)}.`
              : '.'}
          </p>
        </div>
      ) : !userId ? (
        <div className="rounded-2xl border border-edge bg-card p-5 text-center">
          <p className="text-ink-muted text-sm mb-3">Sign in to subscribe, so your subscription follows you to any phone.</p>
          <button onClick={() => setShowAuth(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
            Sign in
          </button>
        </div>
      ) : problem ? (
        <div className="rounded-2xl border border-edge bg-card p-5 text-center">
          <p className="text-ink-muted text-sm mb-3">
            {problem === 'not-configured' ? 'Subscriptions are not available in this version yet.' : 'We could not load the subscription options. Check your connection and try again.'}
          </p>
          {problem === 'unavailable' && (
            <button onClick={load} className="px-4 py-2 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold">
              Try again
            </button>
          )}
        </div>
      ) : !options ? (
        <div className="flex justify-center py-6 text-ink-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-edge bg-card p-5 space-y-4">
          {hasBoth && (
            <div className="flex bg-card-3 rounded-lg p-1">
              {(['monthly', 'yearly'] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setBilling(kind)}
                  className={cn('flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all', billing === kind ? 'bg-emerald-600 text-white' : 'text-ink-muted')}
                >
                  {kind === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">
                {selected.priceString}
                <span className="text-ink-muted text-sm font-medium"> / {selected.kind === 'monthly' ? 'month' : 'year'}</span>
              </div>
              {selected.freeTrialDays && (
                <p className="text-emerald-600 text-sm font-semibold mt-1">Start with a {selected.freeTrialDays}-day free trial</p>
              )}
            </div>
          )}
          <button
            onClick={buy}
            disabled={busy !== null || !selected}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy === 'buy' && <Loader2 className="w-4 h-4 animate-spin" />}
            {selected?.freeTrialDays ? 'Start free trial' : 'Subscribe'}
          </button>
          <p className="text-ink-faint text-[0.6875rem] leading-relaxed text-center">
            Payment is charged to your Google Play account{selected?.freeTrialDays ? ' when the free trial ends' : ' when you confirm'}. The subscription renews
            automatically until you cancel it, any time, in Google Play: Payments &amp; subscriptions → Subscriptions.
          </p>
        </div>
      )}

      {message && (
        <p role="status" className="text-center text-sm text-ink-soft bg-card-2 border border-edge rounded-xl p-3">
          {message}
        </p>
      )}

      {userId && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={restore}
            disabled={busy !== null}
            className="flex-1 py-2.5 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold hover:bg-card-2 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy === 'restore' && <Loader2 className="w-4 h-4 animate-spin" />}
            Restore purchases
          </button>
          <button
            onClick={() => openManageSubscription()}
            className="flex-1 py-2.5 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold hover:bg-card-2"
          >
            Manage subscription
          </button>
        </div>
      )}
    </div>
  );
}
