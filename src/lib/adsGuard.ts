/**
 * "No ad when an alarm opens the app." When the app is opened from a prayer alarm (the Pray Now button or a notification tap) ads are
 * switched off until the app is closed and opened again. Stored for the session only.
 */
const KEY = 'pfm_no_ads_session';
export const ADS_SUPPRESS_EVENT = 'pfm-ads-suppress';

export function suppressAdsForSession(): void {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage unavailable: the 4-second launch delay still applies */
  }
  try {
    window.dispatchEvent(new Event(ADS_SUPPRESS_EVENT));
  } catch {
    /* ignore */
  }
}

export function adsSuppressed(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Ads never request or show during this many milliseconds after the app opens, so nothing flashes at launch. */
export const AD_LAUNCH_DELAY_MS = 4000;
