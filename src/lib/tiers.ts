/**
 * What each plan includes, in one place. Free covers the daily prayer habit; Partner adds belonging and convenience;
 * Leader adds leading. `isPremium` (Partner or Leader, or Free Premium Mode) lifts every limit below. Server-side, the
 * study backup is enforced in /api/study; the other limits are enforced in the app.
 */
export const FREE_LIMITS = {
  /** Daily prayer reminders (the three prayer times every phone starts with). */
  reminders: 3,
  /** Sermon note sessions. */
  sermons: 3,
  /** Worship songs added to the player (files and links together). */
  songs: 3,
} as const;

/** Fasting plans open to everyone. The 21-day Daniel Fast and the 40-day Full Fast are Partner plans. */
export const FREE_FAST_DAYS: readonly number[] = [3, 7];

export type GateKind = 'reminders' | 'sermons' | 'songs' | 'fast';

export const GATE_MESSAGES: Record<GateKind, { title: string; body: string }> = {
  reminders: {
    title: 'More prayer reminders',
    body: `Free includes ${FREE_LIMITS.reminders} daily prayer reminders. Prayer Fire Partner lets you add as many as you like.`,
  },
  sermons: {
    title: 'More sermon notes',
    body: `Free keeps your first ${FREE_LIMITS.sermons} sermon sessions. Prayer Fire Partner has no limit, and backs them up.`,
  },
  songs: {
    title: 'More worship songs',
    body: `Free holds ${FREE_LIMITS.songs} worship songs in the player. Prayer Fire Partner has no limit.`,
  },
  fast: {
    title: 'Longer fasting plans',
    body: 'The 3-day and 7-day fasts are free. The 21-day Daniel Fast and the 40-day Full Fast are part of Prayer Fire Partner.',
  },
};

/** True when one more of something may be added: Partner and Leader always, Free until the limit is reached. */
export function canAddMore(isPremium: boolean, current: number, limit: number): boolean {
  return isPremium || current < limit;
}

export function isFastAllowed(isPremium: boolean, days: number): boolean {
  return isPremium || FREE_FAST_DAYS.includes(days);
}

/** Sermons that count towards the limit (deleted ones do not). */
export function countLiveSermons(sermons: Record<string, { deleted?: boolean }>): number {
  return Object.values(sermons).filter((s) => !s.deleted).length;
}

/** How many of `incoming` fit under the limit (all of them for Partner and Leader). */
export function roomFor(isPremium: boolean, current: number, limit: number, incoming: number): number {
  if (isPremium) return incoming;
  return Math.max(0, Math.min(incoming, limit - current));
}
