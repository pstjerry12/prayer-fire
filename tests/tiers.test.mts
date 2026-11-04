// Run with: node --experimental-strip-types tests/tiers.test.mts
import assert from "node:assert/strict";
import { canAddMore, countLiveSermons, FREE_FAST_DAYS, FREE_LIMITS, FREE_TRANSLATIONS, GATE_MESSAGES, isFastAllowed, isTranslationAllowed, roomFor } from "../src/lib/tiers.ts";

// Free stops at the limit; Partner and Leader (isPremium) never do.
assert.equal(canAddMore(false, 0, FREE_LIMITS.reminders), true);
assert.equal(canAddMore(false, FREE_LIMITS.reminders - 1, FREE_LIMITS.reminders), true);
assert.equal(canAddMore(false, FREE_LIMITS.reminders, FREE_LIMITS.reminders), false);
assert.equal(canAddMore(false, 99, FREE_LIMITS.reminders), false);
assert.equal(canAddMore(true, 99, FREE_LIMITS.reminders), true);

// Fasting: 3 and 7 days are free, 21 and 40 are Partner.
assert.deepEqual([...FREE_FAST_DAYS], [3, 7]);
assert.equal(isFastAllowed(false, 3), true);
assert.equal(isFastAllowed(false, 7), true);
assert.equal(isFastAllowed(false, 21), false);
assert.equal(isFastAllowed(false, 40), false);
assert.equal(isFastAllowed(true, 21), true);
assert.equal(isFastAllowed(true, 40), true);

// Bible: the King James Version is free; ASV and WEB are Partner translations.
assert.deepEqual([...FREE_TRANSLATIONS], ["kjv"]);
assert.equal(isTranslationAllowed(false, "kjv"), true);
assert.equal(isTranslationAllowed(false, "asv"), false);
assert.equal(isTranslationAllowed(false, "web"), false);
assert.equal(isTranslationAllowed(true, "asv"), true);
assert.equal(isTranslationAllowed(true, "web"), true);

// Sermons: deleted ones do not count.
assert.equal(countLiveSermons({}), 0);
assert.equal(countLiveSermons({ a: {}, b: { deleted: true }, c: { deleted: false } }), 2);

// Adding several songs at once: only what fits under the limit for Free, everything for Partner.
assert.equal(roomFor(false, 0, FREE_LIMITS.songs, 5), FREE_LIMITS.songs);
assert.equal(roomFor(false, 2, FREE_LIMITS.songs, 5), 1);
assert.equal(roomFor(false, FREE_LIMITS.songs, FREE_LIMITS.songs, 2), 0);
assert.equal(roomFor(false, 9, FREE_LIMITS.songs, 2), 0); // already over (older data): nothing more
assert.equal(roomFor(true, 50, FREE_LIMITS.songs, 5), 5);

// Every limit has a message, and none of them mentions another payment provider.
for (const kind of ["reminders", "sermons", "songs", "fast", "translations"] as const) {
  const m = GATE_MESSAGES[kind];
  assert.ok(m.title.length > 0 && m.body.length > 0, kind);
  assert.ok(!/flutterwave/i.test(m.title + m.body), kind);
}

console.log("tiers: all checks passed");
