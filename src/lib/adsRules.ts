/**
 * Ads (Google AdMob), the rules. The owner's brief: ONE banner on the Home screen and nowhere else. No ads on prayer, Bible,
 * read-aloud, alarm, groups, alert or any other screen; no app-open ads; never placed so that it invites accidental taps;
 * hidden for Partner and Leader subscribers (and while Free Premium Mode is on); only in the Android app.
 * Ads stay OFF until the admin turns them on (Admin -> Pricing -> Ads), which should only be done once the real AdMob ids are set.
 * No Capacitor or Node imports here, so the rules can be tested directly.
 */

/** Google's published TEST banner unit: shows labelled test ads, earns nothing. Used only when the admin enables ads without a real unit id. */
export const GOOGLE_TEST_BANNER_UNIT = "ca-app-pub-3940256099942544/6300978111";

export interface AdsConfig {
  enabled: boolean;
  /** The banner ad unit id to request. Google's test unit when none was set. */
  bannerUnitId: string;
  /** True when `bannerUnitId` is the test unit (ads on, but the real ids are not set yet). */
  testing: boolean;
}

export const ADS_OFF: AdsConfig = { enabled: false, bannerUnitId: "", testing: false };

/** A real AdMob banner unit id looks like ca-app-pub-1234567890123456/1234567890. Anything else is ignored. */
export function cleanUnitId(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(s) ? s : "";
}

/** The ads config from the stored settings (`ads_enabled` = "true", `ads_banner_unit` = the unit id). */
export function adsConfigFrom(settings: Record<string, string | undefined>): AdsConfig {
  if ((settings.ads_enabled ?? "").trim() !== "true") return ADS_OFF;
  const unit = cleanUnitId(settings.ads_banner_unit);
  return unit && unit !== GOOGLE_TEST_BANNER_UNIT ? { enabled: true, bannerUnitId: unit, testing: false } : { enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true };
}

/** Reads whatever came back from /api/ads-config into a safe config (anything odd means ads off). */
export function parseAdsConfig(v: unknown): AdsConfig {
  if (!v || typeof v !== "object") return ADS_OFF;
  const o = v as Record<string, unknown>;
  if (o.enabled !== true) return ADS_OFF;
  if (o.bannerUnitId === GOOGLE_TEST_BANNER_UNIT) return { enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true };
  const unit = cleanUnitId(o.bannerUnitId);
  return unit ? { enabled: true, bannerUnitId: unit, testing: false } : ADS_OFF;
}

/** The only screen with an ad. */
export const AD_PATHS = ["/"];

/** Whether the Home banner may be on screen right now. */
export function shouldShowBanner(a: { config: AdsConfig; androidApp: boolean; premium: boolean; pathname: string; canRequestAds: boolean }): boolean {
  return a.config.enabled && a.androidApp && !a.premium && a.canRequestAds && AD_PATHS.includes(a.pathname.replace(/\/+$/, "") || "/");
}
