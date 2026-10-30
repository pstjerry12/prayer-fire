// Run with: node --experimental-strip-types tests/subscriptionRules.test.mts
import assert from "node:assert/strict";
import { decideWebhook, decideFromSubscriber, isActive, toSubscriptionInfo, eventIsForPartner } from "../src/lib/subscriptionRules.ts";

const now = new Date("2026-11-01T12:00:00Z");
const future = Date.parse("2026-12-01T00:00:00Z");
const base = { app_user_id: "user_123", product_id: "prayerfire_partner:monthly", entitlement_ids: ["partner"], store: "PLAY_STORE", environment: "PRODUCTION", period_type: "NORMAL", event_timestamp_ms: now.getTime(), expiration_at_ms: future };

// purchase / renewal switch Partner on until the end date
for (const type of ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"]) {
  const d = decideWebhook({ ...base, type }, now);
  assert.equal(d.action, "set", type);
  if (d.action === "set") { assert.equal(d.update.userId, "user_123"); assert.equal(d.update.willRenew, true); assert.equal(d.update.expiresAt?.getTime(), future); }
}
// a free trial is recorded as a trial
const trial = decideWebhook({ ...base, type: "INITIAL_PURCHASE", period_type: "TRIAL" }, now);
assert.ok(trial.action === "set" && trial.update.periodType === "TRIAL");
// cancelling keeps access until the end date, but will not renew
for (const type of ["CANCELLATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"]) {
  const d = decideWebhook({ ...base, type }, now);
  assert.ok(d.action === "set" && d.update.willRenew === false && d.update.expiresAt!.getTime() === future, type);
}
// expiration switches off
const exp = decideWebhook({ ...base, type: "EXPIRATION", expiration_at_ms: now.getTime() - 1000 }, now);
assert.equal(exp.action, "expire");
// test events, other products and anonymous users are ignored (still answered 200)
assert.equal(decideWebhook({ type: "TEST" }, now).action, "ignore");
assert.equal(decideWebhook({ ...base, type: "RENEWAL", entitlement_ids: ["leader"], product_id: "prayerfire_leader:monthly" }, now).action, "ignore");
assert.equal(decideWebhook({ ...base, type: "RENEWAL", app_user_id: "$RCAnonymousID:abc" }, now).action, "ignore");
// an anonymous app_user_id falls back to a real alias
const alias = decideWebhook({ ...base, type: "RENEWAL", app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", "user_999"] }, now);
assert.ok(alias.action === "set" && alias.update.userId === "user_999");
// product-id fallback when entitlement ids are missing
assert.equal(eventIsForPartner({ product_id: "prayerfire_partner:yearly" }), true);
assert.equal(eventIsForPartner({ product_id: "something_else" }), false);
// transfer
const tr = decideWebhook({ type: "TRANSFER", transferred_from: ["a"], transferred_to: ["b"], event_timestamp_ms: now.getTime() }, now);
assert.ok(tr.action === "transfer" && tr.from[0] === "a" && tr.to[0] === "b");

// "is it active" is decided by the end date
assert.equal(isActive({ expiresAt: new Date(future) }, now), true);
assert.equal(isActive({ expiresAt: new Date(now.getTime() - 1) }, now), false);
assert.equal(isActive({ expiresAt: null }, now), false);
assert.equal(isActive(null, now), false);
const row = { userId: "u", entitlement: "partner", productId: "prayerfire_partner:monthly", store: "PLAY_STORE", periodType: "TRIAL", environment: "SANDBOX", expiresAt: new Date(future), willRenew: true, lastEventAt: now, updatedAt: now };
const info = toSubscriptionInfo(row, now);
assert.ok(info && info.tier === "partner" && info.isTrial && info.sandbox);
assert.equal(toSubscriptionInfo({ ...row, expiresAt: new Date(now.getTime() - 1) }, now), null);

// RevenueCat REST "subscriber" answer
const sub = decideFromSubscriber("user_123", {
  entitlements: { partner: { expires_date: "2026-12-01T00:00:00Z", product_identifier: "prayerfire_partner:monthly" } },
  subscriptions: { "prayerfire_partner:monthly": { period_type: "trial", store: "play_store", is_sandbox: true, unsubscribe_detected_at: null } },
}, now);
assert.ok(sub && sub.store === "PLAY_STORE" && sub.periodType === "TRIAL" && sub.environment === "SANDBOX" && sub.willRenew === true);
const cancelled = decideFromSubscriber("user_123", {
  entitlements: { partner: { expires_date: "2026-12-01T00:00:00Z", product_identifier: "p" } },
  subscriptions: { p: { unsubscribe_detected_at: "2026-11-02T00:00:00Z" } },
}, now);
assert.ok(cancelled && cancelled.willRenew === false);
assert.equal(decideFromSubscriber("user_123", { entitlements: {} }, now), null);
console.log("subscription rules: all checks passed");
