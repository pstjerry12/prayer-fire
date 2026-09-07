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

/**
 * Sync platform read (no dynamic import needed) — used to gate the
 * Android-only "Ring like an alarm" UI. iOS has no equivalent native engine
 * (see the AlarmEnginePluginApi comment below), so that control simply
 * doesn't render there.
 */
export function getNativePlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const platform = (
    window as unknown as { Capacitor?: { getPlatform?: () => string } }
  ).Capacitor?.getPlatform?.();
  return platform === 'android' || platform === 'ios' ? platform : 'web';
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

// ── Native "Ring like an alarm" engine (Android only) ───────────────
// This is a custom Kotlin Capacitor plugin (android/app/src/main/kotlin/
// com/prayerfire/app/alarmengine) — there's no separate npm package for it,
// so it's registered directly by name the way Capacitor supports for local
// native-only plugins. iOS keeps using @capacitor/local-notifications only
// (see scheduleNativeAlarms below) — Apple doesn't allow third-party apps
// to bypass silent mode / ring full-screen without a Critical Alerts
// entitlement, so there is no iOS equivalent of this plugin.
interface AlarmEnginePluginApi {
  scheduleAlarm(options: {
    id: string;
    hour: number;
    minute: number;
    label: string;
    tone: string;
  }): Promise<void>;
  cancelAlarm(options: { id: string }): Promise<void>;
  cancelAllAlarms(): Promise<void>;
  dismissRinging(): Promise<void>;
  checkExactAlarmPermission(): Promise<{ granted: boolean }>;
  requestExactAlarmPermission(): Promise<{ opened: boolean }>;
  checkFullScreenIntentPermission(): Promise<{ granted: boolean }>;
  requestFullScreenIntentPermission(): Promise<{ opened: boolean }>;
  checkBatteryOptimizationExemption(): Promise<{ granted: boolean }>;
  requestBatteryOptimizationExemption(): Promise<{ opened: boolean }>;
}

async function getAlarmEngine(): Promise<AlarmEnginePluginApi | null> {
  if (!isCapacitorNative()) return null;
  try {
    const { registerPlugin, Capacitor } = await import('@capacitor/core');
    if (Capacitor.getPlatform() !== 'android') return null;
    return registerPlugin<AlarmEnginePluginApi>('AlarmEngine');
  } catch {
    return null;
  }
}

/** True only inside the native Android wrapper — gates the AlarmEngine UI/flow. */
export async function isAndroidNative(): Promise<boolean> {
  return (await getAlarmEngine()) !== null;
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

  // Web fallback — ACTUALLY request permission from the browser!
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') return 'granted';
      if (result === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'denied';
    }
  }

  return 'denied';
}

// ── Check current permission ───────────────────────────────────────
export function checkAlarmPermissionSync(): 'granted' | 'denied' | 'prompt' {
  // Native Capacitor — can't check sync, assume prompt
  if (isCapacitorNative()) return 'prompt';

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'denied';
}

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

      // Map the alarm tone to the WAV file for native notifications
      const toneToSound: Record<string, string> = {
        classic: 'classic.wav',
        bells: 'bells.wav',
        chime: 'chime.wav',
        digital: 'digital.wav',
        praise: 'praise.wav',
      };
      const soundFile = toneToSound[appt.alarmTone || 'classic'] || 'classic.wav';

      notifications.push({
        id: notifId,
        title: '🔥 Prayer Time',
        body: `${appt.label} — it's time to pray!`,
        schedule: {
          at: fireAt,
          repeats: true,
          every: 'day' as const,
        },
        sound: soundFile,
        ongoing: false,
        extra: { appointmentId: appt.id, label: appt.label },
        // iOS-only field (harmless no-op on Android): this is the best
        // available iOS equivalent of the Android alarm engine. Apple gives
        // third-party apps no way to bypass silent mode or ring for a fixed
        // duration without a Critical Alerts entitlement, so this is the
        // ceiling of what's possible here — an immediate, screen-lighting
        // notification with a custom loud sound, not a 3-minute ring.
        interruptionLevel: 'timeSensitive' as const,
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

// ── AlarmEngine: schedule/cancel the loud, 3-minute Android alarms ──
// Only appointments with useNativeAlarm=true go through here — everything
// else keeps using the plain LocalNotifications path above.
export async function scheduleAlarmEngineAlarms(
  appointments: PrayerAppointment[]
): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return; // web or iOS — nothing to do

  try {
    await engine.cancelAllAlarms();
    for (const appt of appointments) {
      if (!appt.enabled || !appt.useNativeAlarm) continue;
      const [hh, mm] = appt.time.split(':').map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

      await engine.scheduleAlarm({
        id: appt.id,
        hour: hh,
        minute: mm,
        label: appt.label,
        tone: appt.alarmTone || 'classic',
      });
    }
    console.log('[CapacitorAlarm] Scheduled AlarmEngine alarms');
  } catch (err) {
    console.error('[CapacitorAlarm] Failed to schedule AlarmEngine alarms:', err);
  }
}

export async function cancelAllAlarmEngineAlarms(): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.cancelAllAlarms();
  } catch {
    // ignore
  }
}

/** Stops a currently-ringing native alarm (e.g. from an in-app "Dismiss" control). */
export async function dismissNativeRinging(): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.dismissRinging();
  } catch {
    // ignore
  }
}

// ── Sequenced Android permission flow for the alarm engine ──────────
// Each of these pairs a "check" (silent, for UI state) with a "request"
// (opens the actual system prompt or Settings screen). The explanation
// dialogs shown before each one live in the UI layer (AlarmPermissionFlow
// component) — these are just the native primitives it calls in order:
// POST_NOTIFICATIONS -> SCHEDULE_EXACT_ALARM -> USE_FULL_SCREEN_INTENT
// -> battery optimization exemption.

export async function checkExactAlarmPermission(): Promise<boolean> {
  const engine = await getAlarmEngine();
  if (!engine) return true; // not Android native — nothing to gate on
  try {
    const { granted } = await engine.checkExactAlarmPermission();
    return granted;
  } catch {
    return false;
  }
}

/** Android has no in-app grant dialog for this — it always opens Settings. */
export async function requestExactAlarmPermission(): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestExactAlarmPermission();
  } catch {
    // ignore
  }
}

export async function checkFullScreenIntentPermission(): Promise<boolean> {
  const engine = await getAlarmEngine();
  if (!engine) return true;
  try {
    const { granted } = await engine.checkFullScreenIntentPermission();
    return granted;
  } catch {
    return false;
  }
}

/** Also always opens Settings — Android 14 has no in-app grant dialog for this one either. */
export async function requestFullScreenIntentPermission(): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestFullScreenIntentPermission();
  } catch {
    // ignore
  }
}

export async function checkBatteryOptimizationExemption(): Promise<boolean> {
  const engine = await getAlarmEngine();
  if (!engine) return true;
  try {
    const { granted } = await engine.checkBatteryOptimizationExemption();
    return granted;
  } catch {
    return false;
  }
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  const engine = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestBatteryOptimizationExemption();
  } catch {
    // ignore
  }
}

// ── Vibrate — works both sync (web) and async (native) ────────────
export function nativeVibrate(): void {
  // Web fallback — synchronous
  if (!isCapacitorNative()) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch {
        // ignore
      }
    }
    return;
  }

  // Native — fire and forget
  getHaptics().then((Haptics) => {
    if (Haptics) {
      Haptics.vibrate({ duration: 500 }).catch(() => {});
    }
  });
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
