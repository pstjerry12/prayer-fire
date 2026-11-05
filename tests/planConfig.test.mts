import assert from 'node:assert/strict';
import {
  DEFAULT_PLAN_CONFIG, parsePlanConfig, memberLimitFor, leaderTierFor, featuresToText, textToFeatures,
} from '../src/lib/planConfig.ts';

// Nothing stored, or junk: the defaults.
assert.deepEqual(parsePlanConfig(null), DEFAULT_PLAN_CONFIG);
assert.deepEqual(parsePlanConfig('not json'), DEFAULT_PLAN_CONFIG);
assert.deepEqual(parsePlanConfig('[]'), DEFAULT_PLAN_CONFIG);

// An admin override of one part keeps the rest.
const c = parsePlanConfig(JSON.stringify({ partner: { name: 'Partner', tagline: 'New line', features: [{ text: 'A', soon: true }, { text: '  ' }, 5] } }));
assert.equal(c.partner.tagline, 'New line');
assert.deepEqual(c.partner.features, [{ text: 'A', soon: true }]);
assert.deepEqual(c.free, DEFAULT_PLAN_CONFIG.free);
assert.deepEqual(c.leaderTiers, DEFAULT_PLAN_CONFIG.leaderTiers);

// Tiers: sanitised, limits clamped, and there is always one a Leader can buy.
const t = parsePlanConfig({ leaderTiers: [{ id: 'Big One!', name: 'Big', memberLimit: 9999999, available: true, entitlement: 'leader' }, { id: 'x', name: 'Bad', memberLimit: 0, available: true }] });
assert.equal(t.leaderTiers.length, 1);
assert.equal(t.leaderTiers[0].id, 'big_one_');
assert.equal(t.leaderTiers[0].memberLimit, 100000);
assert.deepEqual(parsePlanConfig({ leaderTiers: [{ id: 'a', name: 'A', memberLimit: 5, available: false }] }).leaderTiers, DEFAULT_PLAN_CONFIG.leaderTiers);

// Member limits by entitlement. Unknown or unavailable entitlements fall back to the available (Basic) tier.
assert.equal(memberLimitFor(DEFAULT_PLAN_CONFIG, 'leader'), 50);
assert.equal(memberLimitFor(DEFAULT_PLAN_CONFIG, null), 50);
assert.equal(memberLimitFor(DEFAULT_PLAN_CONFIG, 'leader_church'), 50); // not available yet
const open = parsePlanConfig({ leaderTiers: [...DEFAULT_PLAN_CONFIG.leaderTiers.map((x) => ({ ...x, available: true }))] });
assert.equal(memberLimitFor(open, 'leader_church'), 500);
assert.equal(leaderTierFor(open, 'leader').id, 'leader_basic');

// Admin text round trip.
const text = featuresToText([{ text: 'One' }, { text: 'Two', soon: true }]);
assert.equal(text, 'One\n[soon] Two');
assert.deepEqual(textToFeatures(text), [{ text: 'One' }, { text: 'Two', soon: true }]);
assert.deepEqual(textToFeatures('\n  \n[SOON]   \nThree'), [{ text: 'Three' }]);

console.log('planConfig: all checks passed');
