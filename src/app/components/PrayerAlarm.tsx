'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/app/context';
import { playAlarmTone, stopAlarm, DEFAULT_TONE, type AlarmToneId } from '@/lib/alarmSound';
import {
  isCapacitorNative,
  scheduleNativeAlarms,
  nativeVibrate,
  listenNotificationTap,
} from '@/lib/capacitorAlarm';

/**
 * Watches the clock and fires a prayer-time alarm whenever an enabled prayer
 * time matches the current time (checked every 20 seconds).
 *
 * TWO MODES:
 * ┌─────────────────────────────────────────────────────────┐
 * │ Native Capacitor mode:                                  │
 * │   • Schedules real OS-level alarms via                  │
 * │     @capacitor/local-notifications                      │
 * │   • Alarms fire even when app is closed / phone asleep  │
 * │   • Also listens for notification tap → opens app       │
 * ├─────────────────────────────────────────────────────────┤
 * │ Web mode (browser):                                     │
 * │   • Uses the browser Notification API                   │
 * │   • Uses Web Audio API for alarm tone                   │
 * │   • Uses navigator.vibrate for haptic feedback          │
 * │   • Only works while the app is open                    │
 * └─────────────────────────────────────────────────────────┘
 */
export default function PrayerAlarm() {
  const { appointments } = useApp();
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── Native Capacitor path ────────────────────────────────
    if (isCapacitorNative()) {
      // Schedule native alarms whenever appointments change.
      scheduleNativeAlarms(appointmentsRef.current);

      // Listen for when the user taps a native notification.
      let cleanup: (() => void) | undefined;
      listenNotificationTap((data) => {
        // User tapped the alarm notification — play the tone too
        playAlarmTone(DEFAULT_TONE, 13);
        // Navigate to schedule page if we can
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }).then((fn) => { cleanup = fn; });

      // Re-schedule whenever appointments change
      const reschedule = () => scheduleNativeAlarms(appointmentsRef.current);
      const interval = setInterval(reschedule, 60000); // refresh every minute

      return () => {
        clearInterval(interval);
        cleanup?.();
        stopAlarm();
      };
    }

    // ── Web fallback path ────────────────────────────────────
    const notify = (label: string, toneId?: string) => {
      // System notification — uses the phone's default notification sound.
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification('⏰ Prayer Time', {
            body: `${label} — it's time to pray!`,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'prayer-alarm',
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
            stopAlarm();
          };
        } catch {
          // ignore
        }
      }

      // Vibration (if supported).
      nativeVibrate(); // uses Capacitor haptics or navigator.vibrate

      // Audible alarm with the user's chosen tune (while the app is open).
      playAlarmTone((toneId as AlarmToneId) || DEFAULT_TONE, 13);
    };

    const check = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const current = `${hh}:${mm}`;
      const today = now.toDateString();

      for (const a of appointmentsRef.current) {
        if (!a.enabled) continue;
        if (a.time !== current) continue;
        const firedKey = `upp_alarm_fired_${a.id}`;
        if (localStorage.getItem(firedKey) === today) continue;
        localStorage.setItem(firedKey, today);
        notify(a.label, a.alarmTone);
      }
    };

    check();
    const interval = window.setInterval(check, 20000);
    return () => {
      clearInterval(interval);
      stopAlarm();
    };
  }, [appointments]);

  return null;
}
