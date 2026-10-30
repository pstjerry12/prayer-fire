// Run with: node --experimental-strip-types tests/pricing.test.mts
import assert from "node:assert/strict";
import {
  moneyToMicros, microsToMoney, parsePriceInput, summarizeSubscription, planPriceUpdate, readPrice, migratePricesBody,
  planDefer, direction, OTHER_USD, MAX_PRICE_MICROS, planOffer, summarizeOffer, validateOfferSpec,
} from "../supabase/functions/billing-admin/pricing.ts";

// money <-> micros, exactly
assert.equal(moneyToMicros({ currencyCode: "NGN", units: "1500", nanos: 0 }), 1_500_000_000n);
assert.equal(moneyToMicros({ currencyCode: "USD", units: "2", nanos: 990_000_000 }), 2_990_000n);
assert.equal(moneyToMicros({ currencyCode: "USD", nanos: 10_000_000 }), 10_000n); // units missing
assert.deepEqual(microsToMoney("USD", 29_990_000n), { currencyCode: "USD", units: "29", nanos: 990_000_000 });
assert.deepEqual(microsToMoney("NGN", 15_000_000_000n), { currencyCode: "NGN", units: "15000", nanos: 0 });

// typed prices
assert.equal(parsePriceInput("1500"), 1_500_000_000n);
assert.equal(parsePriceInput("1,500.50"), 1_500_500_000n);
assert.equal(parsePriceInput("2.99"), 2_990_000n);
for (const bad of ["", "0", "0.00", "-5", "abc", "1.2.3", "1e5", "12.1234567"]) assert.equal(parsePriceInput(bad), null, bad);

const sub = {
  packageName: "com.prayerfireaction.prayerfire",
  productId: "partner_sub",
  listings: [{ languageCode: "en-US", title: "Prayer Fire Partner" }],
  basePlans: [
    {
      basePlanId: "partner-monthly", state: "ACTIVE",
      autoRenewingBasePlanType: { billingPeriodDuration: "P1M", gracePeriodDuration: "P7D" },
      regionalConfigs: [
        { regionCode: "NG", newSubscriberAvailability: true, price: { currencyCode: "NGN", units: "1500" } },
        { regionCode: "US", newSubscriberAvailability: true, price: { currencyCode: "USD", units: "2", nanos: 990_000_000 } },
      ],
      otherRegionsConfig: { usdPrice: { currencyCode: "USD", units: "2", nanos: 990_000_000 }, eurPrice: { currencyCode: "EUR", units: "2", nanos: 790_000_000 }, newSubscriberAvailability: true },
    },
    {
      basePlanId: "partner-yearly", state: "ACTIVE",
      autoRenewingBasePlanType: { billingPeriodDuration: "P1Y" },
      regionalConfigs: [{ regionCode: "NG", newSubscriberAvailability: true, price: { currencyCode: "NGN", units: "15000" } }],
    },
  ],
};

// summary lists every plan and region
const sum = summarizeSubscription(sub);
assert.equal(sum.basePlans.length, 2);
assert.equal(sum.basePlans[0].billingPeriod, "P1M");
assert.deepEqual(sum.basePlans[0].prices.map((p) => p.regionCode), ["NG", "US", OTHER_USD, "OTHER_EUR"]);
assert.equal(sum.basePlans[1].prices[0].priceMicros, "15000000000");

// a price edit changes ONLY that price
const before = JSON.stringify(sub);
const plan = planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: "NG", newPriceMicros: 2_000_000_000n });
assert.equal(JSON.stringify(sub), before, "the original must not be touched");
assert.equal(plan.oldPriceMicros, 1_500_000_000n);
assert.equal(plan.direction, "increase");
assert.equal(plan.currencyCode, "NGN");
const patched = plan.patchBody.basePlans;
assert.equal(patched.length, 2);
assert.deepEqual(patched[0].regionalConfigs![0].price, { currencyCode: "NGN", units: "2000", nanos: 0 });
assert.deepEqual(patched[0].regionalConfigs![1], sub.basePlans[0].regionalConfigs[1]); // US untouched
assert.deepEqual(patched[1], sub.basePlans[1]); // other base plan untouched
assert.deepEqual(readPrice({ productId: "x", basePlans: patched }, "partner-monthly", "NG"), 2_000_000_000n);

// the "other regions" prices can be edited too, and a decrease is reported
const plan2 = planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: OTHER_USD, newPriceMicros: 1_990_000n });
assert.equal(plan2.direction, "decrease");
assert.deepEqual(plan2.patchBody.basePlans[0].otherRegionsConfig!.usdPrice, { currencyCode: "USD", units: "1", nanos: 990_000_000 });
assert.equal(planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: "NG", newPriceMicros: 1_500_000_000n }).direction, "same");

// bad requests give plain errors
assert.throws(() => planPriceUpdate(sub, { basePlanId: "nope", regionCode: "NG", newPriceMicros: 1n }), /not found/);
assert.throws(() => planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: "ZZ", newPriceMicros: 1_000_000n }), /No price found/);
assert.throws(() => planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: "NG", newPriceMicros: 0n }), /more than zero/);
assert.throws(() => planPriceUpdate(sub, { basePlanId: "partner-monthly", regionCode: "NG", newPriceMicros: MAX_PRICE_MICROS + 1n }), /too large/);
assert.equal(direction(1n, 2n), "increase");

// existing-subscriber price migration
const mig = migratePricesBody("NG", "2022/02", new Date("2026-11-01T00:00:00Z"), true);
assert.equal(mig.regionalPriceMigrations[0].priceIncreaseType, "PRICE_INCREASE_TYPE_OPT_IN");
assert.equal(mig.regionalPriceMigrations[0].oldestAllowedPriceVersionTime, "2026-11-01T00:00:00.000Z");
assert.equal(migratePricesBody("NG", "2022/02", new Date(), false).regionalPriceMigrations[0].priceIncreaseType, "PRICE_INCREASE_TYPE_OPT_OUT");

// deferral picks only active, renewing Google Play subscriptions
const now = new Date("2026-11-01T00:00:00Z");
const row = (o: Record<string, unknown>) => ({ user_id: "u", entitlement: "partner", product_id: "partner_sub:partner-monthly", store: "PLAY_STORE", status: "ACTIVE", environment: "PRODUCTION", expires_at: "2026-12-01T00:00:00Z", will_renew: true, ...o });
const rows = [
  row({ user_id: "a" }),
  row({ user_id: "b", status: "CANCELED", will_renew: false }),
  row({ user_id: "c", environment: "SANDBOX" }),
  row({ user_id: "d", store: "APP_STORE" }),
  row({ user_id: "e", expires_at: "2026-10-01T00:00:00Z" }),
  row({ user_id: "f", product_id: null }),
  row({ user_id: "g", status: "IN_GRACE" }),
];
const d = planDefer(rows, 30, now, false);
assert.deepEqual(d.targets.map((t) => t.userId), ["a"]);
assert.equal(d.skipped, 6);
assert.equal(d.targets[0].subscriptionId, "partner_sub"); // RevenueCat wants the subscription id only
assert.equal(d.targets[0].productId, "partner_sub:partner-monthly");
assert.equal(d.targets[0].newExpiryMs, Date.parse("2026-12-01T00:00:00Z") + 30 * 86_400_000);
assert.deepEqual(planDefer(rows, 30, now, true).targets.map((t) => t.userId), ["a", "c"]);
for (const bad of [0, -1, 1.5, 366, NaN]) assert.throws(() => planDefer(rows, bad, now, false), /whole number/);

// ── Promotional offers ──
const PKG = "com.prayerfireaction.prayerfire";
const monthly = sub.basePlans[0];
const disc = planOffer(PKG, "partner_sub", monthly, { offerId: "welcome-50", kind: "discount", percentOff: 50, periods: 1 });
assert.equal(disc.offerId, "welcome-50");
assert.equal(disc.basePlanId, "partner-monthly");
assert.equal(disc.phases.length, 1);
assert.equal(disc.phases[0].duration, "P1M"); // the base plan's own billing period
assert.equal(disc.phases[0].recurrenceCount, 1);
assert.deepEqual(disc.phases[0].regionalConfigs, [{ regionCode: "NG", relativeDiscount: 0.5 }, { regionCode: "US", relativeDiscount: 0.5 }]);
assert.deepEqual(disc.phases[0].otherRegionsConfig, { relativeDiscount: 0.5 });
assert.deepEqual(disc.regionalConfigs, [{ regionCode: "NG", newSubscriberAvailability: true }, { regionCode: "US", newSubscriberAvailability: true }]);
assert.deepEqual(disc.targeting, { acquisitionRule: { scope: { thisSubscription: {} } } }); // new customers only
// the phase has exactly one entry for each region the offer covers
assert.deepEqual(disc.phases[0].regionalConfigs.map((r) => r.regionCode), disc.regionalConfigs.map((r) => r.regionCode));
const trialOffer = planOffer(PKG, "partner_sub", monthly, { offerId: "trial-7", kind: "trial", days: 7 });
assert.equal(trialOffer.phases[0].duration, "P7D");
assert.deepEqual(trialOffer.phases[0].regionalConfigs[0], { regionCode: "NG", free: {} });
assert.deepEqual(trialOffer.phases[0].otherRegionsConfig, { free: {} });
assert.equal(planOffer(PKG, "partner_sub", sub.basePlans[1], { offerId: "y", kind: "discount", percentOff: 20, periods: 1 }).phases[0].duration, "P1Y");
// the base plan is never changed
assert.equal(JSON.stringify(sub), before);
// bad offers give plain errors
for (const bad of ["", "Welcome", "has space", "-start", "x".repeat(41)]) assert.throws(() => validateOfferSpec({ offerId: bad, kind: "trial", days: 7 }), /lowercase/, bad);
assert.throws(() => validateOfferSpec({ offerId: "a", kind: "discount", percentOff: 0, periods: 1 }), /1 to 99/);
assert.throws(() => validateOfferSpec({ offerId: "a", kind: "discount", percentOff: 100, periods: 1 }), /1 to 99/);
assert.throws(() => validateOfferSpec({ offerId: "a", kind: "discount", percentOff: 50, periods: 13 }), /1 to 12/);
assert.throws(() => validateOfferSpec({ offerId: "a", kind: "trial", days: 0 }), /1 to 60/);
assert.throws(() => planOffer(PKG, "partner_sub", { basePlanId: "empty" }, { offerId: "a", kind: "trial", days: 7 }), /no priced countries/);
assert.throws(() => planOffer(PKG, "partner_sub", { basePlanId: "x", regionalConfigs: [{ regionCode: "NG", price: { currencyCode: "NGN", units: "1" } }] }, { offerId: "a", kind: "discount", percentOff: 10, periods: 1 }), /no billing period/);
// readable summaries
assert.equal(summarizeOffer({ offerId: "welcome-50", basePlanId: "partner-monthly", productId: "partner_sub", state: "DRAFT", phases: disc.phases }).description, "50% off for 1 x P1M");
assert.equal(summarizeOffer({ offerId: "t", phases: trialOffer.phases, state: "ACTIVE" }).description, "Free for P7D");
assert.equal(summarizeOffer({ offerId: "t" }).description, "No phases");

console.log("pricing rules: all checks passed");
