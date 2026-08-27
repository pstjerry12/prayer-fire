'use client';

import { useEffect, useRef, useState } from 'react';
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
 * When the alarm fires:
 *   • Sends a system notification
 *   • Vibrates the phone
 *   • Plays the alarm tone CONTINUOUSLY until the user taps "Dismiss"
 *   • Shows a full-screen "STOP ALARM" overlay
 */
export default function PrayerAlarm() {
  const { appointments } = useApp();
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;
  const [alarmLabel, setAlarmLabel] = useState<string | null>(null);

  const dismiss = () => {
    stopAlarm();
    setAlarmLabel(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── Native Capacitor path ────────────────────────────────
    if (isCapacitorNative()) {
      scheduleNativeAlarms(appointmentsRef.current);

      let cleanup: (() => void) | undefined;
      listenNotificationTap((data) => {
        playAlarmTone(DEFAULT_TONE);
        setAlarmLabel(data.label || 'Prayer Time');
        if (typeof window !== 'undefined') window.focus();
      }).then((fn) => { cleanup = fn; });

      const reschedule = () => scheduleNativeAlarms(appointmentsRef.current);
      const interval = setInterval(reschedule, 60000);

      return () => {
        clearInterval(interval);
        cleanup?.();
        stopAlarm();
      };
    }

    // ── Web fallback path ────────────────────────────────────
    const notify = (label: string, toneId?: string) => {
      // System notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification('🔥 Prayer Time', {
            body: `${label} — it's time to pray!`,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'prayer-alarm',
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
            // Don't stop alarm — user must tap Dismiss
          };
        } catch {
          // ignore
        }
      }

      // Vibrate
      nativeVibrate();

      // Play alarm CONTINUOUSLY — only stopAlarm() can stop it
      playAlarmTone((toneId as AlarmToneId) || DEFAULT_TONE);

      // Show the dismiss overlay
      setAlarmLabel(label);
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

  // ── Full-screen STOP ALARM overlay ───────────────────────────
  if (!alarmLabel) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
      {/* Pulsing fire icon */}
      <div className="animate-bounce mb-4">
        <span className="text-7xl">🔥</span>
      </div>

      {/* Prayer label */}
      <h1 className="text-3xl font-black text-white mb-2 text-center">
        Prayer Time!
      </h1>
      <p className="text-xl text-amber-400 font-bold mb-8 text-center">
        {alarmLabel}
      </p>

      {/* Big DISMISS button */}
      <button
        onClick={dismiss}
        className="px-12 py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-2xl font-black shadow-2xl transition-all active:scale-95"
      >
        DISMISS ALARM
      </button>

      <p className="text-white/50 text-sm mt-4">
        Tap to stop the alarm
      </p>
    </div>
  );
}
