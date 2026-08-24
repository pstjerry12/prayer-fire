import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(donations)
      .orderBy(desc(donations.createdAt))
      .limit(300);

    return NextResponse.json({ donations: rows });
  } catch (err) {
    console.error("admin donations error", err);
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 });
  }
}
