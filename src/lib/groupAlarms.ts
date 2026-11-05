import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';

/**
 * Group prayer times that ring a member's own alarm. When a signed-in member opens the groups screen, the groups they
 * are an active member of (with a prayer time) are saved here; PrayerAlarm adds them to the alarms it schedules, so the
 * phone rings at the group's prayer time even when the app is closed. Each member can switch a group's alarm off.
 *
 * A group's prayer time is set in WEST AFRICA TIME (Africa/Lagos, UTC+1, no daylight saving: the app's home time zone,
 * also used for the daily "I prayed today" count). It is converted to the phone's own clock here, so a member in London or
 * Nairobi rings at the right moment.
 */
export interface GroupAlarm {
  groupId: string;
  name: string;
  /** West Africa Time, HH:mm, as the leader set it. */
  prayerTime: string;
  callUrl: string | null;
}

const KEY = 'pfm_group_alarms';
const OFF_KEY = 'pfm_group_alarms_off';
export const GROUP_ALARMS_EVENT = 'pfm-group-alarms';

/** West Africa Time (UTC+1) HH:mm -> the same moment on this phone's clock, HH:mm. */
export function lagosToLocal(hhmm: string, now: Date = new Date()): string | null {
  const m = /^([0-2]\d):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 1, Number(m[2])));
  return `${String(utc.getHours()).padStart(2, '0')}:${String(utc.getMinutes()).padStart(2, '0')}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readGroupAlarms(): GroupAlarm[] {
  const list = readJson<unknown>(KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((a): a is GroupAlarm => !!a && typeof a === 'object' && typeof (a as GroupAlarm).groupId === 'string' && typeof (a as GroupAlarm).prayerTime === 'string');
}

function readOff(): string[] {
  const list = readJson<unknown>(OFF_KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function isGroupAlarmOn(groupId: string): boolean {
  return !readOff().includes(groupId);
}

function changed() {
  try {
    window.dispatchEvent(new Event(GROUP_ALARMS_EVENT));
  } catch {
    // not in a browser
  }
}

export function setGroupAlarmOn(groupId: string, on: boolean): void {
  try {
    const off = new Set(readOff());
    if (on) off.delete(groupId);
    else off.add(groupId);
    localStorage.setItem(OFF_KEY, JSON.stringify([...off]));
  } catch {
    // storage unavailable: the switch simply does not stick
  }
  changed();
}

/** Replaces the saved group alarms with the groups this person is an active member of (call it after loading the directory). */
export function saveGroupAlarms(groups: { id: string; name: string; prayerTime: string | null; callUrl: string | null; myStatus: string | null; status: string }[]): void {
  const alarms: GroupAlarm[] = groups
    .filter((g) => g.myStatus === 'active' && g.status === 'approved' && !!g.prayerTime)
    .map((g) => ({ groupId: g.id, name: g.name, prayerTime: g.prayerTime!, callUrl: g.callUrl }));
  try {
    const before = localStorage.getItem(KEY);
    const after = JSON.stringify(alarms);
    if (before === after) return;
    localStorage.setItem(KEY, after);
  } catch {
    return;
  }
  changed();
}

/** Forget every group alarm (sign-out). */
export function clearGroupAlarms(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  changed();
}

/** The alarms to schedule: one appointment per group that is switched on, at the phone's local time. */
export function groupAppointments(now: Date = new Date()): PrayerAppointment[] {
  const off = new Set(readOff());
  const out: PrayerAppointment[] = [];
  for (const a of readGroupAlarms()) {
    if (off.has(a.groupId)) continue;
    const time = lagosToLocal(a.prayerTime, now);
    if (!time) continue;
    out.push({
      id: `group_${a.groupId}`,
      time,
      label: `${a.name} - group prayer`,
      enabled: true,
      alarmTone: 'chime',
      useNativeAlarm: true,
      kind: 'group',
      callUrl: a.callUrl ?? '',
    });
  }
  return out;
}
