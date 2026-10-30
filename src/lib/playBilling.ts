'use client';

import type { PurchasesPackage, PurchasesError } from '@revenuecat/purchases-capacitor';
import type { SubscriptionInfo, SubscriptionTier } from '@/app/types';
import { getStoredToken } from './authClient';
import { openInAppBrowser } from './capacitorAlarm';

/**
 * Google Play Billing through RevenueCat, for the Android app only.
 * Nothing here runs in a browser: the web keeps its own (free trial) flow.
 *
 * The RevenueCat user id is the app account id (users.id), so one person is the same
 * customer on every phone. The server (the `subscriptions` table) decides what is unlocked;
 * this file only buys, restores and asks the server to re-check. Prices, currency and trial
 * wording always come from Google Play (priceString, free phase): nothing is hardcoded here.
 */

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';
const PLAY_PACKAGE = 'com.prayerfireaction.prayerfire';
export const SUBSCRIPTION_IDS: Record<SubscriptionTier, string> = { partner: 'partner_sub', leader: 'leader_sub' };
/** RevenueCat offerings, one per plan, each with a Monthly and an Annual package. */
const OFFERING_IDS: Record<SubscriptionTier, string> = { partner: 'partner', leader: 'leader' };

export function manageSubscriptionUrl(tier: SubscriptionTier = 'partner'): string {
  return `https://play.google.com/store/account/subscriptions?sku=${SUBSCRIPTION_IDS[tier]}&package=${PLAY_PACKAGE}`;
}

type PurchasesPlugin = typeof import('@revenuecat/purchases-capacitor').Purchases;

/** True when the app was built with its RevenueCat key (see PROJECT_HANDOFF.md). */
export function billingConfigured(): boolean {
  return API_KEY.length > 0;
}

// A Capacitor plugin object answers to any property name, including `then`, so it must never be
// returned straight from an async function: it is wrapped in a plain object instead.
async function getPurchases(): Promise<{ purchases: PurchasesPlugin | null }> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.getPlatform() !== 'android') return { purchases: null };
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    return { purchases: Purchases };
  } catch {
    return { purchases: null };
  }
}

let configuredFor: string | null = null;
let pending: Promise<void> = Promise.resolve();

/** Signs RevenueCat in as this account (or out, with null). Calls queue up, so they never overlap. */
export function syncBillingUser(userId: string | null): Promise<void> {
  pending = pending.then(async () => {
    if (!billingConfigured()) return;
    const { purchases } = await getPurchases();
    if (!purchases) return;
    try {
      if (userId) {
        if (configuredFor === null) {
          await purchases.configure({ apiKey: API_KEY, appUserID: userId });
        } else if (configuredFor !== userId) {
          await purchases.logIn({ appUserID: userId });
        }
        configuredFor = userId;
      } else if (configuredFor !== null) {
        await purchases.logOut();
        configuredFor = null;
      }
    } catch (err) {
      console.error('RevenueCat sign-in sync failed', err);
    }
  });
  return pending;
}

export type BillingKind = 'monthly' | 'yearly';

export interface PlanOption {
  id: string; // RevenueCat package id
  tier: SubscriptionTier;
  kind: BillingKind;
  priceString: string; // already in the person's currency, set in Play Console
  freeTrialDays: number | null; // set when Play offers this person a free trial
  /** Set when Play offers this person a discounted start, e.g. "KSh 99.00 for the first month". */
  introText: string | null;
  /** RevenueCat product id, e.g. partner_sub:partner-monthly */
  productId: string;
}

const packageCache = new Map<string, PurchasesPackage>();

function periodDays(unit: unknown, value: number): number {
  const perUnit: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  return (perUnit[String(unit)] ?? 1) * value;
}

function trialDays(pkg: PurchasesPackage): number | null {
  const phase = pkg.product.defaultOption?.freePhase;
  if (!phase) return null;
  return periodDays(phase.billingPeriod.unit, phase.billingPeriod.value);
}

function introText(pkg: PurchasesPackage): string | null {
  const phase = pkg.product.defaultOption?.introPhase;
  if (!phase) return null;
  const unit = String(phase.billingPeriod.unit).toLowerCase();
  const cycles = phase.billingCycleCount ?? 1;
  return `${phase.price.formatted} for the first ${cycles > 1 ? `${cycles} ${unit}s` : unit}`;
}

/** All plans and billing periods Google Play offers this person, keyed by plan. */
export async function loadPlanOptions(): Promise<{ ok: true; options: PlanOption[] } | { ok: false; reason: 'not-configured' | 'unavailable' }> {
  if (!billingConfigured()) return { ok: false, reason: 'not-configured' };
  await pending;
  const { purchases } = await getPurchases();
  if (!purchases || configuredFor === null) return { ok: false, reason: 'unavailable' };
  try {
    const offerings = await purchases.getOfferings();
    const options: PlanOption[] = [];
    packageCache.clear();
    for (const tier of Object.keys(OFFERING_IDS) as SubscriptionTier[]) {
      // The "partner" offering falls back to the current one so a single-offering setup still works.
      const offering = offerings.all?.[OFFERING_IDS[tier]] ?? (tier === 'partner' ? offerings.current : null);
      if (!offering) continue;
      const add = (pkg: PurchasesPackage | null | undefined, kind: BillingKind) => {
        if (!pkg) return;
        packageCache.set(pkg.identifier + '|' + tier, pkg);
        options.push({
          id: pkg.identifier,
          tier,
          kind,
          priceString: pkg.product.priceString,
          freeTrialDays: trialDays(pkg),
          introText: introText(pkg),
          productId: pkg.product.identifier,
        });
      };
      add(offering.monthly, 'monthly');
      add(offering.annual, 'yearly');
    }
    return options.length > 0 ? { ok: true, options } : { ok: false, reason: 'unavailable' };
  } catch (err) {
    console.error('RevenueCat offerings failed', err);
    return { ok: false, reason: 'unavailable' };
  }
}

/** Asks our server to re-check with RevenueCat, so the plan switches on now rather than when the webhook lands. */
export async function syncSubscriptionWithServer(): Promise<SubscriptionInfo | null | 'error'> {
  try {
    const token = getStoredToken();
    const res = await fetch('/api/subscription/sync', {
      method: 'POST',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return 'error';
    const data = (await res.json()) as { subscription: SubscriptionInfo | null };
    return data.subscription;
  } catch {
    return 'error';
  }
}

export type PurchaseResult = { status: 'purchased' } | { status: 'cancelled' } | { status: 'pending'; message: string } | { status: 'error'; message: string };

/** Plain-language messages for the things that can go wrong with a payment. */
export function friendlyPurchaseError(err: unknown): PurchaseResult {
  const e = err as Partial<PurchasesError> | null;
  if (e?.userCancelled) return { status: 'cancelled' };
  switch (String(e?.code ?? '')) {
    case '1':
      return { status: 'cancelled' };
    case '20':
      return { status: 'pending', message: 'Your payment is pending. Google Play will confirm it soon; your plan turns on as soon as it is approved.' };
    case '3':
      return { status: 'error', message: 'Purchases are not allowed on this device or account. Check that Google Play is set up and that purchases are not blocked.' };
    case '6':
      return { status: 'error', message: 'You already have this subscription. Tap "Restore purchases" to switch it on.' };
    case '7':
    case '13':
    case '40':
      return { status: 'error', message: 'This purchase belongs to another Prayer Fire account. Sign in with the account you subscribed with.' };
    case '5':
      return { status: 'error', message: 'This plan is not available to buy right now. Please try again later.' };
    case '10':
    case '35':
      return { status: 'error', message: 'No internet connection. Check your connection and try again.' };
    case '2':
      return { status: 'error', message: 'Google Play had a problem. Please try again in a moment.' };
    case '4':
      return { status: 'error', message: 'Your payment could not be completed. Please check your payment method in Google Play and try again.' };
    default:
      return { status: 'error', message: 'The purchase did not go through. You were not charged. Please try again.' };
  }
}

/**
 * Opens Google Play's own purchase sheet for the chosen plan. If the person already has a plan,
 * this is an upgrade (Partner to Leader: they pay the difference now) or a downgrade (Leader to
 * Partner: takes effect at the next renewal), so Google swaps the old subscription instead of adding a second.
 */
export async function purchasePlan(option: PlanOption, current?: Pick<SubscriptionInfo, 'tier' | 'productId'> | null): Promise<PurchaseResult> {
  await pending;
  const { purchases } = await getPurchases();
  const pkg = packageCache.get(option.id + '|' + option.tier);
  if (!purchases || !pkg) return { status: 'error', message: 'Subscriptions are not available right now. Please try again.' };
  try {
    let googleProductChangeInfo: { oldProductIdentifier: string; prorationMode: number } | undefined;
    if (current?.productId && current.tier !== option.tier) {
      const oldSubscriptionId = current.productId.split(':')[0];
      // 2 = IMMEDIATE_AND_CHARGE_PRORATED_PRICE (upgrade now), 6 = DEFERRED (downgrade at next renewal)
      googleProductChangeInfo = { oldProductIdentifier: oldSubscriptionId, prorationMode: option.tier === 'leader' ? 2 : 6 };
    }
    await purchases.purchasePackage({ aPackage: pkg, googleProductChangeInfo });
    return { status: 'purchased' };
  } catch (err) {
    return friendlyPurchaseError(err);
  }
}

/** Re-links purchases the person already made with this Google account (new phone, reinstall). */
export async function restorePurchases(): Promise<PurchaseResult> {
  await pending;
  const { purchases } = await getPurchases();
  if (!purchases) return { status: 'error', message: 'Subscriptions are not available right now.' };
  try {
    await purchases.restorePurchases();
    return { status: 'purchased' };
  } catch (err) {
    const friendly = friendlyPurchaseError(err);
    return friendly.status === 'error' ? friendly : { status: 'error', message: 'Could not restore purchases. Please try again.' };
  }
}

/** Opens the Google Play subscriptions page, where a person can change or cancel. */
export function openManageSubscription(tier: SubscriptionTier = 'partner'): Promise<boolean> {
  return openInAppBrowser(manageSubscriptionUrl(tier));
}
