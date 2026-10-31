'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '../context';
import { billingConfigured, syncBillingUser, syncSubscriptionWithServer } from '@/lib/playBilling';

/**
 * Android app only. Keeps RevenueCat signed in as the same person as the app (their account id), and
 * signed out when they sign out. Once per launch or login it also asks the server to re-check the
 * person's subscription with Google (through RevenueCat), so a renewal, a refund or a purchase made
 * on another phone shows up without anyone pressing a button. Renders nothing.
 */
export default function BillingSync() {
  const { user, isAndroidApp, refreshSubscription } = useApp();
  const userId = user?.id ?? null;
  const rechecked = useRef<string | null>(null);

  useEffect(() => {
    if (!isAndroidApp) return;
    let cancelled = false;
    (async () => {
      await syncBillingUser(userId);
      if (!userId || !billingConfigured() || rechecked.current === userId) return;
      rechecked.current = userId;
      const synced = await syncSubscriptionWithServer();
      if (!cancelled && synced !== 'error') await refreshSubscription();
    })();
    return () => {
      cancelled = true;
    };
    // refreshSubscription changes on every render; the re-check is meant to run once per account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAndroidApp, userId]);

  return null;
}
