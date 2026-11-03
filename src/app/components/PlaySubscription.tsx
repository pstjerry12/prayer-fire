'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { PRICING_PLANS } from '../data/pricingPlans';
import FreeNotice from './FreeNotice';
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
const FREE_INFO = pick('seeker');

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
  const [kind, setKind] = useState<BillingKind>('yearly'); // yearly first: it is the better deal
  const [busy, setBusy] = useState<null | 'restore' | `buy-${SubscriptionTier}`>(null);
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

  const optionFor = (t: SubscriptionTier) => options?.find((o) => o.tier === t && o.kind === kind) ?? null;
  const hasBoth = (t: SubscriptionTier) => !!options?.some((o) => o.tier === t && o.kind === 'monthly') && !!options?.some((o) => o.tier === t && o.kind === 'yearly');
  const sameAsCurrent = (o: PlanOption | null) => !!subscription && !!o && subscription.tier === o.tier && !!subscription.basePlanId && o.productId.endsWith(`:${subscription.basePlanId}`);
  const isUpgrade = (t: SubscriptionTier) => !!subscription && subscription.tier === 'partner' && t === 'leader';
  const isDowngrade = (t: SubscriptionTier) => !!subscription && subscription.tier === 'leader' && t === 'partner';

  async function buy(selected: PlanOption) {
    setBusy(`buy-${selected.tier}`);
    setMessage(null);
    const result = await purchasePlan(selected, subscription);
    if (result.status === 'purchased') {
      const ok = await activate();
      setMessage(
        ok
          ? isDowngrade(selected.tier)
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

  const notice = subscription ? statusNotice(subscription) : null;
  const ready = !!userId && !problem && !!options;

  function buttonLabel(t: SubscriptionTier, o: PlanOption | null): string {
    if (sameAsCurrent(o)) return 'This is your current plan';
    if (isUpgrade(t)) return 'Upgrade to Leader';
    if (isDowngrade(t)) return 'Switch to Partner at renewal';
    return o?.freeTrialDays ? 'Start free trial' : 'Subscribe';
  }

  // (A plain function, not a component, so the cards are not rebuilt on every render.)
  function paidCard(t: SubscriptionTier) {
    const info = PLAN_INFO[t];
    const o = optionFor(t);
    const current = subscription?.tier === t;
    return (
      <section
        aria-label={info.name}
        data-testid={`plan-${t}`}
        className={cn('rounded-2xl border p-5', current ? 'border-acc bg-acc-soft/50' : 'border-edge bg-card')}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-acc text-on-acc text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> {t === 'leader' ? 'FIRE PARTNER LEADER' : 'PRAYER FIRE PARTNER'}
          </span>
          {current && <span className="text-acc-strong text-[0.625rem] font-bold">YOUR PLAN</span>}
        </div>
        <h3 className="text-ink font-bold">{info.name}</h3>
        <p className="text-ink-muted text-xs mt-1 mb-3">{info.tagline}</p>
        <ul className="space-y-2">
          {info.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-ink-muted text-xs">
              <Check className="w-3.5 h-3.5 text-acc-strong mt-0.5 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
        {ready && (
          <div className="mt-5 pt-4 border-t border-edge space-y-3">
            {o ? (
              <div className="text-center">
                <div className="text-3xl font-bold text-ink">
                  {o.priceString}
                  <span className="text-ink-muted text-sm font-medium"> / {o.kind === 'monthly' ? 'month' : 'year'}</span>
                </div>
                {o.freeTrialDays ? (
                  <p className="text-acc-strong text-sm font-semibold mt-1">Start with a {o.freeTrialDays}-day free trial</p>
                ) : o.introText ? (
                  <p className="text-acc-strong text-sm font-semibold mt-1">{o.introText}</p>
                ) : null}
                {isUpgrade(t) && <p className="text-ink-muted text-xs mt-1">Upgrading charges only the difference for the rest of your current period.</p>}
                {isDowngrade(t) && <p className="text-ink-muted text-xs mt-1">You keep Leader until your current period ends, then Partner begins.</p>}
              </div>
            ) : (
              <p className="text-ink-muted text-sm text-center">This plan is not available right now.</p>
            )}
            <button
              onClick={() => o && buy(o)}
              disabled={busy !== null || !o || sameAsCurrent(o)}
              className="w-full py-3 rounded-xl bg-acc text-on-acc font-bold hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy === `buy-${t}` && <Loader2 className="w-4 h-4 animate-spin" />}
              {buttonLabel(t, o)}
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <FreeNotice />

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

      {/* 1. Free */}
      <section
        aria-label="Free"
        data-testid="plan-free"
        className={cn('rounded-2xl border p-5', !subscription ? 'border-acc bg-acc-soft/50' : 'border-edge bg-card')}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 bg-acc-soft-2 text-acc-strong text-[0.625rem] font-bold px-2 py-0.5 rounded-full">FREE</span>
          {!subscription && <span className="text-acc-strong text-[0.625rem] font-bold">YOUR PLAN</span>}
        </div>
        <h3 className="text-ink font-bold">{FREE_INFO.name}</h3>
        <p className="text-ink-muted text-xs mt-1 mb-3">{FREE_INFO.tagline}</p>
        <ul className="space-y-2">
          {FREE_INFO.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-ink-muted text-xs">
              <Check className="w-3.5 h-3.5 text-acc-strong mt-0.5 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-ink font-bold text-sm">Free, always. Nothing to buy.</p>
      </section>

      {/* Sign in / loading / problem, once, above the paid plans */}
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
      ) : (hasBoth('partner') || hasBoth('leader')) ? (
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
      ) : null}

      {/* 2. Partner  3. Leader */}
      {paidCard('partner')}
      {paidCard('leader')}

      {ready && (
        <p className="text-ink-faint text-[0.6875rem] leading-relaxed text-center">
          Payment is charged to your Google Play account when you confirm (or when a free trial ends). The subscription renews
          automatically until you cancel it, any time, in Google Play: Payments &amp; subscriptions → Subscriptions.
        </p>
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
            onClick={() => openManageSubscription(subscription?.tier ?? 'partner')}
            className="flex-1 py-2.5 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold hover:bg-card-2"
          >
            Manage subscription
          </button>
        </div>
      )}
    </div>
  );
}
