import assert from 'node:assert/strict';
import { ADS_OFF, GOOGLE_TEST_BANNER_UNIT, adsConfigFrom, cleanUnitId, parseAdsConfig, shouldShowBanner } from '../src/lib/adsRules.ts';

let checks = 0;
const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };

const REAL = 'ca-app-pub-1234567890123456/1234567890';

// ids
eq(cleanUnitId(REAL), REAL, 'a real unit id is accepted');
eq(cleanUnitId(`  ${REAL} `), REAL, '...with stray spaces trimmed');
eq(cleanUnitId('ca-app-pub-1234567890123456~1234567890'), '', 'an APP id (with ~) is not a unit id');
eq(cleanUnitId('ca-app-pub-3940256099942544/6300978111'), 'ca-app-pub-3940256099942544/6300978111', "Google's test unit has the same shape");
eq(cleanUnitId('hello'), '', 'junk is refused');
eq(cleanUnitId(undefined), '', 'nothing is refused');

// settings -> config: OFF unless the admin said "true"
eq(adsConfigFrom({}), ADS_OFF, 'ads are off by default');
eq(adsConfigFrom({ ads_enabled: 'false', ads_banner_unit: REAL }), ADS_OFF, 'a unit id alone does not turn ads on');
eq(adsConfigFrom({ ads_enabled: 'true', ads_banner_unit: REAL }), { enabled: true, bannerUnitId: REAL, testing: false }, 'on with the real unit');
eq(adsConfigFrom({ ads_enabled: 'true' }), { enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true }, 'on with no unit means TEST ads only');
eq(adsConfigFrom({ ads_enabled: 'true', ads_banner_unit: 'oops' }), { enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true }, 'a bad unit id falls back to TEST ads, never a wrong real unit');

// what the app reads back
eq(parseAdsConfig(null), ADS_OFF, 'no answer means off');
eq(parseAdsConfig({ enabled: 'true' }), ADS_OFF, 'only a real true turns it on');
eq(parseAdsConfig({ enabled: true, bannerUnitId: REAL, testing: false }), { enabled: true, bannerUnitId: REAL, testing: false }, 'real config round-trips');
eq(parseAdsConfig({ enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT }), { enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true }, 'test config round-trips');
eq(parseAdsConfig({ enabled: true, bannerUnitId: 'ca-app-pub-0000000000000000/0000000000x' }), ADS_OFF, 'a doubtful id turns ads off rather than guessing');

// where and for whom
const base = { config: { enabled: true, bannerUnitId: REAL, testing: false }, androidApp: true, premium: false, pathname: '/', canRequestAds: true };
eq(shouldShowBanner(base), true, 'Home, Android app, free user, consent given: the banner shows');
eq(shouldShowBanner({ ...base, config: ADS_OFF }), false, 'ads switched off');
eq(shouldShowBanner({ ...base, androidApp: false }), false, 'never on the website');
eq(shouldShowBanner({ ...base, premium: true }), false, 'never for Partner, Leader or Free Premium Mode');
eq(shouldShowBanner({ ...base, canRequestAds: false }), false, 'not before the consent choice allows ads');
for (const path of ['/bible', '/bible/verse/JHN/3/16', '/startup', '/workshop', '/schedule', '/groups', '/alerts', '/study', '/fasting', '/worship', '/prayer-verses', '/scripture', '/partner', '/admin', '/podcast', '/how-to']) {
  eq(shouldShowBanner({ ...base, pathname: path }), false, `no ad on ${path}`);
}
eq(shouldShowBanner({ ...base, pathname: '' }), true, 'an empty path is Home');

console.log(`ads: all ${checks} checks passed`);
