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
// Capacitor 8 never sets a `Capacitor.isNative` property (it only exposes
// `Capacitor.isNativePlatform()`, a method) — checking `.isNative` here
// used to always read undefined/false, on every device, regardless of
// timing. That silently broke every caller that branches on this
// function's return value (Google Sign-In's Custom Tabs vs. plain-nav
// choice, the auth deep-link listener in app/context.tsx, and this app's
// sync alarm-permission check), since they always took the "not native"
// path even inside a real native install.
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.() === true
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

/**
 * Async-safe native-platform check for decisions that matter (e.g. "should
 * this run the native alarm-scheduling path or the web fallback") made
 * inside a mount-time effect. Prefer this over isCapacitorNative()/
 * getNativePlatform() there — this app loads its page from a remote
 * server.url rather than a bundled local asset, so the native bridge's own
 * injection of window.Capacitor can still be mid-flight on the very first
 * synchronous render tick, reading as "web" for a real native install. The
 * dynamic import below reliably outlasts that race in practice.
 */
export async function isNativePlatformAsync(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// ── Lazy-load Capacitor plugins ──────────────────────────────────────
// Deliberately NOT gated on isCapacitorNative() first: that flag is a
// synchronous read of window.Capacitor at whatever instant this runs,
// which reads false for a real native app if called too early relative
// to the bridge's own injection — a race specific to this app's
// server.url/remote-reload setup (the same bug already found and fixed
// for the back button and notification-settings deep link). The dynamic
// import itself takes at least one tick, which is enough in practice for
// the bridge to be ready; each plugin's own web fallback implementation
// (bundled regardless of platform) makes it safe to just always try.
//
// Every loader below returns { plugin } — a plain wrapper object — rather
// than the plugin itself. A Capacitor plugin is a Proxy whose `get` trap
// returns a callable for literally any property name, including "then".
// Returning the plugin directly from an async function makes JavaScript's
// own promise-resolution machinery see a callable `.then` and treat it as
// a thenable to unwrap, calling `plugin.then(...)` — which dispatches to
// Capacitor's "not implemented" handler for a method literally named
// "then" and throws, outside any try/catch here, on every platform
// (this app's actual root cause behind "Test Alarm does nothing": the
// hang/no-response was this exception aborting the click handler
// mid-flight, not a native permission issue). Wrapping in a plain object
// (no `.then` of its own) prevents the auto-unwrap.
async function getLocalNotifications() {
  try {
    const { LocalNotifications } = await import(
      '@capacitor/local-notifications'
    );
    return { plugin: LocalNotifications };
  } catch {
    return { plugin: null };
  }
}

async function getHaptics() {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    return { plugin: Haptics };
  } catch {
    return { plugin: null };
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

async function getAlarmEngine(): Promise<{ plugin: AlarmEnginePluginApi | null }> {
  try {
    const { registerPlugin, Capacitor } = await import('@capacitor/core');
    if (Capacitor.getPlatform() !== 'android') return { plugin: null };
    return { plugin: registerPlugin<AlarmEnginePluginApi>('AlarmEngine') };
  } catch {
    return { plugin: null };
  }
}

/** True only inside the native Android wrapper — gates the AlarmEngine UI/flow. */
export async function isAndroidNative(): Promise<boolean> {
  const { plugin } = await getAlarmEngine();
  return plugin !== null;
}

// ── Request notification permission ─────────────────────────────────
export async function requestAlarmPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  // Native Capacitor path
  const { plugin: LocalNotifications } = await getLocalNotifications();
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
  const { plugin: LocalNotifications } = await getLocalNotifications();
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
  const { plugin: LocalNotifications } = await getLocalNotifications();
  if (!LocalNotifications) return; // Web — nothing to schedule natively

  try {
    // Bail out if notification permission isn't granted yet — schedule()
    // itself (as of @capacitor/local-notifications 8.3.0) silently requests
    // permission on its own if it isn't already granted, and this function
    // runs automatically on every mount AND every 60 seconds via
    // PrayerAlarm's reschedule interval. Letting that implicit request fire
    // repeatedly in the background collides with any permission request
    // the user explicitly triggers (tapping Test Alarm, the onboarding
    // flow's Allow button, etc.) — Android can only track one outstanding
    // permission request at a time, so the colliding auto-request left the
    // explicit one hanging forever with no dialog and no resolution. This
    // was the actual cause of "Test Alarm doesn't respond" reports.
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

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
        // notification with a custom loud sound, not a 5-minute ring.
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
  const { plugin: LocalNotifications } = await getLocalNotifications();
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

// ── AlarmEngine: schedule/cancel the loud, 5-minute Android alarms ──
// Only appointments with useNativeAlarm=true go through here — everything
// else keeps using the plain LocalNotifications path above.
export async function scheduleAlarmEngineAlarms(
  appointments: PrayerAppointment[]
): Promise<void> {
  const { plugin: engine } = await getAlarmEngine();
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
  const { plugin: engine } = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.cancelAllAlarms();
  } catch {
    // ignore
  }
}

/** Stops a currently-ringing native alarm (e.g. from an in-app "Dismiss" control). */
export async function dismissNativeRinging(): Promise<void> {
  const { plugin: engine } = await getAlarmEngine();
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
  const { plugin: engine } = await getAlarmEngine();
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
  const { plugin: engine } = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestExactAlarmPermission();
  } catch {
    // ignore
  }
}

export async function checkFullScreenIntentPermission(): Promise<boolean> {
  const { plugin: engine } = await getAlarmEngine();
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
  const { plugin: engine } = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestFullScreenIntentPermission();
  } catch {
    // ignore
  }
}

export async function checkBatteryOptimizationExemption(): Promise<boolean> {
  const { plugin: engine } = await getAlarmEngine();
  if (!engine) return true;
  try {
    const { granted } = await engine.checkBatteryOptimizationExemption();
    return granted;
  } catch {
    return false;
  }
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  const { plugin: engine } = await getAlarmEngine();
  if (!engine) return;
  try {
    await engine.requestBatteryOptimizationExemption();
  } catch {
    // ignore
  }
}

function webVibrateFallback(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch {
      // ignore
    }
  }
}

// ── Vibrate — always tries native Haptics first, fire and forget ────
// Doesn't pre-branch on isCapacitorNative(): same early-mount timing risk
// as the other gates above. Falls back to the web Vibration API only if
// the native plugin genuinely isn't there.
export function nativeVibrate(): void {
  getHaptics().then(({ plugin: Haptics }) => {
    if (!Haptics) {
      webVibrateFallback();
      return;
    }
    Haptics.vibrate({ duration: 500 }).catch(() => webVibrateFallback());
  });
}

// ── Listen for when a native notification is tapped ────────────────
export async function listenNotificationTap(
  callback: (data: { appointmentId?: string; label?: string }) => void
): Promise<() => void> {
  const { plugin: LocalNotifications } = await getLocalNotifications();
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

// ── Listen for the app being reopened via a custom-scheme deep link ─
// Used to catch com.prayerfireaction.prayerfire://auth-callback?token=...,
// which is how Google sign-in hands the session back to the native app
// (its embedded WebView can't see the cookie Google's consent screen sets
// in the system browser, so the callback route redirects here instead —
// see /api/auth/google/callback).
export async function listenAuthDeepLink(
  callback: (url: string) => void
): Promise<() => void> {
  if (!isCapacitorNative()) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appUrlOpen', (event) => {
      callback(event.url);
    });
    return () => listener.remove();
  } catch {
    return () => {};
  }
}

// ── Listen for the Android hardware/gesture back button ─────────────
// Registering our own listener replaces Capacitor's default back
// behavior entirely, so the caller is responsible for deciding what
// "back" should do (navigate within the app vs. exit it).
export async function listenBackButton(
  callback: () => void
): Promise<() => void> {
  if (!isCapacitorNative()) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('backButton', () => {
      callback();
    });
    return () => listener.remove();
  } catch {
    return () => {};
  }
}

export async function exitNativeApp(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { App } = await import('@capacitor/app');
    App.exitApp();
  } catch {
    // ignore
  }
}

// ── Jump straight to this app's notification settings screen ────────
// Used when the "Test Alarm" flow finds notifications denied — instead of
// just telling the user where to go in Settings, this takes them there
// directly. Returns false (caller should fall back to text instructions)
// on iOS/web, where there's no equivalent deep link.
// ── App version, for the Settings page ───────────────────────────────
// Reads the *installed native build's* version — not anything from this
// JS bundle — so it stays truthful even when Play Store review/rollout
// lags behind the web deploy the user is actually looking at (versionName
// is what's shown to the user; versionCode is Play Console's internal
// build number, shown alongside it for support/debugging purposes).
export async function getAppVersionInfo(): Promise<{ version: string; build: string } | null> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return { version: info.version, build: info.build };
  } catch {
    return null;
  }
}

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.prayerfireaction.prayerfire';

export async function openAppNotificationSettings(): Promise<boolean> {
  try {
    const { NativeSettings, AndroidSettings } = await import(
      'capacitor-native-settings'
    );
    await NativeSettings.openAndroid({ option: AndroidSettings.AppNotification });
    return true;
  } catch {
    return false;
  }
}

// ── In-app browser (Chrome Custom Tabs) for OAuth ────────────────────
// Google requires sign-in to run outside a plain embedded WebView (it
// actively refuses to load in one), which is why Google sign-in has to
// leave the app's own WebView at all. Custom Tabs is the standard way
// around a full app-switch to Chrome: same underlying browser engine
// (so Google accepts it), but it opens as an overlay sliding up over the
// app instead of fully leaving it, and closes itself automatically the
// moment the OAuth flow redirects to this app's own deep link. Returns
// false (caller should fall back to a plain navigation) on iOS/web.
export async function openInAppBrowser(url: string): Promise<boolean> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, toolbarColor: '#059669' });
    return true;
  } catch {
    return false;
  }
}

// Chrome normally dismisses the Custom Tab on its own once the OAuth
// redirect hands off to this app's own deep-link scheme, but that's Chrome's
// behavior to rely on, not a guarantee — explicitly closing it here after
// the deep link lands removes any chance of it staying on screen over the
// now-signed-in app. A no-op if no Custom Tab is open.
export async function closeInAppBrowser(): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    // ignore
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
