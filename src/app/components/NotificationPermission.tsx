'use client';

import { useEffect, useState } from 'react';
import { BellRing, X, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  isAndroidNative,
  checkAlarmPermissionSync,
  requestAlarmPermission,
} from '@/lib/capacitorAlarm';
import AlarmPermissionFlow from './AlarmPermissionFlow';

// Set once the full Android permission sequence (notifications, exact
// alarms, full-screen intent, battery exemption) has run on first open —
// so it doesn't repeat on later launches.
const NATIVE_ALARM_ONBOARD_KEY = 'pfm_native_alarm_onboarded';

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
  const [state, setState] = useState<'hidden' | 'asking' | 'granted' | 'full_flow'>('hidden');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    (async () => {
      // On Android native, run the FULL permission sequence (notifications +
      // exact alarms + full-screen intent + battery exemption) once on first
      // open, instead of only asking for bare notification permission and
      // leaving the other three to be discovered later via the per-prayer
      // "Ring like an alarm" toggle — most people never find that toggle, so
      // alarms were silently running without exact-alarm scheduling or a
      // battery-optimization exemption, which is why they'd ring briefly then
      // get killed early by the OS/OEM instead of running reliably.
      //
      // isAndroidNative() is checked asynchronously (not a synchronous
      // window.Capacitor read) on purpose — this app loads its page from a
      // remote server.url, so the native bridge's own injection can still
      // be mid-flight on the very first render tick, which read as "not
      // Android" for a real Android install and skipped this entire flow
      // silently. See capacitorAlarm.ts's isNativePlatformAsync() comment.
      const android = await isAndroidNative();
      if (cancelled) return;

      if (android) {
        let onboarded = false;
        try {
          onboarded = localStorage.getItem(NATIVE_ALARM_ONBOARD_KEY) === '1';
        } catch {
          // ignore
        }
        if (!onboarded) setState('full_flow');
        return;
      }

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
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const finishFullFlow = () => {
    try {
      localStorage.setItem(NATIVE_ALARM_ONBOARD_KEY, '1');
    } catch {
      // ignore
    }
    setState('hidden');
  };

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

  if (state === 'full_flow') {
    return <AlarmPermissionFlow onComplete={finishFullFlow} onCancel={finishFullFlow} />;
  }

  if (state !== 'asking') return null;

  // This state is only reached when isAndroidNative() came back false (iOS
  // native or plain web) — the Android full_flow branch above intercepts
  // everything else, so there's no native-vs-web copy split left to make
  // here.
  return (
    <div className="fixed top-0 left-0 right-0 z-[90] safe-top px-4 pt-3">
      <div className="max-w-md mx-auto bg-card rounded-2xl border border-acc-edge shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-acc-soft text-acc flex items-center justify-center flex-shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-bold text-sm">Enable Prayer Alarms</p>
            <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">
              Allow notifications so your phone rings at your prayer times (12am · 12pm · 4am).
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
          <Check className="w-4 h-4" /> Allow Notifications
        </button>
      </div>
    </div>
  );
}
