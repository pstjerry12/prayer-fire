import { NextResponse } from "next/server";
import { pool } from "@/db";
import { isKind, listPublic } from "@/lib/videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, free: the videos the admin has added (tutorials, podcast episodes, short teachings). Read only.
//   /api/videos?kind=tutorial|podcast|teaching   &feature=bible   &limit=10
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    const feature = url.searchParams.get("feature");
    const limit = Number(url.searchParams.get("limit"));
    const videos = await listPublic(pool, {
      kind: isKind(kind) ? kind : undefined,
      feature: feature ? feature.slice(0, 40) : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json({ videos }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("videos GET error", err);
    return NextResponse.json({ videos: [] });
  }
}
