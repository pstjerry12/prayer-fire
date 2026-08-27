'use client';

import { useEffect, useState } from 'react';
import { BellRing, X, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  isCapacitorNative,
  checkAlarmPermissionSync,
  requestAlarmPermission,
} from '@/lib/capacitorAlarm';

/**
 * Asks the user to enable prayer-time alarms the first time they open the app.
 *
 * TWO MODES:
 * ┌──────────────────────────────────────────────────────────┐
 * │ Native Capacitor: Uses @capacitor/local-notifications     │
 * │   permission prompt — grants REAL native alarm access.   │
 * ├──────────────────────────────────────────────────────────┤
 * │ Web browser: Uses the browser Notification API           │
 * │   (the original behavior).                               │
 * └──────────────────────────────────────────────────────────┘
 */
export default function NotificationPermission() {
  const [state, setState] = useState<'hidden' | 'asking' | 'granted'>('hidden');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check permission synchronously (fast, no flash)
    const perm = checkAlarmPermissionSync();

    if (perm === 'granted') {
      setState('granted');
      return;
    }

    if (perm === 'denied') {
      setState('hidden');
      return;
    }

    // Only show the prompt once per session.
    try {
      if (sessionStorage.getItem('pfm_alarm_asked') === '1') {
        setState('hidden');
        return;
      }
    } catch {
      // ignore
    }

    setState('asking');
  }, []);

  const allow = async () => {
    try {
      const result = await requestAlarmPermission();
      setState(result === 'granted' ? 'granted' : 'hidden');
    } catch {
      setState('hidden');
    }
    try {
      sessionStorage.setItem('pfm_alarm_asked', '1');
    } catch {
      // ignore
    }
  };

  const dismiss = () => {
    setState('hidden');
    try {
      sessionStorage.setItem('pfm_alarm_asked', '1');
    } catch {
      // ignore
    }
  };

  if (state !== 'asking') return null;

  const isNative = isCapacitorNative();

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] safe-top px-4 pt-3">
      <div className="max-w-md mx-auto bg-card rounded-2xl border border-acc-edge shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-acc-soft text-acc flex items-center justify-center flex-shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-bold text-sm">
              {isNative ? 'Enable Prayer Alarms' : 'Enable Prayer Alarms'}
            </p>
            <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">
              {isNative
                ? 'Allow notifications so your phone rings at your prayer times even when the app is closed. (12am · 12pm · 4am)'
                : 'Allow notifications so your phone rings at your prayer times (12am · 12pm · 4am).'}
            </p>
          </div>
          <button onClick={dismiss} className="p-1 text-ink-faint hover:text-ink" title="Not now">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={allow}
          className="mt-3 w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> {isNative ? 'Allow Alarms' : 'Allow Notifications'}
        </button>
      </div>
    </div>
  );
}
