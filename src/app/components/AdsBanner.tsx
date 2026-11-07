'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/context';
import { useAndroidApp } from '@/lib/useAndroidApp';
import { useCachedJson } from '@/lib/cachedJson';
import { ADS_OFF, parseAdsConfig, shouldShowBanner } from '@/lib/adsRules';
import { hideHomeBanner, initAds, isDebugBuild, showHomeBanner } from '@/lib/adsClient';
import { AD_LAUNCH_DELAY_MS, ADS_SUPPRESS_EVENT, adsSuppressed } from '@/lib/adsGuard';

/**
 * The one AdMob banner of the app: on the Home screen only, in the Android app only, never for Partner or Leader subscribers
 * (or while Free Premium Mode is on), and only after the person's ad consent choice. It sits at the very bottom of the screen and
 * the tab bar is lifted above it (CSS variable --ad-offset), so the ad can never cover or crowd a button. Renders nothing itself.
 */
export default function AdsBanner() {
  const pathname = usePathname() ?? '/';
  const { isPremium, authChecked } = useApp();
  const android = useAndroidApp();
  const data = useCachedJson<unknown>('/api/ads-config', 10 * 60 * 1000);
  const config = useMemo(() => (data ? parseAdsConfig(data) : ADS_OFF), [data]);
  const [canRequestAds, setCanRequestAds] = useState(false);
  // null until we know whether this is a development (debug) build; release builds use the real ids with test mode off.
  const [debug, setDebug] = useState<boolean | null>(null);
  // Nothing is requested or shown in the first seconds after the app opens, or at all after an alarm opened the app.
  const [launchDone, setLaunchDone] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    if (!android) return;
    let alive = true;
    isDebugBuild().then((d) => alive && setDebug(d));
    return () => {
      alive = false;
    };
  }, [android]);

  useEffect(() => {
    setSuppressed(adsSuppressed());
    const onSuppress = () => setSuppressed(true);
    window.addEventListener(ADS_SUPPRESS_EVENT, onSuppress);
    const timer = window.setTimeout(() => setLaunchDone(true), AD_LAUNCH_DELAY_MS);
    return () => {
      window.removeEventListener(ADS_SUPPRESS_EVENT, onSuppress);
      window.clearTimeout(timer);
    };
  }, []);

  // Consent and initialisation happen once, and only when ads are on for an app user who is not a subscriber.
  const wanted = config.enabled && android && authChecked && !isPremium && launchDone && !suppressed && debug !== null;
  useEffect(() => {
    if (!wanted || debug === null) return;
    let alive = true;
    initAds(debug).then((ok) => alive && setCanRequestAds(ok));
    return () => {
      alive = false;
    };
  }, [wanted, debug]);

  const show = wanted && shouldShowBanner({ config, androidApp: android, premium: isPremium || !authChecked, pathname, canRequestAds });
  useEffect(() => {
    // The tab bar sits 8px ABOVE the ad, never touching it, so a tap on the tab bar's bottom edge cannot land on the ad.
    const setOffset = (px: number) => document.documentElement.style.setProperty('--ad-offset', px > 0 ? `${Math.round(px) + 8}px` : '0px');
    if (!show) {
      setOffset(0);
      hideHomeBanner();
      return;
    }
    showHomeBanner(config, setOffset, debug === true);
    return () => {
      setOffset(0);
      hideHomeBanner();
    };
  }, [show, config, debug]);

  return null;
}
