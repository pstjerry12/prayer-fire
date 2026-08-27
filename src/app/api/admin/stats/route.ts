import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const usersRows = await db.execute<{ count: number }>(sql`select count(*)::int as count from users`);
    const requestsRows = await db.execute<{ count: number }>(sql`select count(*)::int as count from partner_requests`);
    const approvedRows = await db.execute<{ count: number }>(sql`select count(*)::int as count from partner_requests where approved = true`);
    const donationsRows = await db.execute<{ count: number }>(sql`select count(*)::int as count from donations`);
    const totalRows = await db.execute<{ total: string | number }>(sql`select coalesce(sum(amount), 0)::bigint as total from donations`);

    return NextResponse.json({
      users: usersRows.rows[0]?.count ?? 0,
      partnerRequests: requestsRows.rows[0]?.count ?? 0,
      approvedRequests: approvedRows.rows[0]?.count ?? 0,
      donations: donationsRows.rows[0]?.count ?? 0,
      donationTotal: Number(totalRows.rows[0]?.total ?? 0),
    });
  } catch (err) {
    console.error("admin stats error", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
