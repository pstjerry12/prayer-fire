import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";

// Public: fetch the latest announcements for the home page banner.
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(5);
    return NextResponse.json({ announcements: rows });
  } catch (err) {
    console.error("announcements list error", err);
    return NextResponse.json({ announcements: [] });
  }
}
