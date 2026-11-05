'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/context';
import { useAndroidApp } from '@/lib/useAndroidApp';
import { useCachedJson } from '@/lib/cachedJson';
import { ADS_OFF, parseAdsConfig, shouldShowBanner } from '@/lib/adsRules';
import { hideHomeBanner, initAds, showHomeBanner } from '@/lib/adsClient';

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

  // Consent and initialisation happen once, and only when ads are on for an app user who is not a subscriber.
  const wanted = config.enabled && android && authChecked && !isPremium;
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    initAds(config.testing).then((ok) => alive && setCanRequestAds(ok));
    return () => {
      alive = false;
    };
  }, [wanted, config.testing]);

  const show = shouldShowBanner({ config, androidApp: android, premium: isPremium || !authChecked, pathname, canRequestAds });
  useEffect(() => {
    const setOffset = (px: number) => document.documentElement.style.setProperty('--ad-offset', `${Math.max(0, Math.round(px))}px`);
    if (!show) {
      setOffset(0);
      hideHomeBanner();
      return;
    }
    showHomeBanner(config, setOffset);
    return () => {
      setOffset(0);
      hideHomeBanner();
    };
  }, [show, config]);

  return null;
}
