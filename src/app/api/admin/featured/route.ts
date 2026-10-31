import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";
import { approveRequest, listFeatured, parseEnd, rejectRequest, removeFeatured, setFeaturedEnd } from "@/lib/featuredAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: featured groups. List the requests and the featured groups; approve (with an optional end date), decline,
// remove, or change an end date. Only an admin can call this; leaders can only ask from inside the app.

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await listFeatured(pool));
  } catch (err) {
    console.error("admin featured list error", err);
    return NextResponse.json({ error: "Failed to load featured groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id.slice(0, 80) : "";
    const groupId = typeof b.groupId === "string" ? b.groupId.slice(0, 80) : "";
    try {
      switch (b.action) {
        case "approve":
          await approveRequest(pool, id, admin.id, parseEnd(b.until));
          break;
        case "reject":
          await rejectRequest(pool, id, admin.id, typeof b.note === "string" ? b.note : "");
          break;
        case "remove":
          await removeFeatured(pool, groupId);
          break;
        case "setEnd":
          await setFeaturedEnd(pool, groupId, parseEnd(b.until));
          break;
        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    } catch (err) {
      // The messages thrown above are plain sentences meant for the admin.
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not do that." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await listFeatured(pool)) });
  } catch (err) {
    console.error("admin featured action error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
