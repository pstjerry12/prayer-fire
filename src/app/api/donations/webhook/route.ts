import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";

/**
 * Flutterwave webhook. When a payment succeeds, Flutterwave sends a
 * `charge.completed` event here (even if the donor closed their browser
 * before our popup callback ran). We verify the request using the
 * `verif-hash` header against FLW_SECRET_HASH, then mark the matching
 * donation as successful.
 *
 * Point Flutterwave at:  https://prayer-fire.vercel.app/api/donations/webhook
 * (Flutterwave Dashboard → Settings → Webhooks — set the same secret hash
 * there as FLW_SECRET_HASH in your env vars; Flutterwave does not sign the
 * payload, it just echoes back this shared secret in the verif-hash header)
 */
export async function POST(request: Request) {
  const secretHash = process.env.FLW_SECRET_HASH;

  if (!secretHash) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("verif-hash");
  if (!signature || signature !== secretHash) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { tx_ref?: string; status?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event === "charge.completed" && body.data?.status === "successful") {
    const reference = body.data?.tx_ref;
    if (reference) {
      await db
        .update(donations)
        .set({ status: "success" })
        .where(eq(donations.reference, reference));
    }
  }

  return NextResponse.json({ received: true });
}
