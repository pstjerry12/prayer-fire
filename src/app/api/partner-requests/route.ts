import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partnerRequests } from "@/db/schema";

// Anyone can submit a prayer request.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      location?: string;
      request?: string;
    };

    const name = (body.name || "").trim();
    const text = (body.request || "").trim();
    if (!name || !text) {
      return NextResponse.json({ error: "Name and request are required" }, { status: 400 });
    }

    const [row] = await db
      .insert(partnerRequests)
      .values({
        id: randomUUID(),
        name,
        location: body.location?.trim() || null,
        request: text,
        prayers: 0,
        approved: false,
      })
      .returning();

    return NextResponse.json({ request: row });
  } catch (err) {
    console.error("partner request submit error", err);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

// Public list of APPROVED requests (shown on the partner wall).
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.approved, true))
      .orderBy(desc(partnerRequests.createdAt))
      .limit(200);

    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error("partner requests list error", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}
