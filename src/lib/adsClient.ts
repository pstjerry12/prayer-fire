import { Capacitor } from '@capacitor/core';
import { bannerFor, type AdsConfig } from './adsRules';

/**
 * Talks to the AdMob plugin (Android app only). Everything is wrapped so that a missing plugin, an old build without it, or an
 * ad that fails to load can never break the app: the worst case is that no ad shows.
 *
 *  1. Consent first (Google's UMP): in the EEA, UK and similar places the person must make a choice before any ad is requested.
 *  2. Then initialise with the strictest content rating (G) and show ONE adaptive banner under the Home screen's tab bar.
 *  3. Category blocking (gambling, dating, alcohol, astrology ...) is set in the AdMob console (Blocking controls), not in code.
 */
type AdMobModule = typeof import('@capacitor-community/admob');

let initPromise: Promise<boolean> | null = null;
let privacyOptionsRequired = false;
let bannerListeners: { remove: () => Promise<void> }[] = [];

async function load(): Promise<AdMobModule | null> {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('AdMob')) return null;
    return await import('@capacitor-community/admob');
  } catch {
    return null;
  }
}

/**
 * True only for a DEBUG (development) build of the Android app. Those carry the version suffix "-debug" (and the app id suffix ".debug"),
 * see android/app/build.gradle. A release build, and anything that cannot be read, counts as a release build: real ids, no test mode.
 */
export async function isDebugBuild(): Promise<boolean> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return /-debug$/i.test(String(info.version)) || /\.debug$/i.test(String(info.id));
  } catch {
    return false;
  }
}

/** Runs consent + initialisation once. Resolves true when ads may be requested. */
export function initAds(testing: boolean): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await load();
    if (!mod) return false;
    const { AdMob, AdmobConsentStatus, MaxAdContentRating } = mod;
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
      privacyOptionsRequired = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
      if (!info.canRequestAds) return false;
      await AdMob.initialize({ initializeForTesting: testing, maxAdContentRating: MaxAdContentRating.General });
      return true;
    } catch {
      return false;
    }
  })();
  return initPromise;
}

/** True when the person is in a region where Google requires an "Ad privacy choices" entry in Settings. */
export const adPrivacyOptionsRequired = () => privacyOptionsRequired;

/** Opens Google's privacy-options form (the "Ad privacy choices" button in Settings). */
export async function openAdPrivacyOptions(): Promise<void> {
  const mod = await load();
  try {
    await mod?.AdMob.showPrivacyOptionsForm();
  } catch {
    /* nothing to show */
  }
}

/** Shows the Home banner at the very bottom of the screen. `onSize` gets its height so the tab bar can sit above it, never under it. */
export async function showHomeBanner(config: AdsConfig, onSize: (heightPx: number) => void, debugBuild: boolean): Promise<boolean> {
  const mod = await load();
  if (!mod) return false;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } = mod;
    bannerListeners.push(await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => onSize(size.height)));
    bannerListeners.push(await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => onSize(0)));
    const { adId, isTesting } = bannerFor(config, debugBuild);
    await AdMob.showBanner({ adId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting });
    return true;
  } catch {
    onSize(0);
    return false;
  }
}

/** Removes the banner and its listeners (leaving Home, signing in as a subscriber, ads switched off). */
export async function hideHomeBanner(): Promise<void> {
  const mod = await load();
  if (!mod) return;
  try {
    const handles = bannerListeners;
    bannerListeners = [];
    await Promise.all(handles.map((h) => h.remove().catch(() => {})));
    await mod.AdMob.removeBanner();
  } catch {
    /* no banner was showing */
  }
}
