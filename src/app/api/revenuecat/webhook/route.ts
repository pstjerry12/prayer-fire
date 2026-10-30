import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { applyUpdate, decideWebhook, expireNow, transfer } from "@/lib/subscription";

/**
 * RevenueCat webhook: RevenueCat calls this every time a Google Play subscription is bought,
 * renewed, cancelled or ends. We save the result in the `subscriptions` table (the single
 * source of truth that unlocks Partner features).
 *
 * Set it up in RevenueCat → Project settings → Integrations → Webhooks:
 *   URL:                  https://prayer-fire.vercel.app/api/revenuecat/webhook
 *   Authorization header: the same secret as the REVENUECAT_WEBHOOK_AUTH env var (Vercel)
 * RevenueCat sends that value back in the Authorization header, so only RevenueCat can call this.
 */
function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const candidates = [received, received.replace(/^Bearer\s+/i, "")];
  const want = Buffer.from(expected);
  return candidates.some((c) => {
    const got = Buffer.from(c);
    return got.length === want.length && timingSafeEqual(got, want);
  });
}

export async function POST(request: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Invalid authorization" }, { status: 401 });
  }

  let body: { event?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.event || typeof body.event !== "object") {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  try {
    const decision = decideWebhook(body.event);
    switch (decision.action) {
      case "set":
        await applyUpdate(decision.update);
        break;
      case "expire":
        await expireNow(decision.userId, decision.eventAt);
        break;
      case "transfer":
        await transfer(decision.from, decision.to, decision.eventAt);
        break;
      default:
        break; // ignored events still get a 200 so RevenueCat does not keep retrying them
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("revenuecat webhook error", err);
    // 500 makes RevenueCat retry later, which is what we want for a temporary database problem.
    return NextResponse.json({ error: "Could not process event" }, { status: 500 });
  }
}
