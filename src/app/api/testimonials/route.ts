import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { testimonials } from "@/db/schema";

// Anyone can submit a testimony. Always goes in unapproved for admin moderation.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      testimony?: string;
      name?: string;
      location?: string;
      isAnonymous?: boolean;
    };

    const testimony = (body.testimony || "").trim();
    if (!testimony) {
      return NextResponse.json({ error: "Testimony is required" }, { status: 400 });
    }

    const isAnonymous = !!body.isAnonymous;

    const [row] = await db
      .insert(testimonials)
      .values({
        id: randomUUID(),
        name: isAnonymous ? null : (body.name?.trim() || null),
        location: body.location?.trim() || null,
        testimony,
        isAnonymous,
        approved: false,
      })
      .returning();

    return NextResponse.json({ testimonial: row });
  } catch (err) {
    console.error("testimony submit error", err);
    return NextResponse.json({ error: "Failed to submit testimony" }, { status: 500 });
  }
}

// Public list of APPROVED testimonies (shown on the home page).
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.approved, true))
      .orderBy(desc(testimonials.createdAt))
      .limit(200);

    return NextResponse.json({ testimonials: rows });
  } catch (err) {
    console.error("testimonials list error", err);
    return NextResponse.json({ error: "Failed to load testimonials" }, { status: 500 });
  }
}
