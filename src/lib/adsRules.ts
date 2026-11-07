/**
 * Ads (Google AdMob), the rules. The owner's brief: ONE banner on the Home screen and nowhere else. No ads on prayer, Bible,
 * read-aloud, alarm, groups, alert or any other screen; no app-open ads; never placed so that it invites accidental taps;
 * hidden for Partner and Leader subscribers (and while Free Premium Mode is on); only in the Android app.
 * Ads stay OFF until the admin turns them on (Admin -> Pricing -> Ads), which should only be done once the real AdMob ids are set.
 * No Capacitor or Node imports here, so the rules can be tested directly.
 */

/** Prayer Fire's real AdMob banner ad unit for the Home screen. Used by every RELEASE build (public ids, not secrets). */
export const PRAYER_FIRE_BANNER_UNIT = "ca-app-pub-4222770426649249/8392702667";

/**
 * Prayer Fire's real AdMob APP id. It lives in android/app/src/main/AndroidManifest.xml (the `com.google.android.gms.ads.APPLICATION_ID` entry);
 * written here too so one test can check the two agree. Debug builds replace it with Google's sample id (android/app/src/debug/).
 */
export const PRAYER_FIRE_APP_ID = "ca-app-pub-4222770426649249~2306815627";

/** Google's published TEST banner unit: labelled test ads, earns nothing. Used ONLY by debug (development) builds, never by a release build. */
export const GOOGLE_TEST_BANNER_UNIT = "ca-app-pub-3940256099942544/6300978111";

export interface AdsConfig {
  enabled: boolean;
  /** The banner ad unit id a release build requests: the one the admin set, else Prayer Fire's own. Never Google's test unit. */
  bannerUnitId: string;
  /** Always false from the server: test ads are decided on the phone, by the build type (see bannerFor). */
  testing: boolean;
}

export const ADS_OFF: AdsConfig = { enabled: false, bannerUnitId: "", testing: false };

/** A real AdMob banner unit id looks like ca-app-pub-1234567890123456/1234567890. Anything else is ignored. */
export function cleanUnitId(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(s) ? s : "";
}

/** The ads config from the stored settings (`ads_enabled` = "true", `ads_banner_unit` = an optional unit id that replaces the default one). */
export function adsConfigFrom(settings: Record<string, string | undefined>): AdsConfig {
  if ((settings.ads_enabled ?? "").trim() !== "true") return ADS_OFF;
  const unit = cleanUnitId(settings.ads_banner_unit);
  // A release build never gets Google's test unit, even if someone typed it into the admin screen.
  return { enabled: true, bannerUnitId: unit && unit !== GOOGLE_TEST_BANNER_UNIT ? unit : PRAYER_FIRE_BANNER_UNIT, testing: false };
}

/** Reads whatever came back from /api/ads-config into a safe config (anything odd means ads off). */
export function parseAdsConfig(v: unknown): AdsConfig {
  if (!v || typeof v !== "object") return ADS_OFF;
  const o = v as Record<string, unknown>;
  if (o.enabled !== true) return ADS_OFF;
  const unit = cleanUnitId(o.bannerUnitId);
  if (!unit) return ADS_OFF;
  return { enabled: true, bannerUnitId: unit === GOOGLE_TEST_BANNER_UNIT ? PRAYER_FIRE_BANNER_UNIT : unit, testing: false };
}

/**
 * Which ad unit to request, and whether the request is a test. Release builds: the real unit and isTesting false, always.
 * Debug builds (a development APK): Google's test unit with isTesting true, so developers never tap real ads.
 */
export function bannerFor(config: AdsConfig, debugBuild: boolean): { adId: string; isTesting: boolean } {
  if (debugBuild) return { adId: GOOGLE_TEST_BANNER_UNIT, isTesting: true };
  return { adId: config.bannerUnitId === GOOGLE_TEST_BANNER_UNIT ? PRAYER_FIRE_BANNER_UNIT : config.bannerUnitId, isTesting: false };
}

/** The only screen with an ad. */
export const AD_PATHS = ["/"];

/** Whether the Home banner may be on screen right now. */
export function shouldShowBanner(a: { config: AdsConfig; androidApp: boolean; premium: boolean; pathname: string; canRequestAds: boolean }): boolean {
  return a.config.enabled && a.androidApp && !a.premium && a.canRequestAds && AD_PATHS.includes(a.pathname.replace(/\/+$/, "") || "/");
}
