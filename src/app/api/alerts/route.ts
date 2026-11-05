import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { getSessionUser } from "@/lib/adminAuth";
import { getSubscriptions, toSubscriptionInfo } from "@/lib/subscription";
import { getFreeMode } from "@/lib/freeMode";
import * as A from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Global Prayer Alerts for everyone (free). Anyone can read; "I'm praying" needs a signed-in account; a Leader can ask for a
// public altar (the admin approves it before it shows). Admin posting and approving is in /api/admin/alerts.

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request).catch(() => null);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const alert = await A.getAlert(pool, id.slice(0, 80), userId);
      if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
      return NextResponse.json({ alert });
    }
    if (url.searchParams.get("mine") && userId) return NextResponse.json({ requests: await A.myRequests(pool, userId) });
    return NextResponse.json({ alerts: await A.listLive(pool, userId) });
  } catch (err) {
    console.error("alerts GET error", err);
    return NextResponse.json({ error: "Could not load prayer alerts." }, { status: 500 });
  }
}

async function isLeader(userId: string): Promise<boolean> {
  if ((await getFreeMode()).active) return true;
  return toSubscriptionInfo(await getSubscriptions(userId))?.tier === "leader";
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request).catch(() => null);
    if (!userId) return NextResponse.json({ error: "Sign in to pray with the world." }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    switch (b.action) {
      case "pray": {
        const country = A.countryFromHeader(request.headers.get("x-vercel-ip-country"));
        const counted = await A.pray(pool, typeof b.id === "string" ? b.id.slice(0, 80) : "", userId, country);
        const alert = await A.getAlert(pool, typeof b.id === "string" ? b.id.slice(0, 80) : "", userId);
        return NextResponse.json({ counted, alert });
      }
      case "request": {
        if (!(await isLeader(userId))) return NextResponse.json({ error: "Raising a public prayer altar is part of Prayer Fire Leader." }, { status: 403 });
        const user = await getSessionUser(request);
        try {
          const id = await A.requestAltar(pool, userId, user?.name || "Leader", { title: String(b.title ?? ""), summary: String(b.summary ?? ""), scriptures: b.scriptures, points: b.points, country: typeof b.country === "string" ? b.country : null });
          return NextResponse.json({ ok: true, id });
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : "Could not send the request." }, { status: 400 });
        }
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    console.error("alerts POST error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
