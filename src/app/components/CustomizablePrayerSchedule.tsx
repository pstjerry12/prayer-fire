'use client';

import { useState } from 'react';
import { Bell, Pencil, Check, Clock, Moon, Sun, Sunrise, Plus, Trash2, X, BellRing, Volume2, Music, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import { playChime } from '@/lib/clientUtils';
import { useApp } from '@/app/context';
import { ALARM_TONES, previewAlarmTone, playAlarmTone, stopAlarm, type AlarmToneId } from '@/lib/alarmSound';
import { isCapacitorNative, nativeVibrate, requestAlarmPermission } from '@/lib/capacitorAlarm';

export interface PrayerAppointment {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  /** Chosen alarm tune id (see alarmSound.ts). */
  alarmTone?: string;
}

interface Props {
  appointments: PrayerAppointment[];
  onUpdate: (appointments: PrayerAppointment[]) => void;
}

const TIME_OPTIONS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00', '22:00', '23:00',
];

function formatTime(time: string): string {
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function iconFor(id: string) {
  if (id === 'morning') return <Sunrise className="w-5 h-5" />;
  if (id === 'noon') return <Sun className="w-5 h-5" />;
  if (id === 'midnight') return <Moon className="w-5 h-5" />;
  return <Clock className="w-5 h-5" />;
}

const RANK: Record<string, number> = { midnight: 0, noon: 1, morning: 2 };

export default function CustomizablePrayerSchedule({ appointments, onUpdate }: Props) {
  const { markPrayedToday } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alarmFor, setAlarmFor] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const today = new Date().toDateString();
    const out: Record<string, boolean> = {};
    for (const a of appointments) {
      out[a.id] = localStorage.getItem(`upp_prayer_done_${a.id}`) === today;
    }
    return out;
  });

  const sorted = [...appointments].sort((a, b) => (RANK[a.id] ?? 99) - (RANK[b.id] ?? 99));

  const update = (id: string, patch: Partial<PrayerAppointment>) => {
    onUpdate(appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const toggleDone = (appt: PrayerAppointment) => {
    const today = new Date().toDateString();
    const key = `upp_prayer_done_${appt.id}`;
    const isDone = done[appt.id];
    if (isDone) {
      localStorage.removeItem(key);
      setDone((d) => ({ ...d, [appt.id]: false }));
    } else {
      localStorage.setItem(key, today);
      setDone((d) => ({ ...d, [appt.id]: true }));
      playChime();
      markPrayedToday();
    }
  };

  const toggle = (id: string) => {
    update(id, { enabled: !appointments.find((a) => a.id === id)?.enabled });
  };

  const remove = (id: string) => {
    onUpdate(appointments.filter((a) => a.id !== id));
  };

  // The appointment whose alarm settings sheet is currently open.
  const alarmAppt = appointments.find((a) => a.id === alarmFor) || null;

  const add = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    onUpdate([...appointments, { id: Date.now().toString(), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, label: 'New Prayer Watch', enabled: true }]);
  };

  const notificationGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

  return (
    <>
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-acc-soft text-acc">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-ink">My Prayer Daily Schedule</h2>
            <p className="text-xs text-ink-muted">Tap a session when you complete it</p>
          </div>
        </div>
        <button onClick={add} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-2">
          <BellRing className="w-4 h-4 text-acc" />
          <span>
            {notificationGranted
              ? 'Alarms are ON — you will be notified at each prayer time.'
              : 'Enable notifications in your browser to get prayer-time alarms.'}
          </span>
        </div>

        {/* ── Test Alarm Button ────────────────────────────────── */}
        <button
          onClick={async () => {
            // Make sure we have permission first
            if (!notificationGranted) {
              const result = await requestAlarmPermission();
              if (result !== 'granted') {
                alert('Please allow notifications first, then try again.');
                return;
              }
            }
            // Fire a test notification + sound + vibration right now
            try {
              const n = new Notification('🔥 Prayer Time', {
                body: 'Test alarm — your prayer alarm is working! ✅',
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'prayer-alarm-test',
                requireInteraction: true,
              });
              n.onclick = () => { window.focus(); n.close(); stopAlarm(); };
            } catch {
              // Some browsers need service worker for notifications
            }
            nativeVibrate();
            playAlarmTone('classic', 5);
          }}
          className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-400 transition-colors shadow-md"
        >
          <Zap className="w-4 h-4" />
          Test Alarm Now
        </button>

        {sorted.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-ink-muted text-sm">No prayer times yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {sorted.map((appt) => {
              const isDone = done[appt.id];
              const isEditing = editingId === appt.id;
              return (
                <div
                  key={appt.id}
                  className={cn(
                    'rounded-xl border p-3 flex flex-col text-center transition-all',
                    isDone
                      ? 'bg-acc-soft border-acc-edge'
                      : appt.enabled
                        ? 'bg-card border-edge'
                        : 'bg-card-2 border-edge opacity-60'
                  )}
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-1.5">
                    <span className={cn(isDone ? 'text-acc' : 'text-ink-muted')}>{iconFor(appt.id)}</span>
                  </div>

                  {/* Label */}
                  <span className="text-ink font-semibold text-[11px] leading-tight mb-1.5">{appt.label}</span>

                  {/* Time (editable) */}
                  {isEditing ? (
                    <div className="mb-1.5 flex flex-col gap-1">
                      <select
                        value={appt.time}
                        onChange={(e) => update(appt.id, { time: e.target.value })}
                        className="w-full bg-card border border-edge-strong rounded-md px-1 py-1 text-xs font-bold text-acc-strong appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                      </select>
                      <button onClick={() => setEditingId(null)} className="w-full py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Done
                      </button>
                    </div>
                  ) : (
                    <span className="text-acc-strong font-bold text-base mb-1.5">{formatTime(appt.time)}</span>
                  )}

                  {/* Clickable completion box */}
                  <button
                    onClick={() => toggleDone(appt)}
                    disabled={isEditing}
                    className={cn(
                      'w-full py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1',
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-card-3 text-ink-muted hover:bg-acc-soft-2 hover:text-acc-strong border border-dashed border-edge-strong'
                    )}
                  >
                    {isDone ? (<><Check className="w-3.5 h-3.5" /> Done</>) : 'Mark done'}
                  </button>

                  {/* Edit / alarm / remove controls */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {!isEditing && (
                      <button onClick={() => setEditingId(appt.id)} className="p-1 text-ink-faint hover:text-acc" title="Edit time">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setAlarmFor(appt.id)}
                      className={cn('p-1 transition-colors', appt.enabled ? 'text-acc' : 'text-ink-ghost')}
                      title="Alarm settings"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(appt.id)} className="p-1 text-ink-faint hover:text-danger" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* ── Alarm settings sheet ─────────────────────────────── */}
    {alarmAppt && (
      <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
        <div className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-edge shadow-2xl overflow-hidden animate-pop max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-edge flex items-center justify-between sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-acc-soft text-acc">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <p className="font-bold text-ink text-sm">Alarm Settings</p>
                <p className="text-ink-muted text-xs">{alarmAppt.label}</p>
              </div>
            </div>
            <button onClick={() => { stopAlarm(); setAlarmFor(null); }} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Time + on/off */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-muted">Prayer time</label>
                <select
                  value={alarmAppt.time}
                  onChange={(e) => update(alarmAppt.id, { time: e.target.value })}
                  className="mt-1 bg-card border border-edge-strong rounded-lg px-3 py-2 text-base font-bold text-acc-strong"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <button
                onClick={() => toggle(alarmAppt.id)}
                className={cn('px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all', alarmAppt.enabled ? 'bg-emerald-600 text-white' : 'bg-card-3 text-ink-muted')}
              >
                {alarmAppt.enabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {alarmAppt.enabled ? 'Alarm ON' : 'Alarm OFF'}
              </button>
            </div>

            {/* Tune picker */}
            <div>
              <label className="text-xs font-semibold text-ink-muted flex items-center gap-1 mb-2">
                <Music className="w-3.5 h-3.5" /> Choose your alarm sound
              </label>
              <div className="space-y-1.5">
                {ALARM_TONES.map((tone) => {
                  const selected = (alarmAppt.alarmTone || 'classic') === tone.id;
                  return (
                    <div
                      key={tone.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-2.5 transition-all',
                        selected ? 'border-emerald-500 bg-acc-soft/50' : 'border-edge bg-card-2 hover:border-edge-strong'
                      )}
                    >
                      <span className="text-xl">{tone.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">{tone.name}</p>
                        <p className="text-[11px] text-ink-muted truncate">{tone.description}</p>
                      </div>
                      <button
                        onClick={() => previewAlarmTone(tone.id)}
                        className="p-2 rounded-lg text-ink-muted hover:text-acc hover:bg-card-3"
                        title="Preview"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { update(alarmAppt.id, { alarmTone: tone.id }); stopAlarm(); }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold',
                          selected ? 'bg-emerald-600 text-white' : 'bg-card-3 text-ink-muted hover:bg-card'
                        )}
                      >
                        {selected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test + save */}
            <div className="flex gap-2">
              <button
                onClick={() => playAlarmTone((alarmAppt.alarmTone as AlarmToneId) || 'classic', 6)}
                className="flex-1 py-2.5 bg-warn text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90"
              >
                <Volume2 className="w-4 h-4" /> Test Alarm
              </button>
              <button onClick={() => stopAlarm()} className="px-4 py-2.5 bg-card-3 text-ink-muted rounded-xl font-bold text-sm hover:bg-card">
                Stop
              </button>
            </div>

            <button onClick={() => { stopAlarm(); setAlarmFor(null); }} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500">
              Done
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
