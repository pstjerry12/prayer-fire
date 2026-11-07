import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ADS_OFF, GOOGLE_TEST_BANNER_UNIT, PRAYER_FIRE_APP_ID, PRAYER_FIRE_BANNER_UNIT, adsConfigFrom, bannerFor, cleanUnitId, parseAdsConfig, shouldShowBanner,
} from '../src/lib/adsRules.ts';

let checks = 0;
const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };

const OTHER = 'ca-app-pub-1234567890123456/1234567890';

// the real ids are exactly the ones from AdMob
eq(PRAYER_FIRE_BANNER_UNIT, 'ca-app-pub-4222770426649249/8392702667', 'real Home banner unit');
eq(PRAYER_FIRE_APP_ID, 'ca-app-pub-4222770426649249~2306815627', 'real app id');
eq(cleanUnitId(PRAYER_FIRE_BANNER_UNIT), PRAYER_FIRE_BANNER_UNIT, 'the real unit passes the id check');
eq(cleanUnitId(PRAYER_FIRE_APP_ID), '', 'an APP id (with ~) is not a unit id');

// ids
eq(cleanUnitId(OTHER), OTHER, 'a unit id is accepted');
eq(cleanUnitId(`  ${OTHER} `), OTHER, '...with stray spaces trimmed');
eq(cleanUnitId('hello'), '', 'junk is refused');
eq(cleanUnitId(undefined), '', 'nothing is refused');

// settings -> config: OFF unless the admin said "true"; a release build NEVER gets Google's test unit
eq(adsConfigFrom({}), ADS_OFF, 'ads are off by default');
eq(adsConfigFrom({ ads_enabled: 'false', ads_banner_unit: OTHER }), ADS_OFF, 'a unit id alone does not turn ads on');
eq(adsConfigFrom({ ads_enabled: 'true' }), { enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }, 'on with no unit: the real Prayer Fire unit');
eq(adsConfigFrom({ ads_enabled: 'true', ads_banner_unit: OTHER }), { enabled: true, bannerUnitId: OTHER, testing: false }, 'an admin-entered unit replaces the default');
eq(adsConfigFrom({ ads_enabled: 'true', ads_banner_unit: 'oops' }), { enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }, 'a bad unit falls back to the real Prayer Fire unit');
eq(adsConfigFrom({ ads_enabled: 'true', ads_banner_unit: GOOGLE_TEST_BANNER_UNIT }), { enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }, "Google's test unit typed into admin is ignored");

// what the app reads back
eq(parseAdsConfig(null), ADS_OFF, 'no answer means off');
eq(parseAdsConfig({ enabled: 'true' }), ADS_OFF, 'only a real true turns it on');
eq(parseAdsConfig({ enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }), { enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }, 'real config round-trips');
eq(parseAdsConfig({ enabled: true, bannerUnitId: GOOGLE_TEST_BANNER_UNIT, testing: true }), { enabled: true, bannerUnitId: PRAYER_FIRE_BANNER_UNIT, testing: false }, 'a test unit coming back is replaced by the real one');
eq(parseAdsConfig({ enabled: true, bannerUnitId: 'ca-app-pub-0000000000000000/0000000000x' }), ADS_OFF, 'a doubtful id turns ads off rather than guessing');

// release vs debug
const cfg = adsConfigFrom({ ads_enabled: 'true' });
eq(bannerFor(cfg, false), { adId: PRAYER_FIRE_BANNER_UNIT, isTesting: false }, 'RELEASE: real unit, isTesting false');
eq(bannerFor({ ...cfg, bannerUnitId: GOOGLE_TEST_BANNER_UNIT }, false), { adId: PRAYER_FIRE_BANNER_UNIT, isTesting: false }, 'RELEASE never uses the test unit, even if handed it');
eq(bannerFor(cfg, true), { adId: GOOGLE_TEST_BANNER_UNIT, isTesting: true }, 'DEBUG: Google test unit, isTesting true');

// where and for whom
const base = { config: cfg, androidApp: true, premium: false, pathname: '/', canRequestAds: true };
eq(shouldShowBanner(base), true, 'Home, Android app, free user, consent given: the banner shows');
eq(shouldShowBanner({ ...base, config: ADS_OFF }), false, 'ads switched off');
eq(shouldShowBanner({ ...base, androidApp: false }), false, 'never on the website');
eq(shouldShowBanner({ ...base, premium: true }), false, 'never for Partner, Leader or Free Premium Mode');
eq(shouldShowBanner({ ...base, canRequestAds: false }), false, 'not before the consent choice allows ads');
for (const path of ['/bible', '/bible/verse/JHN/3/16', '/startup', '/workshop', '/schedule', '/groups', '/alerts', '/study', '/fasting', '/worship', '/prayer-verses', '/scripture', '/partner', '/admin', '/podcast', '/how-to', '/journal', '/about', '/privacy']) {
  eq(shouldShowBanner({ ...base, pathname: path }), false, `no ad on ${path}`);
}
eq(shouldShowBanner({ ...base, pathname: '' }), true, 'an empty path is Home');

// the Android files agree with the code, and no test id is in the release path
const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const debugManifest = readFileSync(new URL('../android/app/src/debug/AndroidManifest.xml', import.meta.url), 'utf8');
const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
assert.ok(manifest.includes(`android:value="${PRAYER_FIRE_APP_ID}"`), 'main manifest carries the real app id'); checks++;
assert.ok(!manifest.includes('3940256099942544'), 'main (release) manifest has no test id'); checks++;
assert.ok(/<uses-permission[^>]*android:name="com.google.android.gms.permission.AD_ID"/.test(manifest), 'main manifest declares the AD_ID permission (Play requires it with the advertising ID declaration)'); checks++;
assert.ok(debugManifest.includes('ca-app-pub-3940256099942544~3347511713') && debugManifest.includes('tools:replace="android:value"'), 'the debug manifest swaps in the sample id'); checks++;
assert.ok(!gradle.includes('3940256099942544'), 'build.gradle has no test id'); checks++;
assert.ok(/debug\s*\{[^}]*versionNameSuffix "-debug"/.test(gradle), 'debug builds carry the -debug version suffix the app uses to detect them'); checks++;

console.log(`ads: all ${checks} checks passed`);
