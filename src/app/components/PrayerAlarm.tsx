'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';

/**
 * Watches the clock and fires a chime + browser notification whenever an
 * enabled prayer time matches the current time (checked once per minute).
 */
export default function PrayerAlarm() {
  const { appointments } = useApp();
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ask permission for notifications (best-effort; ignored if unsupported).
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const fireAlarm = (label: string) => {
      playChime();
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('⏰ Prayer Time', {
            body: `${label} — it's time to pray!`,
            icon: '/logo.png',
          });
        } catch {
          // ignore
        }
      }
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
        fireAlarm(a.label);
      }
    };

    check();
    const interval = window.setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
