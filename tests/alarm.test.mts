import assert from 'node:assert/strict';
import { isPrayNowLink } from '../src/lib/capacitorAlarm.ts';

// The alarm's Pray Now button opens <app scheme>://pray — it must be told apart from the Google sign-in link.
assert.equal(isPrayNowLink('com.prayerfireaction.prayerfire://pray'), true);
assert.equal(isPrayNowLink('com.prayerfireaction.prayerfire://pray/'), true);
assert.equal(isPrayNowLink('com.prayerfireaction.prayerfire://auth-callback?token=abc'), false);
assert.equal(isPrayNowLink('https://prayer-fire.vercel.app/pray'), false);
assert.equal(isPrayNowLink('com.prayerfireaction.prayerfire://prayer-groups'), false);

console.log('alarm: all checks passed');
