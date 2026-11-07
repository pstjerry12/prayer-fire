'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { suppressAdsForSession } from '@/lib/adsGuard';
import { useApp } from '@/app/context';
import { buildAlarmContent } from '@/lib/alarmContent';
import { GROUP_ALARMS_EVENT, groupAppointments } from '@/lib/groupAlarms';
import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';
import { playAlarmTone, stopAlarm, DEFAULT_TONE, type AlarmToneId } from '@/lib/alarmSound';
import {
  isNativePlatformAsync,
  scheduleNativeAlarms,
  scheduleAlarmEngineAlarms,
  nativeVibrate,
  listenNotificationTap,
  listenPrayNow,
  setNativeAlarmContent,
  setNativeAlarmText,
  setNativeWidgetStreak,
} from '@/lib/capacitorAlarm';
import { useI18n } from '@/app/i18n';

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
  const { t, tr, lang } = useI18n();
  const { appointments: personalAppointments, streak } = useApp();
  // Group prayer times of the groups this person belongs to (saved by the groups screen) ring like their own alarms.
  const [groupAppts, setGroupAppts] = useState<PrayerAppointment[]>([]);
  useEffect(() => {
    const read = () => setGroupAppts(groupAppointments());
    read();
    window.addEventListener(GROUP_ALARMS_EVENT, read);
    return () => window.removeEventListener(GROUP_ALARMS_EVENT, read);
  }, []);
  const appointments = useMemo(() => [...personalAppointments, ...groupAppts], [personalAppointments, groupAppts]);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const appointmentsRef = useRef(appointments);
  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);
  // The notification wording follows the chosen language; the effect below runs again when the language changes.
  const textRef = useRef({ title: t('alarm.notifTitle'), body: (label: string) => t('alarm.notifBody', { label }), fallback: t('alarm.fallbackLabel'), tr });
  useEffect(() => {
    textRef.current = { title: t('alarm.notifTitle'), body: (label: string) => t('alarm.notifBody', { label }), fallback: t('alarm.fallbackLabel'), tr };
  }, [t, tr]);
  const [alarmLabel, setAlarmLabel] = useState<string | null>(null);

  // The words on the native alarm screen and notification follow the chosen language (Android only; a no-op on web).
  useEffect(() => {
    setNativeAlarmText({
      title: t('alarm.notifTitle'), body: t('alarm.notifBody', { label: '{label}' }), groupBody: t('alarm.groupBody', { label: '{label}' }),
      stop: t('alarm.stop'), snooze: t('alarm.snooze', { n: '{n}' }), prayNow: t('alarm.prayNow'), joinLive: t('alarm.joinLive'),
    });
  }, [t]);

  // The Android home-screen widget shows the fire streak (a no-op on web).
  useEffect(() => {
    setNativeWidgetStreak(streak);
  }, [streak]);

  const dismiss = () => {
    stopAlarm();
    setAlarmLabel(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let cleanupFns: (() => void)[] = [];

    // Deciding native-vs-web here gates the ENTIRE alarm mechanism — get
    // this wrong and prayer alarms silently run on the much weaker web
    // fallback (a setInterval that dies the moment the app is backgrounded
    // or killed) instead of real AlarmManager-driven native alarms, with
    // nothing visibly broken to point at. isNativePlatformAsync() resolves
    // after a dynamic import instead of reading window.Capacitor
    // synchronously on the very first render tick, which is what actually
    // matters here — see its own comment in capacitorAlarm.ts.
    isNativePlatformAsync().then((native) => {
      if (cancelled) return;

      // ── Native Capacitor path ────────────────────────────────
      if (native) {
        // Plain scheduled notifications for every enabled appointment, PLUS
        // (Android only) the loud AlarmManager-driven ring for whichever
        // appointments have "Ring like an alarm" turned on. The two run
        // side by side — scheduleAlarmEngineAlarms() is a no-op on iOS/web.
        scheduleNativeAlarms(appointmentsRef.current, textRef.current);
        scheduleAlarmEngineAlarms(appointmentsRef.current);
        // Today's prayer point and verse for the full-screen alarm (Android only).
        setNativeAlarmContent(buildAlarmContent().map((c) => ({ ...c, point: textRef.current.tr(c.point) })));

        // The alarm's "Pray Now" button opens the app on the prayer session, not the home screen.
        // (An alarm opening the app also switches ads off for this session: see lib/adsGuard.ts.)
        listenPrayNow(() => {
          suppressAdsForSession();
          routerRef.current.push('/startup');
        }).then((fn) => {
          if (cancelled) fn();
          else cleanupFns.push(fn);
        });

        listenNotificationTap((data) => {
          suppressAdsForSession();
          playAlarmTone(DEFAULT_TONE);
          setAlarmLabel(data.label || textRef.current.fallback);
          if (typeof window !== 'undefined') window.focus();
        }).then((fn) => {
          if (cancelled) fn();
          else cleanupFns.push(fn);
        });

        // Only the plain-notification path needs a periodic re-arm here —
        // the AlarmEngine alarms are self-perpetuating (AlarmReceiver
        // re-arms tomorrow's exact alarm the moment today's fires, and
        // BootReceiver re-arms everything after a reboot), so
        // rescheduling them every minute would just be unnecessary
        // AlarmManager churn.
        const reschedule = () => scheduleNativeAlarms(appointmentsRef.current, textRef.current);
        const interval = setInterval(reschedule, 60000);
        cleanupFns.push(() => clearInterval(interval));
        return;
      }

      // ── Web fallback path ────────────────────────────────────
      const notify = (label: string, toneId?: string) => {
        // System notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(textRef.current.title, {
              body: textRef.current.body(label),
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
      cleanupFns.push(() => clearInterval(interval));
    });

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
      stopAlarm();
    };
  }, [appointments, lang]);

  // ── Full-screen STOP ALARM overlay ───────────────────────────
  if (!alarmLabel) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
      {/* Pulsing fire icon */}
      <div className="animate-bounce mb-4">
        <span className="text-7xl">🔥</span>
      </div>

      {/* Prayer label */}
      <h1 className="text-3xl font-black text-white mb-2 text-center">{t('prayerAlarm.prayerTime')}</h1>
      <p className="text-xl text-acc-strong font-bold mb-8 text-center">
        {alarmLabel}
      </p>

      {/* Big DISMISS button */}
      <button
        onClick={dismiss}
        className="px-12 py-5 bg-danger hover:bg-danger text-white rounded-2xl text-2xl font-black shadow-2xl transition-all active:scale-95"
      >{t('prayerAlarm.dismissAlarm')}</button>

      <p className="text-white/50 text-sm mt-4">{t('customizablePrayerSchedule.tapToStopTheAlarm')}</p>
    </div>
  );
}
