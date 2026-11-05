import assert from 'node:assert/strict';
import { lagosToLocal } from '../src/lib/groupAlarms.ts';

// Run with TZ set to check the conversion on different phones' clocks.
const tz = process.env.TZ ?? '';
const day = new Date('2026-11-04T12:00:00Z');
if (tz === 'Africa/Lagos') {
  assert.equal(lagosToLocal('05:30', day), '05:30');
  assert.equal(lagosToLocal('00:00', day), '00:00');
} else if (tz === 'Europe/London') {
  // London is UTC+0 in November: Lagos 06:00 is 05:00 there; Lagos 00:30 is 23:30 the day before.
  assert.equal(lagosToLocal('06:00', day), '05:00');
  assert.equal(lagosToLocal('00:30', day), '23:30');
} else if (tz === 'Africa/Nairobi') {
  // Nairobi is UTC+3: two hours ahead of Lagos.
  assert.equal(lagosToLocal('06:00', day), '08:00');
  assert.equal(lagosToLocal('23:00', day), '01:00');
} else {
  assert.ok(lagosToLocal('06:00', day));
}
assert.equal(lagosToLocal('25:00', day), null);
assert.equal(lagosToLocal('6:00', day), null);
assert.equal(lagosToLocal('', day), null);
console.log(`groupAlarms (${tz || 'default tz'}): all checks passed`);
