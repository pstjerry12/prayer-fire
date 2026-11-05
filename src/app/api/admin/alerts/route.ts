import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";
import * as A from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: post and manage Global Prayer Alerts, add updates and answered-prayer testimonies, and approve or decline the public
// altars Leaders ask for. Only an admin can call this.

const s = (v: unknown, max = 80) => (typeof v === "string" ? v.slice(0, max) : "");

async function snapshot() {
  return { alerts: await A.listAll(pool), requests: await A.listRequests(pool, "pending") };
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const alert = await A.getAlert(pool, id.slice(0, 80), null, true);
      if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
      return NextResponse.json({ alert });
    }
    return NextResponse.json(await snapshot());
  } catch (err) {
    console.error("admin alerts list error", err);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = { title: s(b.title, 200), summary: s(b.summary, 2500), scriptures: b.scriptures, points: b.points, country: typeof b.country === "string" ? b.country : null };
    let createdId: string | undefined;
    try {
      switch (b.action) {
        case "create":
          createdId = await A.createAlert(pool, input, { status: b.status === "draft" ? "draft" : "live", authorName: admin.name || "Prayer Fire", authorId: admin.id, pinned: b.pinned === true });
          break;
        case "update":
          await A.updateAlert(pool, s(b.id), { ...input, status: s(b.status, 10), pinned: b.pinned === true });
          break;
        case "setStatus":
          await A.setStatus(pool, s(b.id), b.status === "draft" || b.status === "ended" ? b.status : "live");
          break;
        case "delete":
          await A.deleteAlert(pool, s(b.id));
          break;
        case "addUpdate":
          await A.addUpdate(pool, s(b.id), b.kind === "testimony" ? "testimony" : "update", s(b.body, 2500));
          break;
        case "deleteUpdate":
          await A.deleteUpdate(pool, s(b.updateId));
          break;
        case "approveRequest":
          await A.decideRequest(pool, s(b.requestId), true, "");
          break;
        case "rejectRequest":
          await A.decideRequest(pool, s(b.requestId), false, s(b.note, 300));
          break;
        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    } catch (err) {
      // The messages thrown by the alerts code are plain sentences meant for the admin.
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not do that." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: createdId, ...(await snapshot()) });
  } catch (err) {
    console.error("admin alerts action error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
