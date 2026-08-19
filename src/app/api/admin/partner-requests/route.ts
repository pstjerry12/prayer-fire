import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partnerRequests } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(partnerRequests)
      .orderBy(desc(partnerRequests.createdAt))
      .limit(300);

    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error("admin requests error", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { id?: string; approved?: boolean };
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const [updated] = await db
      .update(partnerRequests)
      .set({ approved: !!body.approved })
      .where(eq(partnerRequests.id, body.id))
      .returning();

    return NextResponse.json({ request: updated });
  } catch (err) {
    console.error("admin update request error", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(partnerRequests).where(eq(partnerRequests.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin delete request error", err);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
