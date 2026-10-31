/**
 * "Free Premium Mode": the admin can open all premium features for everyone, optionally between two
 * dates. It switches itself off at the end date: nothing needs to run, the answer is worked out
 * from the saved settings every time it is asked.
 */
export const FREE_MODE_KEYS = {
  enabled: "free_mode_enabled", // "true" | "false"
  start: "free_mode_start", // ISO date-time, optional
  end: "free_mode_end", // ISO date-time, optional
  existing: "free_mode_existing", // "keep" (keep charging subscribers) | "defer" (defer their billing)
} as const;

export interface FreeModeSettings {
  enabled: boolean;
  start: string | null;
  end: string | null;
  existing: "keep" | "defer";
}

export function parseFreeModeSettings(map: Record<string, string | undefined>): FreeModeSettings {
  const clean = (v: string | undefined) => (v && !Number.isNaN(Date.parse(v)) ? v : null);
  return {
    enabled: map[FREE_MODE_KEYS.enabled] === "true",
    start: clean(map[FREE_MODE_KEYS.start]),
    end: clean(map[FREE_MODE_KEYS.end]),
    existing: map[FREE_MODE_KEYS.existing] === "defer" ? "defer" : "keep",
  };
}

/** On means: switched on, the start date (if any) has passed, and the end date (if any) has not. */
export function computeFreeMode(s: FreeModeSettings, now: Date = new Date()): { active: boolean; endsAt: string | null } {
  if (!s.enabled) return { active: false, endsAt: null };
  if (s.start && Date.parse(s.start) > now.getTime()) return { active: false, endsAt: null };
  if (s.end && Date.parse(s.end) <= now.getTime()) return { active: false, endsAt: null };
  return { active: true, endsAt: s.end };
}
