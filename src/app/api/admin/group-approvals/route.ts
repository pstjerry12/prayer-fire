import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";
import { decideApplication, listApplications } from "@/lib/groupApprovals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: applications to open a prayer group. List the pending ones; approve (the group goes live) or decline (with a
// note the leader sees). Only an admin can call this.

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ applications: await listApplications(pool) });
  } catch (err) {
    console.error("admin group applications list error", err);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const groupId = typeof b.groupId === "string" ? b.groupId.slice(0, 80) : "";
    if (b.action !== "approve" && b.action !== "reject") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    try {
      await decideApplication(pool, groupId, b.action === "approve", typeof b.note === "string" ? b.note : "");
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not do that." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, applications: await listApplications(pool) });
  } catch (err) {
    console.error("admin group applications action error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
