'use client';
/**
 * Capacitor Alarm Bridge
 *
 * When the app runs inside a Capacitor native wrapper (Android/iOS),
 * this uses @capacitor/local-notifications to schedule REAL native alarms
 * that fire even when the app is closed or the phone is asleep.
 *
 * When running in a regular browser (Chrome, Safari, etc.),
 * it falls back to the web Notification API (the old behavior).
 *
 * This does NOT change the web app at all — it just makes the alarm
 * stronger when the app is installed as a native phone app.
 */

import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';

// ── Detect if running inside Capacitor native wrapper ──────────────
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor
      ?.isNative === true
  );
}

// ── Lazy-load Capacitor plugins (only when native) ─────────────────
async function getLocalNotifications() {
  if (!isCapacitorNative()) return null;
  try {
    const { LocalNotifications } = await import(
      '@capacitor/local-notifications'
    );
    return LocalNotifications;
  } catch {
    return null;
  }
}

async function getHaptics() {
  if (!isCapacitorNative()) return null;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return Haptics;
  } catch {
    return null;
  }
}

// ── Request notification permission ─────────────────────────────────
export async function requestAlarmPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  // Native Capacitor path
  const LocalNotifications = await getLocalNotifications();
  if (LocalNotifications) {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  // Web fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'denied';
}

// ── Check current permission ───────────────────────────────────────
export async function checkAlarmPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const LocalNotifications = await getLocalNotifications();
  if (LocalNotifications) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted' ? 'granted' : result.display === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'denied';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'denied';
}

// ── Schedule native alarms for all enabled appointments ────────────
/**
 * Takes the user's prayer appointments and schedules them as
 * native local notifications. These fire at the exact time
 * even if the app is killed / phone is asleep.
 */
export async function scheduleNativeAlarms(
  appointments: PrayerAppointment[]
): Promise<void> {
  const LocalNotifications = await getLocalNotifications();
  if (!LocalNotifications) return; // Web — nothing to schedule natively

  try {
    // Cancel all existing prayer alarms first
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    // Schedule each enabled appointment
    const notifications = [];
    for (const appt of appointments) {
      if (!appt.enabled) continue;

      const [hh, mm] = appt.time.split(':').map(Number);
      if (isNaN(hh) || isNaN(mm)) continue;

      // Schedule for today (or tomorrow if the time already passed)
      const now = new Date();
      const fireAt = new Date();
      fireAt.setHours(hh, mm, 0, 0);
      if (fireAt <= now) {
        fireAt.setDate(fireAt.getDate() + 1);
      }

      // Use a stable notification ID from the appointment id hash
      const notifId = hashCode(appt.id);

      notifications.push({
        id: notifId,
        title: '🔥 Prayer Time',
        body: `${appt.label} — it's time to pray!`,
        schedule: {
          at: fireAt,
          repeats: true,       // Repeat daily at this time
          every: 'day' as const,
        },
        sound: undefined,
        ongoing: false,
        extra: { appointmentId: appt.id, label: appt.label },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`[CapacitorAlarm] Scheduled ${notifications.length} native alarms`);
    }
  } catch (err) {
    console.error('[CapacitorAlarm] Failed to schedule alarms:', err);
  }
}

// ── Cancel all native alarms ───────────────────────────────────────
export async function cancelAllNativeAlarms(): Promise<void> {
  const LocalNotifications = await getLocalNotifications();
  if (!LocalNotifications) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    console.log('[CapacitorAlarm] Cancelled all native alarms');
  } catch (err) {
    console.error('[CapacitorAlarm] Failed to cancel alarms:', err);
  }
}

// ── Vibrate using native haptics ───────────────────────────────────
export async function nativeVibrate(): Promise<void> {
  const Haptics = await getHaptics();
  if (Haptics) {
    try {
      await Haptics.vibrate({ duration: 500 });
    } catch {
      // ignore
    }
    return;
  }

  // Web fallback
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch {
      // ignore
    }
  }
}

// ── Listen for when a native notification is tapped ────────────────
export async function listenNotificationTap(
  callback: (data: { appointmentId?: string; label?: string }) => void
): Promise<() => void> {
  const LocalNotifications = await getLocalNotifications();
  if (!LocalNotifications) return () => {};

  try {
    const listener = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const extra = event.notification?.extra as
          | { appointmentId?: string; label?: string }
          | undefined;
        callback(extra ?? {});
      }
    );
    return () => listener.remove();
  } catch {
    return () => {};
  }
}

// ── Helper: stable numeric hash from string ────────────────────────
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100000;
}
