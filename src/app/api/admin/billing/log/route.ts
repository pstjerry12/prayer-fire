import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { billingActions, priceChanges } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";

// GET: the latest price changes and other billing actions (who, when, what), newest first
export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [prices, actions] = await Promise.all([
    db.select().from(priceChanges).orderBy(desc(priceChanges.createdAt)).limit(50),
    db.select().from(billingActions).orderBy(desc(billingActions.createdAt)).limit(30),
  ]);
  return NextResponse.json({ prices, actions });
}
