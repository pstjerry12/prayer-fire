// Run with: node --experimental-strip-types tests/subscriptionRules.test.mts
import assert from "node:assert/strict";
import {
  decideWebhook, decideFromSubscriber, isActive, toSubscriptionInfo, eventTier, bestRow, splitProductId, statusNotice,
} from "../src/lib/subscriptionRules.ts";
import { computeFreeMode, parseFreeModeSettings } from "../src/lib/freeModeRules.ts";

const now = new Date("2026-11-01T12:00:00Z");
const future = Date.parse("2026-12-01T00:00:00Z");
const base = {
  app_user_id: "user_123", product_id: "partner_sub:partner-monthly", entitlement_ids: ["partner"], store: "PLAY_STORE",
  environment: "PRODUCTION", period_type: "NORMAL", transaction_id: "GPA.1234", event_timestamp_ms: now.getTime(), expiration_at_ms: future,
};

// product ids split into subscription id + base plan id
assert.deepEqual(splitProductId("partner_sub:partner-monthly"), { subId: "partner_sub", basePlanId: "partner-monthly" });
assert.deepEqual(splitProductId("partner_sub"), { subId: "partner_sub", basePlanId: null });
assert.deepEqual(splitProductId(null), { subId: null, basePlanId: null });

// purchase / renewal / change switch the plan on until the end date
for (const type of ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"]) {
  const d = decideWebhook({ ...base, type }, now);
  assert.equal(d.action, "set", type);
  if (d.action === "set") {
    assert.equal(d.update.userId, "user_123");
    assert.equal(d.update.entitlement, "partner");
    assert.equal(d.update.status, "ACTIVE");
    assert.equal(d.update.willRenew, true);
    assert.equal(d.update.basePlanId, "partner-monthly");
    assert.equal(d.update.storeTransactionId, "GPA.1234");
    assert.equal(d.update.expiresAt?.getTime(), future);
  }
}
// Leader is recognised by entitlement or by product id
const leader = decideWebhook({ ...base, type: "INITIAL_PURCHASE", product_id: "leader_sub:leader-yearly", entitlement_ids: ["leader"] }, now);
assert.ok(leader.action === "set" && leader.update.entitlement === "leader" && leader.update.basePlanId === "leader-yearly");
assert.equal(eventTier({ product_id: "leader_sub:leader-monthly" }), "leader");
assert.equal(eventTier({ product_id: "partner_sub:partner-yearly" }), "partner");
assert.equal(eventTier({ product_id: "something_else" }), null);
assert.equal(eventTier({ entitlement_ids: ["other"], product_id: "partner_sub:x" }), null);

// a free trial is recorded as a trial
const trial = decideWebhook({ ...base, type: "INITIAL_PURCHASE", period_type: "TRIAL" }, now);
assert.ok(trial.action === "set" && trial.update.periodType === "TRIAL");

// cancelling keeps access until the end date but will not renew; payment problems show as grace / hold
const cancelled = decideWebhook({ ...base, type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }, now);
assert.ok(cancelled.action === "set" && cancelled.update.status === "CANCELED" && cancelled.update.willRenew === false && cancelled.update.expiresAt!.getTime() === future);
const grace = decideWebhook({ ...base, type: "BILLING_ISSUE" }, now);
assert.ok(grace.action === "set" && grace.update.status === "IN_GRACE" && grace.update.expiresAt!.getTime() === future);
const hold = decideWebhook({ ...base, type: "SUBSCRIPTION_PAUSED" }, now);
assert.ok(hold.action === "set" && hold.update.status === "ON_HOLD");

// expiry and refunds switch access off at once
const exp = decideWebhook({ ...base, type: "EXPIRATION", expiration_at_ms: now.getTime() - 1000 }, now);
assert.ok(exp.action === "expire" && exp.status === "EXPIRED" && exp.entitlement === "partner");
const refund = decideWebhook({ ...base, type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" }, now);
assert.ok(refund.action === "expire" && refund.status === "REFUNDED");

// test events, other products and anonymous users are ignored (still answered 200)
assert.equal(decideWebhook({ type: "TEST" }, now).action, "ignore");
assert.equal(decideWebhook({ ...base, type: "RENEWAL", entitlement_ids: ["other"], product_id: "x:y" }, now).action, "ignore");
assert.equal(decideWebhook({ ...base, type: "RENEWAL", app_user_id: "$RCAnonymousID:abc" }, now).action, "ignore");
const alias = decideWebhook({ ...base, type: "RENEWAL", app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", "user_999"] }, now);
assert.ok(alias.action === "set" && alias.update.userId === "user_999");
const tr = decideWebhook({ type: "TRANSFER", transferred_from: ["a"], transferred_to: ["b"], event_timestamp_ms: now.getTime() }, now);
assert.ok(tr.action === "transfer" && tr.from[0] === "a" && tr.to[0] === "b");

// "is it active" is decided by the end date
const row = (o: Record<string, unknown>) => ({
  userId: "u", entitlement: "partner", productId: "partner_sub:partner-monthly", basePlanId: "partner-monthly", status: "ACTIVE", store: "PLAY_STORE",
  storeTransactionId: "GPA.1", periodType: "NORMAL", environment: "PRODUCTION", expiresAt: new Date(future), willRenew: true, lastEventAt: now, updatedAt: now, ...o,
}) as never;
assert.equal(isActive({ expiresAt: new Date(future) }, now), true);
assert.equal(isActive({ expiresAt: new Date(now.getTime() - 1) }, now), false);
assert.equal(isActive({ expiresAt: null }, now), false);
assert.equal(isActive(null, now), false);

// the plan to honour: Leader beats Partner, expired and refunded rows never count
const p = row({});
const l = row({ entitlement: "leader", productId: "leader_sub:leader-yearly", basePlanId: "leader-yearly" });
assert.equal((bestRow([p, l], now) as { entitlement: string }).entitlement, "leader");
assert.equal((bestRow([p, row({ entitlement: "leader", status: "REFUNDED" })], now) as { entitlement: string }).entitlement, "partner");
assert.equal((bestRow([p, row({ entitlement: "leader", expiresAt: new Date(now.getTime() - 1) })], now) as { entitlement: string }).entitlement, "partner");
assert.equal(bestRow([row({ status: "EXPIRED" })], now), null);
assert.equal(bestRow([], now), null);
const info = toSubscriptionInfo([row({ periodType: "TRIAL", environment: "SANDBOX" }), l], now);
assert.ok(info && info.tier === "leader" && info.basePlanId === "leader-yearly");
const info2 = toSubscriptionInfo([row({ periodType: "TRIAL", environment: "SANDBOX" })], now);
assert.ok(info2 && info2.tier === "partner" && info2.isTrial && info2.sandbox && info2.status === "ACTIVE");
assert.equal(toSubscriptionInfo([row({ expiresAt: new Date(now.getTime() - 1) })], now), null);

// notices for payment problems
assert.match(statusNotice({ status: "IN_GRACE", willRenew: false, expiresAt: null })!, /update your payment method/);
assert.match(statusNotice({ status: "ON_HOLD", willRenew: false, expiresAt: null })!, /on hold/);
assert.match(statusNotice({ status: "CANCELED", willRenew: false, expiresAt: null })!, /keep access/);
assert.equal(statusNotice({ status: "ACTIVE", willRenew: true, expiresAt: null }), null);

// RevenueCat REST "subscriber" answer: one update per plan
const subs = decideFromSubscriber("user_123", {
  entitlements: {
    partner: { expires_date: "2026-12-01T00:00:00Z", product_identifier: "partner_sub:partner-monthly" },
    leader: { expires_date: "2026-12-05T00:00:00Z", product_identifier: "leader_sub:leader-yearly" },
  },
  subscriptions: {
    "partner_sub:partner-monthly": { period_type: "trial", store: "play_store", is_sandbox: true, store_transaction_id: "GPA.1" },
    "leader_sub:leader-yearly": { period_type: "normal", store: "play_store", unsubscribe_detected_at: "2026-11-02T00:00:00Z" },
  },
}, now);
assert.equal(subs.length, 2);
assert.ok(subs[0].entitlement === "partner" && subs[0].periodType === "TRIAL" && subs[0].environment === "SANDBOX" && subs[0].status === "ACTIVE" && subs[0].storeTransactionId === "GPA.1");
assert.ok(subs[1].entitlement === "leader" && subs[1].status === "CANCELED" && subs[1].willRenew === false && subs[1].basePlanId === "leader-yearly");
const refunded = decideFromSubscriber("u", { entitlements: { partner: { expires_date: "2026-12-01T00:00:00Z", product_identifier: "partner_sub:partner-monthly" } }, subscriptions: { "partner_sub:partner-monthly": { refunded_at: "2026-11-01T00:00:00Z" } } }, now);
assert.ok(refunded[0].status === "REFUNDED" && refunded[0].expiresAt!.getTime() === now.getTime());
const grace2 = decideFromSubscriber("u", { entitlements: { partner: { expires_date: "2026-12-01T00:00:00Z", product_identifier: "p" } }, subscriptions: { p: { billing_issues_detected_at: "2026-11-01T00:00:00Z" } } }, now);
assert.equal(grace2[0].status, "IN_GRACE");
const over = decideFromSubscriber("u", { entitlements: { partner: { expires_date: "2026-10-01T00:00:00Z", product_identifier: "p" } } }, now);
assert.equal(over[0].status, "EXPIRED");
assert.deepEqual(decideFromSubscriber("u", { entitlements: {} }, now), []);

// ── Free Premium Mode ──
const fm = (m: Record<string, string>) => parseFreeModeSettings(m);
assert.deepEqual(computeFreeMode(fm({}), now), { active: false, endsAt: null }); // nothing saved = off
assert.deepEqual(computeFreeMode(fm({ free_mode_enabled: "false" }), now), { active: false, endsAt: null });
assert.deepEqual(computeFreeMode(fm({ free_mode_enabled: "true" }), now), { active: true, endsAt: null }); // no dates = open-ended
assert.deepEqual(computeFreeMode(fm({ free_mode_enabled: "true", free_mode_end: "2026-12-01T00:00:00Z" }), now), { active: true, endsAt: "2026-12-01T00:00:00Z" });
assert.equal(computeFreeMode(fm({ free_mode_enabled: "true", free_mode_end: "2026-10-31T00:00:00Z" }), now).active, false); // switched itself off
assert.equal(computeFreeMode(fm({ free_mode_enabled: "true", free_mode_start: "2026-11-02T00:00:00Z" }), now).active, false); // not started yet
assert.equal(computeFreeMode(fm({ free_mode_enabled: "true", free_mode_start: "2026-10-01T00:00:00Z", free_mode_end: "2026-12-01T00:00:00Z" }), now).active, true);
assert.equal(computeFreeMode(fm({ free_mode_enabled: "true", free_mode_end: "garbage" }), now).active, true); // a broken date is ignored
assert.equal(fm({ free_mode_existing: "defer" }).existing, "defer");
assert.equal(fm({ free_mode_existing: "x" }).existing, "keep");

console.log("subscription rules: all checks passed");
