'use client';

import { useEffect } from 'react';
import { useApp } from '../context';
import { syncBillingUser } from '@/lib/playBilling';

/**
 * Android app only: keeps RevenueCat signed in as the same person as the app
 * (their account id), and signed out when they sign out. Renders nothing.
 */
export default function BillingSync() {
  const { user, isAndroidApp } = useApp();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAndroidApp) return;
    syncBillingUser(userId);
  }, [isAndroidApp, userId]);

  return null;
}
