'use client';

import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import type { SubscriptionInfo } from '@/app/types';
import { getStoredToken } from './authClient';
import { openInAppBrowser } from './capacitorAlarm';

/**
 * Google Play Billing through RevenueCat, for the Android app only.
 * Nothing here runs in a browser: the web keeps its own (free trial) flow.
 *
 * The RevenueCat user id is the app account id (users.id), so one person is the same
 * customer on every phone. The server (the `subscriptions` table) decides what is unlocked;
 * this file only buys, restores and asks the server to re-check.
 */

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';
const PLAY_PACKAGE = 'com.prayerfireaction.prayerfire';
export const PARTNER_SUBSCRIPTION_ID = 'prayerfire_partner';
export const MANAGE_SUBSCRIPTION_URL = `https://play.google.com/store/account/subscriptions?sku=${PARTNER_SUBSCRIPTION_ID}&package=${PLAY_PACKAGE}`;

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

export interface PartnerOption {
  id: string; // RevenueCat package id
  kind: 'monthly' | 'yearly';
  priceString: string; // already in the person's currency, set in Play Console
  freeTrialDays: number | null; // set when Play offers this person a free trial
}

const packageCache = new Map<string, PurchasesPackage>();

function trialDays(pkg: PurchasesPackage): number | null {
  const phase = pkg.product.defaultOption?.freePhase;
  if (!phase) return null;
  const { unit, value } = phase.billingPeriod;
  const perUnit: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  return (perUnit[String(unit)] ?? 1) * value;
}

/** The Partner monthly and yearly options from the current RevenueCat offering. */
export async function loadPartnerOptions(): Promise<{ ok: true; options: PartnerOption[] } | { ok: false; reason: 'not-configured' | 'unavailable' }> {
  if (!billingConfigured()) return { ok: false, reason: 'not-configured' };
  await pending;
  const { purchases } = await getPurchases();
  if (!purchases || configuredFor === null) return { ok: false, reason: 'unavailable' };
  try {
    const offerings = await purchases.getOfferings();
    const current = offerings.current;
    if (!current) return { ok: false, reason: 'unavailable' };
    const options: PartnerOption[] = [];
    packageCache.clear();
    const add = (pkg: PurchasesPackage | null | undefined, kind: 'monthly' | 'yearly') => {
      if (!pkg) return;
      packageCache.set(pkg.identifier, pkg);
      options.push({ id: pkg.identifier, kind, priceString: pkg.product.priceString, freeTrialDays: trialDays(pkg) });
    };
    add(current.monthly, 'monthly');
    add(current.annual, 'yearly');
    return options.length > 0 ? { ok: true, options } : { ok: false, reason: 'unavailable' };
  } catch (err) {
    console.error('RevenueCat offerings failed', err);
    return { ok: false, reason: 'unavailable' };
  }
}

/** Asks our server to re-check with RevenueCat, so Partner switches on now rather than when the webhook lands. */
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

export type PurchaseResult = { status: 'purchased' } | { status: 'cancelled' } | { status: 'error'; message: string };

/** Opens Google Play's own purchase sheet for the chosen option. */
export async function purchasePartner(packageId: string): Promise<PurchaseResult> {
  await pending;
  const { purchases } = await getPurchases();
  const pkg = packageCache.get(packageId);
  if (!purchases || !pkg) return { status: 'error', message: 'Subscriptions are not available right now. Please try again.' };
  try {
    await purchases.purchasePackage({ aPackage: pkg });
    return { status: 'purchased' };
  } catch (err) {
    const e = err as { userCancelled?: boolean | null; message?: string };
    if (e?.userCancelled) return { status: 'cancelled' };
    return { status: 'error', message: e?.message || 'The purchase did not go through.' };
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
    return { status: 'error', message: (err as Error)?.message || 'Could not restore purchases.' };
  }
}

/** Opens the Google Play subscriptions page, where a person can change or cancel. */
export function openManageSubscription(): Promise<boolean> {
  return openInAppBrowser(MANAGE_SUBSCRIPTION_URL);
}
