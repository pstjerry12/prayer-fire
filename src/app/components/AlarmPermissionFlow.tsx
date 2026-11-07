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
import { useI18n } from '@/app/i18n';

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
  const { t } = useI18n();
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
      title: t('ui.allowPrayerNotifications'),
      body: t('ui.prayerFireNeedsNotificationPermission'),
      cta: t('ui.allow'),
      goesToSettings: false,
      request: async () => { await requestAlarmPermission(); goToNext(); },
    },
    exact_alarm: {
      icon: <ShieldAlert className="w-6 h-6" />,
      title: t('ui.allowExactAlarms'),
      body: t('ui.androidNeedsSpecialPermissionTo'),
      cta: t('customizablePrayerSchedule.openSettings'),
      goesToSettings: true,
      request: async () => { setWaiting(true); await requestExactAlarmPermission(); },
    },
    full_screen: {
      icon: <MonitorSmartphone className="w-6 h-6" />,
      title: t('ui.allowFullScreenAlarms'),
      body: "On newer Android versions, apps need explicit permission to show a full-screen ringing screen — even over your lock screen. You'll be sent to Settings — turn this on for Prayer Fire, then come back here.",
      cta: t('customizablePrayerSchedule.openSettings'),
      goesToSettings: true,
      request: async () => { setWaiting(true); await requestFullScreenIntentPermission(); },
    },
    battery: {
      icon: <BatteryCharging className="w-6 h-6" />,
      title: t('ui.allowBackgroundActivity'),
      body: t('ui.somePhonesSamsungAndXiaomi'),
      cta: t('ui.allow'),
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
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-acc-soft text-acc-strong">
            {s.icon}
          </span>
          <button onClick={onCancel} className="p-1 text-ink-faint hover:text-ink" title={t('alarmPermissionFlow.notNow')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-bold text-ink text-base mb-1.5">{s.title}</h3>
        <p className="text-ink-muted text-sm leading-relaxed mb-5">{s.body}</p>

        {checking ? (
          <div className="py-2 text-center text-ink-faint text-xs">{t('alarmPermissionFlow.checking')}</div>
        ) : waiting ? (
          <>
            <p className="text-ink-faint text-xs mb-3 text-center">{t('alarmPermissionFlow.onceYouVeEnabledIt')}</p>
            <button
              onClick={goToNext}
              className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold text-sm hover:bg-acc-hover"
            >{t('alarmPermissionFlow.continue')}</button>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={s.request}
              className="flex-1 py-3 bg-acc text-on-acc rounded-xl font-bold text-sm hover:bg-acc-hover"
            >
              {s.cta}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-3 bg-card-3 text-ink-muted rounded-xl font-bold text-sm hover:bg-card"
            >{t('alarmPermissionFlow.notNow')}</button>
          </div>
        )}

        {s.goesToSettings && !waiting && !checking && (
          <p className="text-ink-faint text-[0.6875rem] mt-3 text-center">{t('alarmPermissionFlow.thisOneHasNoIn')}</p>
        )}
      </div>
    </div>
  );
}
