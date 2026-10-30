import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, type SubscriptionRow } from "@/db/schema";
import { isAnonymousAppUserId, type SubscriptionUpdate } from "./subscriptionRules";
import type { SubscriptionStatus, SubscriptionTier } from "@/app/types";

export * from "./subscriptionRules";

/** Database side of the paid subscriptions: reads and writes the `subscriptions` table (one row per account per plan). */

export async function getSubscriptions(userId: string): Promise<SubscriptionRow[]> {
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
}

async function getRow(userId: string, entitlement: SubscriptionTier): Promise<SubscriptionRow | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.entitlement, entitlement)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Saves an update unless a newer one is already stored (RevenueCat can deliver events out of order).
 * Returns true when the row was written.
 */
export async function applyUpdate(update: SubscriptionUpdate): Promise<boolean> {
  const current = await getRow(update.userId, update.entitlement);
  if (current && current.lastEventAt.getTime() > update.eventAt.getTime()) return false;
  const values = {
    userId: update.userId,
    entitlement: update.entitlement,
    productId: update.productId,
    basePlanId: update.basePlanId,
    status: update.status,
    store: update.store,
    storeTransactionId: update.storeTransactionId,
    periodType: update.periodType,
    environment: update.environment,
    expiresAt: update.expiresAt,
    willRenew: update.willRenew,
    lastEventAt: update.eventAt,
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: [subscriptions.userId, subscriptions.entitlement], set: values });
  return true;
}

/** Switches a plan off right now (EXPIRATION or a refund), unless a newer event already restored it. */
export async function expireNow(userId: string, entitlement: SubscriptionTier, eventAt: Date, status: SubscriptionStatus = "EXPIRED"): Promise<boolean> {
  const current = await getRow(userId, entitlement);
  if (!current) return false;
  if (current.lastEventAt.getTime() > eventAt.getTime()) return false;
  await db
    .update(subscriptions)
    .set({ status, expiresAt: new Date(), willRenew: false, lastEventAt: eventAt, updatedAt: new Date() })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.entitlement, entitlement)));
  return true;
}

/** A purchase moved from one account to another: take it away from the old ids, give it to the new. */
export async function transfer(from: string[], to: string[], eventAt: Date): Promise<void> {
  for (const fromId of from) {
    if (isAnonymousAppUserId(fromId) || to.includes(fromId)) continue;
    const rows = await getSubscriptions(fromId);
    for (const row of rows) {
      for (const toId of to) {
        if (isAnonymousAppUserId(toId)) continue;
        await applyUpdate({
          userId: toId,
          entitlement: row.entitlement as SubscriptionTier,
          productId: row.productId,
          basePlanId: row.basePlanId,
          status: row.status as SubscriptionStatus,
          store: row.store,
          storeTransactionId: row.storeTransactionId,
          periodType: row.periodType,
          environment: row.environment,
          expiresAt: row.expiresAt,
          willRenew: row.willRenew,
          eventAt,
        });
      }
    }
    await db.delete(subscriptions).where(eq(subscriptions.userId, fromId));
  }
}
