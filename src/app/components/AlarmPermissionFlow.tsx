'use client';

import { useEffect, useState } from 'react';
import { BellRing, ShieldAlert, MonitorSmartphone, BatteryCharging, X } from 'lucide-react';
import {
  requestAlarmPermission,
  checkExactAlarmPermission,
  requestExactAlarmPermission,
  checkFullScreenIntentPermission,
  requestFullScreenIntentPermission,
  checkBatteryOptimizationExemption,
  requestBatteryOptimizationExemption,
} from '@/lib/capacitorAlarm';

type Step = 'notifications' | 'exact_alarm' | 'full_screen' | 'battery' | 'done';

const STEP_ORDER: Step[] = ['notifications', 'exact_alarm', 'full_screen', 'battery', 'done'];

interface StepContent {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  /** Opens the real system prompt / Settings screen for this step. */
  request: () => Promise<void>;
  /** Whether this step needs a settings round-trip (so we show a "Continue" step) vs. an in-app dialog. */
  goesToSettings: boolean;
}

/**
 * Sequenced permission flow for "Ring like an alarm": one plain-language
 * explanation dialog before each system prompt, in the order Android 12+/
 * 13+/14+ actually require them. Steps whose permission is already granted
 * (or not applicable on the device's Android version — e.g. full-screen
 * intent is a no-op below API 34) are skipped automatically.
 */
export default function AlarmPermissionFlow({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>('notifications');
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Skip any step whose permission is already granted / not applicable.
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    (async () => {
      let already = false;
      if (step === 'exact_alarm') already = await checkExactAlarmPermission();
      if (step === 'full_screen') already = await checkFullScreenIntentPermission();
      if (step === 'battery') already = await checkBatteryOptimizationExemption();
      if (cancelled) return;
      setChecking(false);
      if (already) goToNext();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goToNext = () => {
    setWaiting(false);
    const idx = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[idx + 1] ?? 'done';
    if (next === 'done') onComplete();
    else setStep(next);
  };

  const content: Record<Exclude<Step, 'done'>, StepContent> = {
    notifications: {
      icon: <BellRing className="w-6 h-6" />,
      title: 'Allow Prayer Notifications',
      body: 'Prayer Fire needs notification permission so your phone can ring at your prayer times — even when the app is closed.',
      cta: 'Allow',
      goesToSettings: false,
      request: async () => { await requestAlarmPermission(); goToNext(); },
    },
    exact_alarm: {
      icon: <ShieldAlert className="w-6 h-6" />,
      title: 'Allow Exact Alarms',
      body: "Android needs special permission to ring your alarm at the exact second, or it can drift by several minutes. You'll be sent to Settings — turn on \"Alarms & reminders\" for Prayer Fire, then come back here.",
      cta: 'Open Settings',
      goesToSettings: true,
      request: async () => { setWaiting(true); await requestExactAlarmPermission(); },
    },
    full_screen: {
      icon: <MonitorSmartphone className="w-6 h-6" />,
      title: 'Allow Full-Screen Alarms',
      body: "On newer Android versions, apps need explicit permission to show a full-screen ringing screen — even over your lock screen. You'll be sent to Settings — turn this on for Prayer Fire, then come back here.",
      cta: 'Open Settings',
      goesToSettings: true,
      request: async () => { setWaiting(true); await requestFullScreenIntentPermission(); },
    },
    battery: {
      icon: <BatteryCharging className="w-6 h-6" />,
      title: 'Allow Background Activity',
      body: 'Some phones (Samsung and Xiaomi in particular) aggressively kill background alarms to save battery. Exempt Prayer Fire so your alarm isn\'t silently cancelled.',
      cta: 'Allow',
      goesToSettings: true,
      request: async () => { setWaiting(true); await requestBatteryOptimizationExemption(); },
    },
  };

  if (step === 'done') return null;
  const s = content[step];

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-edge shadow-2xl p-5 animate-pop">
        <div className="flex items-start justify-between mb-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-acc-soft text-acc">
            {s.icon}
          </span>
          <button onClick={onCancel} className="p-1 text-ink-faint hover:text-ink" title="Not now">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-bold text-ink text-base mb-1.5">{s.title}</h3>
        <p className="text-ink-muted text-sm leading-relaxed mb-5">{s.body}</p>

        {checking ? (
          <div className="py-2 text-center text-ink-faint text-xs">Checking…</div>
        ) : waiting ? (
          <>
            <p className="text-ink-faint text-xs mb-3 text-center">
              Once you&apos;ve enabled it in Settings, come back and tap Continue.
            </p>
            <button
              onClick={goToNext}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500"
            >
              Continue
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={s.request}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500"
            >
              {s.cta}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-3 bg-card-3 text-ink-muted rounded-xl font-bold text-sm hover:bg-card"
            >
              Not now
            </button>
          </div>
        )}

        {s.goesToSettings && !waiting && !checking && (
          <p className="text-ink-faint text-[11px] mt-3 text-center">
            This one has no in-app switch — Android only offers it from Settings.
          </p>
        )}
      </div>
    </div>
  );
}
