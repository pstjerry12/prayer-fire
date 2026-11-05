import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { ADS_OFF, adsConfigFrom } from "@/lib/adsRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: whether the Home banner is switched on and which ad unit it uses. Ads are OFF unless the admin turned them on.
export async function GET() {
  try {
    const rows = await db.select().from(appSettings).where(inArray(appSettings.key, ["ads_enabled", "ads_banner_unit"]));
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return NextResponse.json(adsConfigFrom(map), { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json(ADS_OFF);
  }
}
