import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getAdminUser } from "@/lib/adminAuth";
import { audioConfigured } from "@/lib/bibleAudioServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: are the premium-voice keys set, and how much has been generated. The voices and the daily cap themselves are saved
// through /api/admin/settings (key bible_voices). Only an admin can call this.
export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stats = await pool.query(
      `select count(*) filter (where status = 'ready')::int as ready,
              count(*) filter (where status = 'failed')::int as failed,
              count(*) filter (where created_at >= date_trunc('day', now()) and status <> 'failed')::int as today,
              coalesce(sum(bytes) filter (where status = 'ready'), 0)::bigint as bytes
       from bible_audio`
    );
    const r = stats.rows[0];
    return NextResponse.json({
      configured: audioConfigured(),
      elevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      storageKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ready: Number(r.ready), failed: Number(r.failed), today: Number(r.today), megabytes: Math.round(Number(r.bytes) / 1048576),
    });
  } catch (err) {
    console.error("admin bible-audio error", err);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}
