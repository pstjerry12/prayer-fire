import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";

export const runtime = "nodejs";

// Admin: list all announcements.
export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(100);
    return NextResponse.json({ announcements: rows });
  } catch (err) {
    console.error("admin announcements list error", err);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

// Admin: broadcast a new announcement.
export async function POST(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
    };
    const title = (body.title || "").trim();
    const text = (body.body || "").trim();
    if (!title || !text) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const [row] = await db
      .insert(announcements)
      .values({ id: randomUUID(), title, body: text })
      .returning();

    return NextResponse.json({ announcement: row });
  } catch (err) {
    console.error("admin announcement create error", err);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

// Admin: delete an announcement.
export async function DELETE(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(announcements).where(eq(announcements.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin announcement delete error", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
