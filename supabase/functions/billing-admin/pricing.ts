// Pure helpers for the billing-admin Edge Function (no network, no Deno APIs), so they can be tested with Node:
//   node --experimental-strip-types tests/pricing.test.mts
// They work on the shapes Google's Play Developer API (monetization.subscriptions) returns.

export interface Money {
  currencyCode: string;
  units?: string; // whole units, as a string (Google sends int64 as string)
  nanos?: number; // billionths
}

export interface RegionalConfig {
  regionCode: string;
  newSubscriberAvailability?: boolean;
  price?: Money;
  [key: string]: unknown;
}

export interface BasePlan {
  basePlanId: string;
  state?: string;
  regionalConfigs?: RegionalConfig[];
  otherRegionsConfig?: { usdPrice?: Money; eurPrice?: Money; newSubscriberAvailability?: boolean; [key: string]: unknown };
  autoRenewingBasePlanType?: { billingPeriodDuration?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface PlaySubscription {
  packageName?: string;
  productId: string;
  basePlans?: BasePlan[];
  [key: string]: unknown;
}

/** "OTHER_USD" / "OTHER_EUR" address the prices Google uses for every country that has no price of its own. */
export const OTHER_USD = "OTHER_USD";
export const OTHER_EUR = "OTHER_EUR";

export const MICROS = 1_000_000;

/** Money -> price x 1,000,000 as a whole number (micros). Exact: no floating point. */
export function moneyToMicros(m: Money | undefined | null): bigint {
  if (!m) return 0n;
  const units = BigInt(m.units && m.units !== "" ? m.units : "0");
  const nanos = BigInt(m.nanos ?? 0);
  return units * 1_000_000n + nanos / 1000n;
}

export function microsToMoney(currencyCode: string, micros: bigint): Money {
  const units = micros / 1_000_000n;
  const nanos = Number((micros % 1_000_000n) * 1000n);
  return { currencyCode, units: units.toString(), nanos };
}

/** Parses what a person types ("1500", "1,500.50") into micros. Returns null when it is not a plain positive amount. */
export function parsePriceInput(input: string): bigint | null {
  const cleaned = input.replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const micros = BigInt(whole) * 1_000_000n + BigInt((frac + "000000").slice(0, 6));
  return micros > 0n ? micros : null;
}

export interface PriceRow {
  regionCode: string; // NG, US, ... or OTHER_USD / OTHER_EUR
  currencyCode: string;
  priceMicros: string; // string so it survives JSON
}

export interface BasePlanSummary {
  basePlanId: string;
  state: string | null;
  billingPeriod: string | null; // P1M, P1Y
  prices: PriceRow[];
}

/** What the admin screen lists: each base plan with every regional price. */
export function summarizeSubscription(sub: PlaySubscription): { productId: string; basePlans: BasePlanSummary[] } {
  const basePlans = (sub.basePlans ?? []).map((bp) => {
    const prices: PriceRow[] = [];
    for (const rc of bp.regionalConfigs ?? []) {
      if (!rc.price) continue;
      prices.push({ regionCode: rc.regionCode, currencyCode: rc.price.currencyCode, priceMicros: moneyToMicros(rc.price).toString() });
    }
    const other = bp.otherRegionsConfig;
    if (other?.usdPrice) prices.push({ regionCode: OTHER_USD, currencyCode: other.usdPrice.currencyCode, priceMicros: moneyToMicros(other.usdPrice).toString() });
    if (other?.eurPrice) prices.push({ regionCode: OTHER_EUR, currencyCode: other.eurPrice.currencyCode, priceMicros: moneyToMicros(other.eurPrice).toString() });
    return {
      basePlanId: bp.basePlanId,
      state: bp.state ?? null,
      billingPeriod: bp.autoRenewingBasePlanType?.billingPeriodDuration ?? null,
      prices,
    };
  });
  return { productId: sub.productId, basePlans };
}

export type Direction = "increase" | "decrease" | "same";

export function direction(oldMicros: bigint, newMicros: bigint): Direction {
  return newMicros > oldMicros ? "increase" : newMicros < oldMicros ? "decrease" : "same";
}

export interface PriceUpdateRequest {
  basePlanId: string;
  regionCode: string;
  newPriceMicros: bigint;
}

export interface PriceUpdatePlan {
  basePlanId: string;
  regionCode: string;
  currencyCode: string;
  oldPriceMicros: bigint;
  newPriceMicros: bigint;
  direction: Direction;
  /** The body to send with updateMask=basePlans: every base plan exactly as Google returned it, with ONLY this one price changed. */
  patchBody: { basePlans: BasePlan[] };
}

/** Upper limit that catches a misplaced decimal point (for example 1,500,000 instead of 1,500). */
export const MAX_PRICE_MICROS = 100_000_000n * 1_000_000n; // 100 million units of any currency

/**
 * Builds the change for ONE regional price, leaving everything else untouched.
 * Throws a plain-language Error when the request does not make sense.
 */
export function planPriceUpdate(sub: PlaySubscription, req: PriceUpdateRequest): PriceUpdatePlan {
  if (req.newPriceMicros <= 0n) throw new Error("The new price must be more than zero.");
  if (req.newPriceMicros > MAX_PRICE_MICROS) throw new Error("That price is too large. Check the decimal point.");
  const basePlans: BasePlan[] = JSON.parse(JSON.stringify(sub.basePlans ?? [])); // deep copy: never touch the original
  const bp = basePlans.find((b) => b.basePlanId === req.basePlanId);
  if (!bp) throw new Error(`Base plan "${req.basePlanId}" was not found in ${sub.productId}.`);

  let money: Money | undefined;
  let write: ((m: Money) => void) | undefined;
  if (req.regionCode === OTHER_USD || req.regionCode === OTHER_EUR) {
    const key = req.regionCode === OTHER_USD ? "usdPrice" : "eurPrice";
    money = bp.otherRegionsConfig?.[key];
    write = (m) => {
      (bp.otherRegionsConfig as Record<string, unknown>)[key] = m;
    };
  } else {
    const rc = (bp.regionalConfigs ?? []).find((r) => r.regionCode === req.regionCode);
    money = rc?.price;
    write = (m) => {
      (rc as RegionalConfig).price = m;
    };
  }
  if (!money || !write) throw new Error(`No price found for ${req.regionCode} on ${req.basePlanId}.`);

  const oldMicros = moneyToMicros(money);
  write(microsToMoney(money.currencyCode, req.newPriceMicros)); // the currency can never change here
  return {
    basePlanId: req.basePlanId,
    regionCode: req.regionCode,
    currencyCode: money.currencyCode,
    oldPriceMicros: oldMicros,
    newPriceMicros: req.newPriceMicros,
    direction: direction(oldMicros, req.newPriceMicros),
    patchBody: { basePlans },
  };
}

/** Which price points are already fine to compare after a change: used to confirm Google really saved it. */
export function readPrice(sub: PlaySubscription, basePlanId: string, regionCode: string): bigint | null {
  const bp = (sub.basePlans ?? []).find((b) => b.basePlanId === basePlanId);
  if (!bp) return null;
  if (regionCode === OTHER_USD) return bp.otherRegionsConfig?.usdPrice ? moneyToMicros(bp.otherRegionsConfig.usdPrice) : null;
  if (regionCode === OTHER_EUR) return bp.otherRegionsConfig?.eurPrice ? moneyToMicros(bp.otherRegionsConfig.eurPrice) : null;
  const rc = (bp.regionalConfigs ?? []).find((r) => r.regionCode === regionCode);
  return rc?.price ? moneyToMicros(rc.price) : null;
}

/** Body for basePlans.migratePrices: move existing subscribers to the new price (increases ask them to accept first). */
export function migratePricesBody(regionCode: string, regionsVersion: string, now: Date, increase: boolean) {
  return {
    regionalPriceMigrations: [
      {
        regionCode,
        oldestAllowedPriceVersionTime: now.toISOString(),
        priceIncreaseType: increase ? "PRICE_INCREASE_TYPE_OPT_IN" : "PRICE_INCREASE_TYPE_OPT_OUT",
      },
    ],
    regionsVersion: { version: regionsVersion },
  };
}

// ── Deferring billing for existing subscribers (free mode) ────────────────────

export interface SubscriberRow {
  user_id: string;
  entitlement: string;
  product_id: string | null;
  store: string | null;
  status: string;
  environment: string;
  expires_at: string | null;
  will_renew: boolean;
}

export const MAX_DEFER_DAYS = 365; // Google allows at most one year per deferral
const DAY_MS = 86_400_000;

export interface DeferTarget {
  userId: string;
  entitlement: string;
  productId: string;
  currentExpiryMs: number;
  newExpiryMs: number;
}

/** Who gets deferred: active, renewing Google Play subscriptions. Licence-tester (sandbox) ones only when asked. */
export function planDefer(rows: SubscriberRow[], days: number, now: Date, includeSandbox: boolean): { targets: DeferTarget[]; skipped: number } {
  if (!Number.isInteger(days) || days < 1 || days > MAX_DEFER_DAYS) throw new Error(`Days must be a whole number from 1 to ${MAX_DEFER_DAYS}.`);
  const targets: DeferTarget[] = [];
  let skipped = 0;
  for (const r of rows) {
    const expiry = r.expires_at ? Date.parse(r.expires_at) : NaN;
    const eligible =
      r.store === "PLAY_STORE" &&
      !!r.product_id &&
      r.status === "ACTIVE" &&
      r.will_renew &&
      Number.isFinite(expiry) &&
      expiry > now.getTime() &&
      (includeSandbox || r.environment !== "SANDBOX");
    if (!eligible) {
      skipped++;
      continue;
    }
    targets.push({ userId: r.user_id, entitlement: r.entitlement, productId: r.product_id as string, currentExpiryMs: expiry, newExpiryMs: expiry + days * DAY_MS });
  }
  return { targets, skipped };
}
