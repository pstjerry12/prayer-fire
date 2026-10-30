import type { SubscriptionRow } from "@/db/schema";
import type { SubscriptionInfo } from "@/app/types";

/**
 * The rules (no database here, so they can be tested on their own).
 * Paid-subscription logic shared by the RevenueCat webhook and the sync route.
 * RevenueCat is the middleman for Google Play Billing; this file turns what it says
 * into one row per account in the `subscriptions` table, which is the single source
 * of truth the app reads to unlock Partner features.
 */

export const PARTNER_ENTITLEMENT = "partner";
/** Play subscription id; RevenueCat product ids look like "prayerfire_partner:monthly". */
export const PARTNER_PRODUCT_PREFIX = "prayerfire_partner";

export type { SubscriptionInfo };

/** One normalised update, whatever RevenueCat endpoint it came from. */
export interface SubscriptionUpdate {
  userId: string;
  productId: string | null;
  store: string | null;
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
  event_timestamp_ms?: number;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
  transferred_to?: string[];
}

/** Only the Partner product counts here: by entitlement name, or (for older events) by product id. */
export function eventIsForPartner(e: WebhookEvent): boolean {
  const ids = [...(e.entitlement_ids ?? []), ...(e.entitlement_id ? [e.entitlement_id] : [])];
  if (ids.length > 0) return ids.includes(PARTNER_ENTITLEMENT);
  return typeof e.product_id === "string" && e.product_id.startsWith(PARTNER_PRODUCT_PREFIX);
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
  | { action: "expire"; userId: string; eventAt: Date }
  | { action: "transfer"; from: string[]; to: string[]; eventAt: Date };

/**
 * Turns one RevenueCat webhook event into what to do with the database.
 * Rule of thumb: the end date RevenueCat gives us decides everything. A cancelled
 * subscription keeps working until it ends; only EXPIRATION (or an end date in the past)
 * switches Partner off.
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
  if (!eventIsForPartner(event)) return { action: "ignore", reason: "not the partner product" };

  if (type === "EXPIRATION") return { action: "expire", userId, eventAt };

  const expiresAt = typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;
  // Cancellation / pause / billing problems keep access until the end date, but will not renew.
  const willRenew = !["CANCELLATION", "SUBSCRIPTION_PAUSED", "BILLING_ISSUE"].includes(type);

  return {
    action: "set",
    update: {
      userId,
      productId: event.product_id ?? null,
      store: event.store ?? null,
      periodType: event.period_type ?? null,
      environment: event.environment ?? "PRODUCTION",
      expiresAt,
      willRenew,
      eventAt,
    },
  };
}

interface RcSubscriber {
  entitlements?: Record<string, { expires_date: string | null; product_identifier?: string }>;
  subscriptions?: Record<
    string,
    { period_type?: string; store?: string; is_sandbox?: boolean; unsubscribe_detected_at?: string | null; billing_issues_detected_at?: string | null }
  >;
}

/** Same idea for RevenueCat's REST "subscriber" answer, used by the sync route. */
export function decideFromSubscriber(userId: string, subscriber: RcSubscriber, now: Date = new Date()): SubscriptionUpdate | null {
  const ent = subscriber.entitlements?.[PARTNER_ENTITLEMENT];
  if (!ent) return null;
  const sub = ent.product_identifier ? subscriber.subscriptions?.[ent.product_identifier] : undefined;
  return {
    userId,
    productId: ent.product_identifier ?? null,
    store: sub?.store ? sub.store.toUpperCase() : null,
    periodType: sub?.period_type ? sub.period_type.toUpperCase() : null,
    environment: sub?.is_sandbox ? "SANDBOX" : "PRODUCTION",
    expiresAt: ent.expires_date ? new Date(ent.expires_date) : null,
    willRenew: !(sub?.unsubscribe_detected_at || sub?.billing_issues_detected_at),
    eventAt: now,
  };
}

export function isActive(row: Pick<SubscriptionRow, "expiresAt"> | null | undefined, now: Date = new Date()): boolean {
  return !!row?.expiresAt && row.expiresAt.getTime() > now.getTime();
}

export function toSubscriptionInfo(row: SubscriptionRow | null | undefined, now: Date = new Date()): SubscriptionInfo | null {
  if (!row || !isActive(row, now)) return null;
  return {
    tier: "partner",
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    willRenew: row.willRenew,
    store: row.store,
    productId: row.productId,
    isTrial: row.periodType === "TRIAL",
    sandbox: row.environment === "SANDBOX",
  };
}

