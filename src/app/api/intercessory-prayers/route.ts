import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { intercessoryPrayers } from "@/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";

// Written once from the Prayer Workshop's Intercessory Prayer session, then
// prayed through in the Start-Up Prayer session — both screens read/write
// the same rows here rather than keeping separate copies. Private to the
// user who wrote them, unlike testimonials which are public once approved.

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Sign in to save prayer points." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      category?: string;
      title?: string;
      details?: string;
    };

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Name or title is required" }, { status: 400 });
    }

    const [row] = await db
      .insert(intercessoryPrayers)
      .values({
        id: randomUUID(),
        userId,
        category: body.category?.trim() || "Individual by Name & Challenge",
        title,
        details: body.details?.trim() || "",
        isAnswered: false,
      })
      .returning();

    return NextResponse.json({ prayer: row });
  } catch (err) {
    console.error("intercessory prayer submit error", err);
    return NextResponse.json({ error: "Failed to save prayer point" }, { status: 500 });
  }
}

// The current user's own saved intercessory prayer points, newest first.
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Sign in to view your prayer points." }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(intercessoryPrayers)
      .where(eq(intercessoryPrayers.userId, userId))
      .orderBy(desc(intercessoryPrayers.createdAt))
      .limit(200);

    return NextResponse.json({ prayers: rows });
  } catch (err) {
    console.error("intercessory prayers list error", err);
    return NextResponse.json({ error: "Failed to load prayer points" }, { status: 500 });
  }
}
