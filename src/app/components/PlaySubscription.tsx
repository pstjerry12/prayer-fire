'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { PRICING_PLANS } from '../data/pricingPlans';
import { useApp } from '../context';
import type { SubscriptionTier } from '@/app/types';
import { statusNotice } from '@/lib/subscriptionRules';
import {
  billingConfigured,
  loadPlanOptions,
  openManageSubscription,
  purchasePlan,
  restorePurchases,
  syncBillingUser,
  syncSubscriptionWithServer,
  type BillingKind,
  type PlanOption,
} from '@/lib/playBilling';

const PLAN_INFO: Record<SubscriptionTier, { name: string; tagline: string; features: string[] }> = {
  partner: pick('partner'),
  leader: pick('leader'),
};

function pick(id: string) {
  const plan = PRICING_PLANS.find((p) => p.id === id);
  return { name: plan?.name ?? id, tagline: plan?.tagline ?? '', features: plan?.features ?? [] };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * The subscription screen of the Android app: Prayer Fire Partner and Leader, bought ONLY through Google Play.
 * There is deliberately no other payment button, link or wording here. Prices, currency and the free-trial
 * wording are whatever Google Play returns for this person.
 */
export default function PlaySubscription() {
  const { user, subscription, refreshSubscription, setShowAuth } = useApp();
  const [options, setOptions] = useState<PlanOption[] | null>(null);
  const [problem, setProblem] = useState<'not-configured' | 'unavailable' | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>('partner');
  const [kind, setKind] = useState<BillingKind>('yearly'); // yearly first: it is the better deal
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    setOptions(null);
    setProblem(null);
    if (userId) await syncBillingUser(userId);
    const result = await loadPlanOptions();
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

  // Start on the plan the person already has, so "Manage" and "Upgrade" make sense.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (subscription) setTier(subscription.tier);
  }, [subscription]);

  // After a purchase the server may need a moment: ask it, and keep asking briefly until the plan shows.
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

  const available = (t: SubscriptionTier) => !!options?.some((o) => o.tier === t);
  const selected = options?.find((o) => o.tier === tier && o.kind === kind) ?? null;
  const hasBoth = (t: SubscriptionTier) => !!options?.some((o) => o.tier === t && o.kind === 'monthly') && !!options?.some((o) => o.tier === t && o.kind === 'yearly');
  const sameAsCurrent = !!subscription && !!selected && subscription.tier === selected.tier && !!subscription.basePlanId && selected.productId.endsWith(`:${subscription.basePlanId}`);
  const isUpgrade = !!subscription && subscription.tier === 'partner' && tier === 'leader';
  const isDowngrade = !!subscription && subscription.tier === 'leader' && tier === 'partner';

  async function buy() {
    if (!selected) return;
    setBusy('buy');
    setMessage(null);
    const result = await purchasePlan(selected, subscription);
    if (result.status === 'purchased') {
      const ok = await activate();
      setMessage(
        ok
          ? isDowngrade
            ? 'Done. Your plan changes to Partner at your next renewal.'
            : `Thank you! Prayer Fire ${PLAN_INFO[selected.tier].name.replace('Prayer Fire ', '')} is now active.`
          : 'Your purchase went through. It is being activated; if it does not appear in a minute, tap Restore purchases.'
      );
    } else if (result.status === 'pending' || result.status === 'error') {
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

  const info = PLAN_INFO[tier];
  const notice = subscription ? statusNotice(subscription) : null;
  const buttonLabel = sameAsCurrent
    ? 'This is your current plan'
    : isUpgrade
      ? 'Upgrade to Leader'
      : isDowngrade
        ? 'Switch to Partner at renewal'
        : selected?.freeTrialDays
          ? 'Start free trial'
          : 'Subscribe';

  return (
    <div className="space-y-4">
      {subscription && (
        <div className="rounded-2xl border border-acc-edge bg-card p-5 text-center">
          <div className="text-3xl mb-2">{subscription.tier === 'leader' ? '🔥' : '👑'}</div>
          <h4 className="text-acc-strong font-bold">You are a Prayer Fire {subscription.tier === 'leader' ? 'Leader' : 'Partner'}</h4>
          <p className="text-ink-muted text-sm mt-1">
            {subscription.isTrial ? 'Your free trial is active' : 'Your subscription is active'}
            {subscription.expiresAt
              ? subscription.willRenew
                ? `, and renews on ${formatDate(subscription.expiresAt)}.`
                : `, and ends on ${formatDate(subscription.expiresAt)}.`
              : '.'}
          </p>
          {notice && <p className="mt-3 rounded-xl bg-acc-soft border border-acc-edge text-acc-strong text-xs p-3">{notice}</p>}
        </div>
      )}

      {/* Plan chooser */}
      {options && (
        <div className="flex bg-card-3 rounded-lg p-1" role="tablist" aria-label="Plan">
          {(['partner', 'leader'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tier === t}
              disabled={!available(t)}
              onClick={() => setTier(t)}
              className={cn('flex-1 px-3 py-2 rounded-md text-sm font-bold transition-all disabled:opacity-40', tier === t ? 'bg-acc text-on-acc' : 'text-ink-muted')}
            >
              {t === 'partner' ? 'Partner' : 'Leader'}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-acc bg-acc-soft/50 p-5">
        <span className="mb-3 inline-flex items-center gap-1 bg-acc text-on-acc text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" /> {tier === 'leader' ? 'FIRE PARTNER LEADER' : 'PRAYER FIRE PARTNER'}
        </span>
        <h3 className="text-ink font-bold">{info.name}</h3>
        <p className="text-ink-muted text-xs mt-1 mb-3">{info.tagline}</p>
        <ul className="space-y-2">
          {info.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-ink-muted text-xs">
              <Check className="w-3.5 h-3.5 text-acc-strong mt-0.5 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {!userId ? (
        <div className="rounded-2xl border border-edge bg-card p-5 text-center">
          <p className="text-ink-muted text-sm mb-3">Sign in to subscribe, so your subscription follows you to any phone.</p>
          <button onClick={() => setShowAuth(true)} className="px-4 py-2.5 rounded-xl bg-acc text-on-acc text-sm font-bold">
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
          {hasBoth(tier) && (
            <div className="flex bg-card-3 rounded-lg p-1" role="tablist" aria-label="Billing period">
              <button
                role="tab"
                aria-selected={kind === 'yearly'}
                onClick={() => setKind('yearly')}
                className={cn('flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5', kind === 'yearly' ? 'bg-acc text-on-acc' : 'text-ink-muted')}
              >
                Yearly
                <span className={cn('text-[0.625rem] font-extrabold rounded-full px-1.5 py-0.5', kind === 'yearly' ? 'bg-white/25 text-white' : 'bg-acc-soft-2 text-acc-strong')}>2 months free</span>
              </button>
              <button
                role="tab"
                aria-selected={kind === 'monthly'}
                onClick={() => setKind('monthly')}
                className={cn('flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all', kind === 'monthly' ? 'bg-acc text-on-acc' : 'text-ink-muted')}
              >
                Monthly
              </button>
            </div>
          )}
          {selected && (
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">
                {selected.priceString}
                <span className="text-ink-muted text-sm font-medium"> / {selected.kind === 'monthly' ? 'month' : 'year'}</span>
              </div>
              {selected.freeTrialDays ? (
                <p className="text-acc-strong text-sm font-semibold mt-1">Start with a {selected.freeTrialDays}-day free trial</p>
              ) : selected.introText ? (
                <p className="text-acc-strong text-sm font-semibold mt-1">{selected.introText}</p>
              ) : null}
              {isUpgrade && <p className="text-ink-muted text-xs mt-1">Upgrading charges only the difference for the rest of your current period.</p>}
              {isDowngrade && <p className="text-ink-muted text-xs mt-1">You keep Leader until your current period ends, then Partner begins.</p>}
            </div>
          )}
          <button
            onClick={buy}
            disabled={busy !== null || !selected || sameAsCurrent}
            className="w-full py-3 rounded-xl bg-acc text-on-acc font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy === 'buy' && <Loader2 className="w-4 h-4 animate-spin" />}
            {buttonLabel}
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
            onClick={() => openManageSubscription(subscription?.tier ?? tier)}
            className="flex-1 py-2.5 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold hover:bg-card-2"
          >
            Manage subscription
          </button>
        </div>
      )}
    </div>
  );
}
