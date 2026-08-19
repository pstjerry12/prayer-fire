'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/app/context';
import { startAlarmSound, stopAlarmSound } from '@/lib/alarmSound';

/**
 * Watches the clock and fires a prayer-time alarm whenever an enabled prayer
 * time matches the current time (checked every 20 seconds).
 *
 * Uses the phone's own system notification + tone, plus an audible
 * two-tone ring while the app is open, plus vibration on supporting devices.
 */
export default function PrayerAlarm() {
  const { appointments } = useApp();
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const notify = (label: string) => {
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
            stopAlarmSound();
          };
        } catch {
          // ignore
        }
      }

      // Vibration (if supported).
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 200]);
        } catch {
          // ignore
        }
      }

      // Audible two-tone ring while the app is open.
      startAlarmSound();
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
        notify(a.label);
      }
    };

    check();
    const interval = window.setInterval(check, 20000);
    return () => {
      clearInterval(interval);
      stopAlarmSound();
    };
  }, []);

  return null;
}
