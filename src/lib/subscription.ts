import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, type SubscriptionRow } from "@/db/schema";
import { isAnonymousAppUserId, PARTNER_ENTITLEMENT, type SubscriptionUpdate } from "./subscriptionRules";

export * from "./subscriptionRules";

/** Database side of the Partner subscription: reads and writes the `subscriptions` table. */

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Saves an update unless a newer one is already stored (RevenueCat can deliver events out of order).
 * Returns true when the row was written.
 */
export async function applyUpdate(update: SubscriptionUpdate): Promise<boolean> {
  const current = await getSubscription(update.userId);
  if (current && current.lastEventAt.getTime() > update.eventAt.getTime()) return false;
  const values = {
    userId: update.userId,
    entitlement: PARTNER_ENTITLEMENT,
    productId: update.productId,
    store: update.store,
    periodType: update.periodType,
    environment: update.environment,
    expiresAt: update.expiresAt,
    willRenew: update.willRenew,
    lastEventAt: update.eventAt,
    updatedAt: new Date(),
  };
  await db.insert(subscriptions).values(values).onConflictDoUpdate({ target: subscriptions.userId, set: values });
  return true;
}

/** Switches Partner off right now (EXPIRATION), unless a newer event already restored it. */
export async function expireNow(userId: string, eventAt: Date): Promise<boolean> {
  const current = await getSubscription(userId);
  if (!current) return false;
  if (current.lastEventAt.getTime() > eventAt.getTime()) return false;
  await db
    .update(subscriptions)
    .set({ expiresAt: new Date(), willRenew: false, lastEventAt: eventAt, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
  return true;
}

/** A purchase moved from one account to another: take it away from the old ids, give it to the new. */
export async function transfer(from: string[], to: string[], eventAt: Date): Promise<void> {
  for (const fromId of from) {
    if (isAnonymousAppUserId(fromId) || to.includes(fromId)) continue;
    const row = await getSubscription(fromId);
    if (!row) continue;
    for (const toId of to) {
      if (isAnonymousAppUserId(toId)) continue;
      await applyUpdate({
        userId: toId,
        productId: row.productId,
        store: row.store,
        periodType: row.periodType,
        environment: row.environment,
        expiresAt: row.expiresAt,
        willRenew: row.willRenew,
        eventAt,
      });
    }
    await db.delete(subscriptions).where(eq(subscriptions.userId, fromId));
  }
}
