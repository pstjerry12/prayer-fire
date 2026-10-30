import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { applyUpdate, decideFromSubscriber, expireNow, getSubscription, toSubscriptionInfo } from "@/lib/subscription";

/**
 * "Check my subscription now." The app calls this right after a purchase or "Restore purchases",
 * so Partner switches on straight away without waiting for the webhook. It asks RevenueCat (with
 * the secret API key, server to server) what it knows about the signed-in person, then saves
 * the answer the same way the webhook does. Nothing the phone sends is trusted.
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("revenuecat sync failed", res.status);
      return NextResponse.json({ error: "Could not check right now" }, { status: 502 });
    }
    const data = (await res.json()) as { subscriber?: Parameters<typeof decideFromSubscriber>[1] };
    const update = data.subscriber ? decideFromSubscriber(userId, data.subscriber) : null;
    if (update) await applyUpdate(update);
    else await expireNow(userId, new Date());

    return NextResponse.json({ subscription: toSubscriptionInfo(await getSubscription(userId)) });
  } catch (err) {
    console.error("subscription sync error", err);
    return NextResponse.json({ error: "Could not check right now" }, { status: 502 });
  }
}
