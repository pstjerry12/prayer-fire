/**
 * What the Free, Partner and Leader plans say they include, and how many members each Leader tier allows.
 * The defaults live here; the admin can override any of it from Admin -> Pricing -> "Plans and Leader tiers" without
 * a code change (stored as JSON in app_settings under `plan_config`). Prices are NOT here: they come from Google Play
 * (and are changed in Play Console or the admin Pricing tab).
 *
 * A feature marked `soon` shows a "Soon" tag instead of promising something that is not in the app yet. Remove the tag
 * (admin, or here) when the feature ships.
 */

export interface PlanFeature {
  text: string;
  soon?: boolean;
}

export interface PlanCopy {
  name: string;
  tagline: string;
  features: PlanFeature[];
}

/** One Leader tier: how many members the Leader's groups may have. `available: false` shows it as "Coming soon". */
export interface LeaderTier {
  id: string;
  name: string;
  memberLimit: number;
  available: boolean;
  /** The RevenueCat entitlement that unlocks this tier. The existing Leader subscription is `leader`. */
  entitlement: string;
}

export interface PlanConfig {
  free: PlanCopy;
  partner: PlanCopy;
  leader: PlanCopy;
  leaderTiers: LeaderTier[];
}

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  free: {
    name: 'Free',
    tagline: 'Everything you need to build a daily prayer life',
    features: [
      { text: 'Prayer points, voice and written prayers, Start-Up Prayer' },
      { text: 'The full Bible, with read-aloud in your phone\'s own voice' },
      { text: 'Prayer alarms and your daily schedule' },
      { text: 'Verse of the Day' },
      { text: 'Prayer wall', soon: true },
      { text: 'Full Prayer Vault: all 50 verses in every topic' },
      { text: 'Global Prayer Alerts', soon: true },
      { text: 'Join prayer groups with a code or link', soon: true },
      { text: 'Tutorial videos and the podcast', soon: true },
      { text: 'One-tap sharing' },
      { text: 'Shows small ads', soon: true },
    ],
  },
  partner: {
    name: 'Partner',
    tagline: 'Everything in Free, plus more ways to grow',
    features: [
      { text: 'Everything in Free' },
      { text: 'No ads', soon: true },
      { text: 'Premium Bible voices: stream or download', soon: true },
      { text: 'Devotional plans', soon: true },
      { text: 'Prayer Vault extras: verse audio, shareable verse images, saved collections, daily topic prayer plans', soon: true },
    ],
  },
  leader: {
    name: 'Leader',
    tagline: 'Everything in Partner, plus lead your own prayer groups',
    features: [
      { text: 'Everything in Partner' },
      { text: 'Create and manage prayer groups' },
      { text: 'Moderation: approve or remove members, delete posts' },
      { text: 'Group analytics and featured groups' },
      { text: 'Your members join free: only you subscribe' },
    ],
  },
  leaderTiers: [
    { id: 'leader_basic', name: 'Leader Basic', memberLimit: 50, available: true, entitlement: 'leader' },
    { id: 'leader_church', name: 'Leader Church', memberLimit: 500, available: false, entitlement: 'leader_church' },
  ],
};

const MAX_FEATURES = 20;

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function parseCopy(raw: unknown, fallback: PlanCopy): PlanCopy {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const features: PlanFeature[] = [];
  if (Array.isArray(o.features)) {
    for (const f of o.features.slice(0, MAX_FEATURES)) {
      if (!f || typeof f !== 'object') continue;
      const text = clean((f as Record<string, unknown>).text, 160);
      if (text) features.push({ text, ...((f as Record<string, unknown>).soon === true ? { soon: true } : {}) });
    }
  }
  return {
    name: clean(o.name, 40) || fallback.name,
    tagline: clean(o.tagline, 120) || fallback.tagline,
    features: features.length > 0 ? features : fallback.features,
  };
}

function parseTiers(raw: unknown, fallback: LeaderTier[]): LeaderTier[] {
  if (!Array.isArray(raw)) return fallback;
  const tiers: LeaderTier[] = [];
  const seen = new Set<string>();
  for (const t of raw.slice(0, 6)) {
    if (!t || typeof t !== 'object') continue;
    const o = t as Record<string, unknown>;
    const id = clean(o.id, 40).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const name = clean(o.name, 40);
    const limit = Math.floor(Number(o.memberLimit));
    if (!id || !name || seen.has(id) || !Number.isFinite(limit) || limit < 1) continue;
    seen.add(id);
    tiers.push({
      id,
      name,
      memberLimit: Math.min(limit, 100000),
      available: o.available === true,
      entitlement: clean(o.entitlement, 40) || 'leader',
    });
  }
  // A Leader must always be able to subscribe to something.
  if (tiers.length === 0 || !tiers.some((t) => t.available)) return fallback;
  return tiers;
}

/** Reads the stored JSON (or anything) into a safe, complete config: bad or missing parts fall back to the defaults. */
export function parsePlanConfig(raw: unknown): PlanConfig {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return DEFAULT_PLAN_CONFIG;
    }
  }
  if (!value || typeof value !== 'object') return DEFAULT_PLAN_CONFIG;
  const o = value as Record<string, unknown>;
  return {
    free: parseCopy(o.free, DEFAULT_PLAN_CONFIG.free),
    partner: parseCopy(o.partner, DEFAULT_PLAN_CONFIG.partner),
    leader: parseCopy(o.leader, DEFAULT_PLAN_CONFIG.leader),
    leaderTiers: parseTiers(o.leaderTiers, DEFAULT_PLAN_CONFIG.leaderTiers),
  };
}

/** The tier a subscriber is on, from the RevenueCat entitlement they hold (the existing `leader` one if unknown). */
export function leaderTierFor(config: PlanConfig, entitlement: string | null | undefined): LeaderTier {
  const wanted = entitlement || 'leader';
  return (
    config.leaderTiers.find((t) => t.available && t.entitlement === wanted) ??
    config.leaderTiers.find((t) => t.available) ??
    config.leaderTiers[0]
  );
}

/** How many members a Leader's groups may have. */
export function memberLimitFor(config: PlanConfig, entitlement: string | null | undefined): number {
  return leaderTierFor(config, entitlement).memberLimit;
}

/** "1 per line" text <-> features, for the admin editor. A line starting with "[soon] " gets the Soon tag. */
export function featuresToText(features: PlanFeature[]): string {
  return features.map((f) => (f.soon ? `[soon] ${f.text}` : f.text)).join('\n');
}

export function textToFeatures(text: string): PlanFeature[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^\[soon\]\s*/i.test(l) ? { text: l.replace(/^\[soon\]\s*/i, ''), soon: true } : { text: l }))
    .filter((f) => f.text);
}
