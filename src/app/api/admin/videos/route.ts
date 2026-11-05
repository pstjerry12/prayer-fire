import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";
import { addLinks, deleteVideo, isKind, listAll, updateVideo } from "@/lib/videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: paste YouTube links; the title is fetched automatically (the thumbnail comes from the video id). Only an admin can call this.

const s = (v: unknown, max = 80) => (typeof v === "string" ? v.slice(0, max) : "");

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ videos: await listAll(pool) });
  } catch (err) {
    console.error("admin videos list error", err);
    return NextResponse.json({ error: "Failed to load videos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    let result: unknown = null;
    try {
      switch (b.action) {
        case "add": {
          if (!isKind(b.kind)) return NextResponse.json({ error: "Choose what kind of video this is." }, { status: 400 });
          result = await addLinks(pool, s(b.links, 4000), b.kind, typeof b.feature === "string" ? b.feature : null);
          break;
        }
        case "update":
          await updateVideo(pool, s(b.id), {
            title: typeof b.title === "string" ? b.title : undefined,
            feature: b.feature === null ? null : typeof b.feature === "string" ? b.feature : undefined,
            published: typeof b.published === "boolean" ? b.published : undefined,
            sort: typeof b.sort === "number" ? b.sort : undefined,
          });
          break;
        case "delete":
          await deleteVideo(pool, s(b.id));
          break;
        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    } catch (err) {
      // The messages thrown by the videos code are plain sentences meant for the admin.
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not do that." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, result, videos: await listAll(pool) });
  } catch (err) {
    console.error("admin videos action error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
