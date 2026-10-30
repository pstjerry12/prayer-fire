import type { SubscriptionRow } from "@/db/schema";
import type { SubscriptionInfo, SubscriptionStatus, SubscriptionTier } from "@/app/types";

/**
 * The rules (no database here, so they can be tested on their own).
 * Paid-subscription logic shared by the RevenueCat webhook and the sync route.
 * RevenueCat is the middleman for Google Play Billing; this file turns what it says
 * into rows in the `subscriptions` table (one per account per plan), which is the single
 * source of truth the app reads to unlock Partner / Leader features.
 */

export type { SubscriptionInfo, SubscriptionStatus, SubscriptionTier };

/** The two Play subscriptions. RevenueCat product ids look like "partner_sub:partner-monthly". */
export const PARTNER_SUB_ID = "partner_sub";
export const LEADER_SUB_ID = "leader_sub";
export const TIERS: SubscriptionTier[] = ["partner", "leader"];
const SUB_ID_FOR_TIER: Record<SubscriptionTier, string> = { partner: PARTNER_SUB_ID, leader: LEADER_SUB_ID };

/** One normalised update for one plan of one account, whatever RevenueCat endpoint it came from. */
export interface SubscriptionUpdate {
  userId: string;
  entitlement: SubscriptionTier;
  productId: string | null;
  basePlanId: string | null;
  status: SubscriptionStatus;
  store: string | null;
  storeTransactionId: string | null;
  periodType: string | null;
  environment: string;
  /** null = no end date known (treated as not active). */
  expiresAt: Date | null;
  willRenew: boolean;
  /** When RevenueCat says this happened (used to ignore out-of-order deliveries). */
  eventAt: Date;
}

/** RevenueCat sends this for people who have not signed in yet; they cannot be matched to an account. */
export function isAnonymousAppUserId(id: unknown): boolean {
  return typeof id !== "string" || id.length === 0 || id.startsWith("$RCAnonymousID");
}

interface WebhookEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  period_type?: string;
  store?: string;
  environment?: string;
  cancel_reason?: string | null;
  transaction_id?: string | null;
  event_timestamp_ms?: number;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
  transferred_to?: string[];
}

/** "partner_sub:partner-monthly" -> { subId: "partner_sub", basePlanId: "partner-monthly" } */
export function splitProductId(productId: string | null | undefined): { subId: string | null; basePlanId: string | null } {
  if (!productId) return { subId: null, basePlanId: null };
  const i = productId.indexOf(":");
  return i < 0 ? { subId: productId, basePlanId: null } : { subId: productId.slice(0, i), basePlanId: productId.slice(i + 1) || null };
}

/**
 * Which plan an event is about: by RevenueCat entitlement name, or (for older events) by product id.
 * An event that names both (should not happen) counts as Leader.
 */
export function eventTier(e: WebhookEvent): SubscriptionTier | null {
  const ids = [...(e.entitlement_ids ?? []), ...(e.entitlement_id ? [e.entitlement_id] : [])];
  if (ids.includes("leader")) return "leader";
  if (ids.includes("partner")) return "partner";
  if (ids.length > 0) return null;
  const { subId } = splitProductId(e.product_id);
  if (subId === LEADER_SUB_ID) return "leader";
  if (subId === PARTNER_SUB_ID) return "partner";
  return null;
}

/** The account an event is about: the signed-in app user id, never an anonymous or alias id. */
export function eventUserId(e: WebhookEvent): string | null {
  if (!isAnonymousAppUserId(e.app_user_id)) return e.app_user_id as string;
  const real = [e.original_app_user_id, ...(e.aliases ?? [])].find((id) => !isAnonymousAppUserId(id));
  return real ?? null;
}

export type WebhookDecision =
  | { action: "ignore"; reason: string }
  | { action: "set"; update: SubscriptionUpdate }
  | { action: "expire"; userId: string; entitlement: SubscriptionTier; eventAt: Date; status: SubscriptionStatus }
  | { action: "transfer"; from: string[]; to: string[]; eventAt: Date };

/**
 * Turns one RevenueCat webhook event into what to do with the database.
 * Rule of thumb: the end date RevenueCat gives us decides everything, with two exceptions that
 * switch access off at once: EXPIRATION, and a refund (a cancellation made by Google support).
 * A cancelled subscription keeps working until its end date; a payment problem keeps working
 * through Google's grace period (RevenueCat extends the end date for it) and shows as IN_GRACE.
 */
export function decideWebhook(event: WebhookEvent, now: Date = new Date()): WebhookDecision {
  const type = event.type ?? "";
  if (type === "TEST") return { action: "ignore", reason: "test event" };

  const eventAt = new Date(typeof event.event_timestamp_ms === "number" ? event.event_timestamp_ms : now.getTime());

  if (type === "TRANSFER") {
    return { action: "transfer", from: event.transferred_from ?? [], to: event.transferred_to ?? [], eventAt };
  }

  const userId = eventUserId(event);
  if (!userId) return { action: "ignore", reason: "anonymous user" };
  const tier = eventTier(event);
  if (!tier) return { action: "ignore", reason: "not a Prayer Fire plan" };

  if (type === "EXPIRATION") return { action: "expire", userId, entitlement: tier, eventAt, status: "EXPIRED" };
  // Refunds and revocations: the money went back, so the access goes now.
  if (type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT") {
    return { action: "expire", userId, entitlement: tier, eventAt, status: "REFUNDED" };
  }

  const expiresAt = typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;
  const status: SubscriptionStatus =
    type === "CANCELLATION"
      ? "CANCELED"
      : type === "BILLING_ISSUE"
        ? "IN_GRACE"
        : type === "SUBSCRIPTION_PAUSED"
          ? "ON_HOLD"
          : "ACTIVE";
  // Cancellation / pause / billing problems keep access until the end date, but will not renew.
  const willRenew = status === "ACTIVE";

  return {
    action: "set",
    update: {
      userId,
      entitlement: tier,
      productId: event.product_id ?? null,
      basePlanId: splitProductId(event.product_id).basePlanId,
      status,
      store: event.store ?? null,
      storeTransactionId: event.transaction_id ?? null,
      periodType: event.period_type ?? null,
      environment: event.environment ?? "PRODUCTION",
      expiresAt,
      willRenew,
      eventAt,
    },
  };
}

interface RcSubscriber {
  entitlements?: Record<string, { expires_date: string | null; product_identifier?: string; purchase_date?: string }>;
  subscriptions?: Record<
    string,
    {
      period_type?: string;
      store?: string;
      is_sandbox?: boolean;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
      refunded_at?: string | null;
      store_transaction_id?: string | null;
    }
  >;
}

/** Same idea for RevenueCat's REST "subscriber" answer, used by the sync route. One update per plan found. */
export function decideFromSubscriber(userId: string, subscriber: RcSubscriber, now: Date = new Date()): SubscriptionUpdate[] {
  const out: SubscriptionUpdate[] = [];
  for (const tier of TIERS) {
    const ent = subscriber.entitlements?.[tier];
    if (!ent) continue;
    const sub = ent.product_identifier ? subscriber.subscriptions?.[ent.product_identifier] : undefined;
    const expiresAt = ent.expires_date ? new Date(ent.expires_date) : null;
    const refunded = !!sub?.refunded_at;
    const status: SubscriptionStatus = refunded
      ? "REFUNDED"
      : !expiresAt || expiresAt.getTime() <= now.getTime()
        ? "EXPIRED"
        : sub?.billing_issues_detected_at
          ? "IN_GRACE"
          : sub?.unsubscribe_detected_at
            ? "CANCELED"
            : "ACTIVE";
    out.push({
      userId,
      entitlement: tier,
      productId: ent.product_identifier ?? null,
      basePlanId: splitProductId(ent.product_identifier).basePlanId,
      status,
      store: sub?.store ? sub.store.toUpperCase() : null,
      storeTransactionId: sub?.store_transaction_id ?? null,
      periodType: sub?.period_type ? sub.period_type.toUpperCase() : null,
      environment: sub?.is_sandbox ? "SANDBOX" : "PRODUCTION",
      expiresAt: refunded ? now : expiresAt,
      willRenew: status === "ACTIVE",
      eventAt: now,
    });
  }
  return out;
}

type RowLike = Pick<SubscriptionRow, "entitlement" | "expiresAt" | "status">;

export function isActive(row: Pick<SubscriptionRow, "expiresAt"> | null | undefined, now: Date = new Date()): boolean {
  return !!row?.expiresAt && row.expiresAt.getTime() > now.getTime();
}

/** The plan to honour for a person: the active one, Leader before Partner (Leader includes Partner), then the latest end date. */
export function bestRow<T extends RowLike>(rows: T[], now: Date = new Date()): T | null {
  const active = rows.filter((r) => isActive(r, now) && r.status !== "REFUNDED" && r.status !== "EXPIRED");
  if (active.length === 0) return null;
  active.sort((a, b) => {
    const rank = (r: T) => (r.entitlement === "leader" ? 1 : 0);
    return rank(b) - rank(a) || (b.expiresAt?.getTime() ?? 0) - (a.expiresAt?.getTime() ?? 0);
  });
  return active[0];
}

export function toSubscriptionInfo(rows: SubscriptionRow[] | SubscriptionRow | null | undefined, now: Date = new Date()): SubscriptionInfo | null {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const row = bestRow(list, now);
  if (!row) return null;
  return {
    tier: row.entitlement === "leader" ? "leader" : "partner",
    status: row.status as SubscriptionStatus,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    willRenew: row.willRenew,
    store: row.store,
    productId: row.productId,
    basePlanId: row.basePlanId,
    isTrial: row.periodType === "TRIAL",
    sandbox: row.environment === "SANDBOX",
  };
}

/** What a person on a Play subscription can see in the app, in words. Used for the payment-problem notices. */
export function statusNotice(info: Pick<SubscriptionInfo, "status" | "willRenew" | "expiresAt">): string | null {
  switch (info.status) {
    case "IN_GRACE":
      return "Google Play could not take your last payment. Your access continues for now: please update your payment method in Google Play.";
    case "ON_HOLD":
      return "Your subscription is on hold because the payment failed. Update your payment method in Google Play to continue.";
    case "CANCELED":
      return "Your subscription is cancelled. You keep access until it ends.";
    default:
      return null;
  }
}

export { SUB_ID_FOR_TIER };
