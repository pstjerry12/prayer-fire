import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";

/**
 * Paystack webhook. When a payment succeeds, Paystack sends a `charge.success`
 * event here (even if the donor closed their browser before our popup callback
 * ran). We verify the request signature with PAYSTACK_SECRET_KEY, then mark the
 * matching donation as successful.
 *
 * Point Paystack at:  https://prayer-fire.vercel.app/api/donations/webhook
 * (Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL)
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { reference?: string; status?: string };
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event === "charge.success") {
    const reference = body.data?.reference;
    if (reference) {
      await db
        .update(donations)
        .set({ status: "success" })
        .where(eq(donations.reference, reference));
    }
  }

  return NextResponse.json({ received: true });
}
