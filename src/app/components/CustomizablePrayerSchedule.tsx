'use client';

import { useState } from 'react';
import { Bell, Pencil, Check, Clock, Moon, Sun, Sunrise, Plus, Trash2, X, BellRing } from 'lucide-react';
import { cn } from '../utils/cn';
import { playChime } from '@/lib/clientUtils';

export interface PrayerAppointment {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    }
  };

  const toggle = (id: string) => {
    update(id, { enabled: !appointments.find((a) => a.id === id)?.enabled });
  };

  const remove = (id: string) => {
    onUpdate(appointments.filter((a) => a.id !== id));
  };

  const add = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    onUpdate([...appointments, { id: Date.now().toString(), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, label: 'New Prayer Watch', enabled: true }]);
  };

  const notificationGranted = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

  return (
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
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-4">
          <BellRing className="w-4 h-4 text-acc" />
          <span>
            {notificationGranted
              ? 'Alarms are ON — you will be notified at each prayer time.'
              : 'Enable notifications in your browser to get prayer-time alarms.'}
          </span>
        </div>

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
                      onClick={() => toggle(appt.id)}
                      className={cn('p-1 transition-colors', appt.enabled ? 'text-acc' : 'text-ink-ghost')}
                      title={appt.enabled ? 'Alarm on' : 'Alarm off'}
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
  );
}
