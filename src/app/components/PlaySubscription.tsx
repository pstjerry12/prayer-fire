'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { usePlanConfig } from '@/lib/usePlanConfig';
import type { PlanCopy } from '@/lib/planConfig';
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
import { useI18n } from '@/app/i18n';

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
function FeatureList({ plan }: { plan: PlanCopy }) {
  const { t, tr } = useI18n();
  return (
    <ul className="space-y-2 flex-1">
      {plan.features.map((f) => (
        <li key={f.text} className="flex items-start gap-2 text-ink-muted text-xs">
          <Check className="w-3.5 h-3.5 text-acc-strong mt-0.5 flex-shrink-0" />
          <span>
            {tr(f.text)}
            {f.soon && <span className="ml-1.5 align-middle rounded-full bg-card-3 text-ink-soft text-[0.5625rem] font-bold px-1.5 py-0.5">{t('playSubscription.soon')}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PlaySubscription() {
  const { t, tr } = useI18n();
  const { user, subscription, refreshSubscription, setShowAuth } = useApp();
  const config = usePlanConfig();
  const [options, setOptions] = useState<PlanOption[] | null>(null);
  const [problem, setProblem] = useState<'not-configured' | 'unavailable' | null>(null);
  const [kind, setKind] = useState<BillingKind>('yearly'); // yearly first: it is the better deal
  const [busy, setBusy] = useState<null | 'restore' | SubscriptionTier>(null);
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

  const hasBoth = !!options && (['partner', 'leader'] as const).some((tier) => options.some((o) => o.tier === tier && o.kind === 'monthly') && options.some((o) => o.tier === tier && o.kind === 'yearly'));
  // The option on sale for a tier in the chosen period (falls back to the other period if only one exists).
  const optionFor = (tier: SubscriptionTier) => options?.find((o) => o.tier === tier && o.kind === kind) ?? options?.find((o) => o.tier === tier) ?? null;
  const sameAsCurrent = (tier: SubscriptionTier) => {
    const o = optionFor(tier);
    return !!subscription && !!o && subscription.tier === o.tier && !!subscription.basePlanId && o.productId.endsWith(`:${subscription.basePlanId}`);
  };
  const isUpgrade = (tier: SubscriptionTier) => !!subscription && subscription.tier === 'partner' && tier === 'leader';
  const isDowngrade = (tier: SubscriptionTier) => !!subscription && subscription.tier === 'leader' && tier === 'partner';

  async function buy(tier: SubscriptionTier) {
    const selected = optionFor(tier);
    if (!selected) return;
    setBusy(tier);
    setMessage(null);
    const result = await purchasePlan(selected, subscription);
    if (result.status === 'purchased') {
      const ok = await activate();
      setMessage(
        ok
          ? isDowngrade(tier)
            ? t('ui.doneYourPlanChangesTo')
            : `Thank you! Prayer Fire ${tier === 'leader' ? config.leader.name : config.partner.name} is now active.`
          : t('ui.yourPurchaseWentThroughIt')
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
      setMessage(ok ? t('ui.yourSubscriptionHasBeenRestored') : t('ui.noActiveSubscriptionWasFound'));
    }
    setBusy(null);
  }

  const notice = subscription ? statusNotice(subscription) : null;
  const loading = !!userId && !problem && !options;
  const trialDays = (tier: SubscriptionTier) => optionFor(tier)?.freeTrialDays ?? 0;

  function buttonLabel(tier: SubscriptionTier): string {
    if (!userId) return t('ui.signInToSubscribe');
    if (sameAsCurrent(tier)) return t('ui.yourCurrentPlan');
    if (isUpgrade(tier)) return t('ui.upgradeToLeader');
    if (isDowngrade(tier)) return t('ui.switchToPartnerAtRenewal');
    return trialDays(tier) ? t('ui.startFreeTrial') : t('ui.subscribe');
  }

  /** Price block for a paid card: the Google Play price, the free trial, and what happens after. */
  function PriceBlock({ tier }: { tier: SubscriptionTier }) {
    const o = optionFor(tier);
    if (!userId) return <p className="text-ink-muted text-xs">{t('playSubscription.signInToSeeThe')}</p>;
    if (problem) return <p className="text-ink-muted text-xs">{problem === 'not-configured' ? t('ui.notAvailableInThisVersion') : t('ui.couldNotLoadThePrice')}</p>;
    if (loading || !o) return <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />;
    return (
      <div>
        <div className="text-2xl font-bold text-ink">
          {o.priceString}
          <span className="text-ink-muted text-xs font-medium"> / {o.kind === 'monthly' ? 'month' : 'year'}</span>
        </div>
        {o.freeTrialDays ? (
          <p className="text-acc-strong text-xs font-semibold mt-1">Starts with a {o.freeTrialDays}-day free trial</p>
        ) : o.introText ? (
          <p className="text-acc-strong text-xs font-semibold mt-1">{o.introText}</p>
        ) : null}
        <p className="text-ink-faint text-[0.6875rem] mt-1">{t('playSubscription.renewsAutomaticallyCancelAnyTime')}</p>
      </div>
    );
  }

  function paidCard(tier: SubscriptionTier) {
    const plan = tier === 'leader' ? config.leader : config.partner;
    const current = sameAsCurrent(tier);
    return (
      <div
        data-testid={`plan-${tier}`}
        className={cn(
          'snap-center shrink-0 w-[82%] sm:w-auto rounded-2xl border p-4 flex flex-col',
          tier === 'partner' ? 'border-acc bg-acc-soft/50 shadow-lg shadow-acc/10' : 'border-edge bg-card'
        )}
      >
        {tier === 'partner' ? (
          <span className="self-start mb-2 inline-flex items-center gap-1 bg-acc text-on-acc text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> MOST POPULAR
          </span>
        ) : (
          <span className="mb-2 h-[1.125rem]" aria-hidden />
        )}
        <h3 className="text-ink font-bold">{tr(plan.name)}</h3>
        <p className="text-ink-muted text-xs mt-1 mb-3 min-h-[2.25rem]">{tr(plan.tagline)}</p>
        <div className="mb-3 min-h-[4.5rem]">
          <PriceBlock tier={tier} />
        </div>
        {tier === 'leader' && (
          <div className="mb-3 space-y-1.5" aria-label={t('playSubscription.leaderTiers')}>
            {config.leaderTiers.map((tier) => (
              <div key={tier.id} className={cn('flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs', tier.available ? 'border-acc-edge bg-acc-soft' : 'border-edge bg-card-2 opacity-80')}>
                <span className="font-bold text-ink">{tier.name}</span>
                <span className="text-ink-muted">{tier.available ? `up to ${tier.memberLimit.toLocaleString()} members` : 'Coming soon'}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mb-4 flex-1 flex flex-col">
          <FeatureList plan={plan} />
        </div>
        <button
          onClick={() => (userId ? buy(tier) : setShowAuth(true))}
          disabled={busy !== null || (!!userId && (!optionFor(tier) || current))}
          className={cn(
            'w-full py-3 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2 text-sm',
            tier === 'partner' ? 'bg-acc text-on-acc hover:bg-acc-hover' : 'border border-acc text-acc-strong hover:bg-acc-soft'
          )}
        >
          {busy === tier && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonLabel(tier)}
        </button>
      </div>
    );
  }

  const payNote =
    t('ui.paymentIsChargedToYour') +
    (trialDays('partner') || trialDays('leader') ? ' (or when a free trial ends)' : '') +
    '. Subscriptions renew automatically until you cancel. To cancel, open Google Play: Payments & subscriptions → Subscriptions → Prayer Fire → Cancel. You keep your plan until the end of the period you paid for.';

  return (
    <div className="space-y-4">
      {subscription && (
        <div className="rounded-2xl border border-acc-edge bg-card p-5 text-center">
          <div className="text-3xl mb-2">{subscription.tier === 'leader' ? '🔥' : '👑'}</div>
          <h4 className="text-acc-strong font-bold">You are a Prayer Fire {subscription.tier === 'leader' ? 'Leader' : 'Partner'}</h4>
          <p className="text-ink-muted text-sm mt-1">
            {subscription.isTrial ? t('ui.yourFreeTrialIsActive') : t('ui.yourSubscriptionIsActive')}
            {subscription.expiresAt
              ? subscription.willRenew
                ? `, and renews on ${formatDate(subscription.expiresAt)}.`
                : `, and ends on ${formatDate(subscription.expiresAt)}.`
              : '.'}
          </p>
          {notice && <p className="mt-3 rounded-xl bg-acc-soft border border-acc-edge text-acc-strong text-xs p-3">{tr(notice)}</p>}
        </div>
      )}

      {/* Yearly / Monthly: one switch for both paid plans */}
      {hasBoth && (
        <div className="flex bg-card-3 rounded-lg p-1" role="tablist" aria-label={t('playSubscription.billingPeriod')}>
          <button
            role="tab"
            aria-selected={kind === 'yearly'}
            onClick={() => setKind('yearly')}
            className={cn('flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5', kind === 'yearly' ? 'bg-acc text-on-acc' : 'text-ink-muted')}
          >
            {t('playSubscription.yearly')}
            <span className={cn('text-[0.625rem] font-extrabold rounded-full px-1.5 py-0.5', kind === 'yearly' ? 'bg-white/25 text-white' : 'bg-acc-soft-2 text-acc-strong')}>{t('playSubscription.2MonthsFree')}</span>
          </button>
          <button
            role="tab"
            aria-selected={kind === 'monthly'}
            onClick={() => setKind('monthly')}
            className={cn('flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all', kind === 'monthly' ? 'bg-acc text-on-acc' : 'text-ink-muted')}
          >{t('playSubscription.monthly')}</button>
        </div>
      )}

      {/* The three plans, side by side: swipe on a phone, three columns on a wide screen. */}
      <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible" role="list" aria-label={t('playSubscription.plans')}>
        <div
          data-testid="plan-free"
          className={cn('snap-center shrink-0 w-[82%] sm:w-auto rounded-2xl border p-4 flex flex-col', !subscription ? 'border-acc-edge bg-card' : 'border-edge bg-card')}
        >
          {!subscription ? (
            <span className="self-start mb-2 inline-flex items-center gap-1 bg-acc-soft-2 text-acc-strong text-[0.625rem] font-bold px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> YOUR CURRENT PLAN
            </span>
          ) : (
            <span className="mb-2 h-[1.125rem]" aria-hidden />
          )}
          <h3 className="text-ink font-bold">{config.free.name}</h3>
          <p className="text-ink-muted text-xs mt-1 mb-3 min-h-[2.25rem]">{tr(config.free.tagline)}</p>
          <div className="mb-3 min-h-[4.5rem]">
            <div className="text-2xl font-bold text-ink">{t('playSubscription.free')}</div>
            <p className="text-ink-faint text-[0.6875rem] mt-1">{t('playSubscription.alwaysNothingToBuy')}</p>
          </div>
          <div className="flex-1 flex flex-col">
            <FeatureList plan={config.free} />
          </div>
        </div>
        {paidCard('partner')}
        {paidCard('leader')}
      </div>

      <p className="text-ink-faint text-[0.6875rem] leading-relaxed text-center">
        {payNote} By subscribing you agree to the <a href="/terms" className="underline text-acc-strong">{t('legal.terms')}</a>. Members who join your group never pay.
      </p>

      {message && (
        <p role="status" className="text-center text-sm text-ink-soft bg-card-2 border border-edge rounded-xl p-3">
          {tr(message)}
        </p>
      )}

      {problem === 'unavailable' && userId && (
        <button onClick={load} className="w-full py-2.5 rounded-xl border border-edge-strong text-ink-soft text-sm font-bold">{t('playSubscription.tryLoadingThePricesAgain')}</button>
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
          >{t('playSubscription.manageSubscription')}</button>
        </div>
      )}
    </div>
  );
}
