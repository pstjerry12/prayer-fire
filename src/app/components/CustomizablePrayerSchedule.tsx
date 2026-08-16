'use client';

import { useState } from 'react';
import { Clock, Plus, Trash2, Pencil, Check, Bell, X, Moon, Sun, Sunrise } from 'lucide-react';
import { cn } from '../utils/cn';

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

// Every hour of the day — the dropdown options.
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
  if (id === 'morning') return <Sunrise className="w-4 h-4" />;
  if (id === 'noon') return <Sun className="w-4 h-4" />;
  if (id === 'midnight') return <Moon className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

// Display order: Midnight (12am) → Noon (12pm) → Morning (4am).
const RANK: Record<string, number> = { midnight: 0, noon: 1, morning: 2 };

export default function CustomizablePrayerSchedule({ appointments, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const sorted = [...appointments].sort((a, b) => {
    const ra = RANK[a.id] ?? 99;
    const rb = RANK[b.id] ?? 99;
    return ra - rb;
  });

  const update = (id: string, patch: Partial<PrayerAppointment>) => {
    onUpdate(appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const toggle = (id: string) => {
    update(id, { enabled: !appointments.find((a) => a.id === id)?.enabled });
  };

  const remove = (id: string) => {
    onUpdate(appointments.filter((a) => a.id !== id));
  };

  const startEdit = (appt: PrayerAppointment) => {
    setEditingId(appt.id);
    setEditLabel(appt.label);
  };

  const saveEdit = () => {
    if (!editingId) return;
    update(editingId, { label: editLabel.trim() || 'Prayer Watch' });
    setEditingId(null);
  };

  const add = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const appt: PrayerAppointment = {
      id: Date.now().toString(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      label: 'New Prayer Watch',
      enabled: true,
    };
    onUpdate([...appointments, appt]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">My Prayer Schedule</h2>
            <p className="text-xs text-slate-500">Three-times-a-day prayer habit</p>
          </div>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="p-5">
        <p className="text-sm text-slate-500 mb-4">
          Set your prayer watches and keep gentle reminders turned on.
        </p>

        {sorted.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No prayer times yet</p>
            <button onClick={add} className="mt-2 text-emerald-600 text-xs font-semibold hover:text-emerald-500">
              + Add your first prayer watch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {sorted.map((appt) => (
              <div
                key={appt.id}
                className={cn(
                  'rounded-xl border p-2.5 sm:p-3 flex flex-col transition-all',
                  appt.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                )}
              >
                {editingId === appt.id ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      autoFocus
                      className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-slate-900"
                    />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="flex-1 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold flex items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Icon + label */}
                    <div className="flex flex-col items-center text-center mb-2">
                      <span className="text-emerald-600 mb-1">{iconFor(appt.id)}</span>
                      <span className="text-slate-900 font-semibold text-[11px] leading-tight min-h-[2em] flex items-center justify-center">
                        {appt.label}
                      </span>
                    </div>

                    {/* Time dropdown */}
                    <div className="relative mb-2">
                      <select
                        value={appt.time}
                        onChange={(e) => update(appt.id, { time: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 text-center text-sm font-bold text-emerald-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTime(t)}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">▾</span>
                    </div>

                    {/* Reminder toggle */}
                    <div className="flex flex-col items-center gap-1.5 mt-auto">
                      <button
                        onClick={() => toggle(appt.id)}
                        className={cn(
                          'relative w-9 h-5 rounded-full transition-colors',
                          appt.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                        )}
                        title="Toggle reminder"
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            appt.enabled && 'translate-x-4'
                          )}
                        />
                      </button>
                      <span className="text-[10px] text-slate-500">
                        {appt.enabled ? 'On' : 'Off'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(appt)} className="p-1 text-slate-400 hover:text-emerald-600" title="Rename">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => remove(appt.id)} className="p-1 text-slate-400 hover:text-red-600" title="Remove">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
