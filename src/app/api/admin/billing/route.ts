import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";

// Runs the longer billing actions (deferring many subscribers one by one) without the short default time limit.
export const maxDuration = 60;

/**
 * Admin-only gateway to the Supabase Edge Function "billing-admin", which holds the Google Play
 * service account. The role check happens here (the account must have role "admin" in the database);
 * the Edge Function only answers calls that carry the shared secret, and nothing in the browser ever sees it.
 */
const ALLOWED = new Set(["pricing.list", "pricing.preview", "pricing.update", "offers.list", "offers.create", "offers.activate", "offers.deactivate", "defer.preview", "defer.run"]);
const DEFAULT_FUNCTIONS_URL = "https://ebhlmjryezzxtoymoetn.supabase.co/functions/v1";

export async function POST(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const secret = process.env.BILLING_FUNCTIONS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Billing admin is not set up yet: BILLING_FUNCTIONS_SECRET is missing in Vercel." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.action !== "string" || !ALLOWED.has(body.action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    const base = (process.env.SUPABASE_FUNCTIONS_URL || DEFAULT_FUNCTIONS_URL).replace(/\/$/, "");
    const res = await fetch(`${base}/billing-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-billing-secret": secret },
      // `admin` is set here, from the verified session: whatever the browser sent is ignored.
      body: JSON.stringify({ ...body, admin: { id: admin.id, email: admin.email } }),
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: `The billing function answered with an error (${res.status}). Is it deployed?` };
    }
    return NextResponse.json(data, { status: res.ok ? 200 : res.status === 401 ? 502 : res.status });
  } catch (err) {
    console.error("billing admin proxy error", err);
    return NextResponse.json({ error: "Could not reach the billing function." }, { status: 502 });
  }
}
