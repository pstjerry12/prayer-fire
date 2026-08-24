import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { donations } from "@/db/schema";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * Verify a Paystack transaction reference on the server.
 * This is what makes donations real: the client can never be trusted to say
 * "payment succeeded" — only Paystack's API can confirm it.
 *
 * Returns true if the payment is confirmed. If PAYSTACK_SECRET_KEY is not
 * configured yet (the current demo state), we keep the old behaviour so the
 * site still works without a key.
 */
async function verifyPaystackReference(reference: string): Promise<boolean> {
  if (!PAYSTACK_SECRET) return true;

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      status?: boolean;
      data?: { status?: string };
    };
    return Boolean(data?.status && data?.data?.status === "success");
  } catch (err) {
    console.error("paystack verify error", err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      amount?: number;
      currency?: string;
      reference?: string;
    };

    const amount = Number(body.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Confirm with Paystack before trusting the reference. Only when verified
    // do we mark the donation as a real success.
    const verified = body.reference
      ? await verifyPaystackReference(String(body.reference))
      : !PAYSTACK_SECRET; // demo fallback when no key is configured

    const [row] = await db
      .insert(donations)
      .values({
        id: randomUUID(),
        name: body.name || null,
        email: body.email || null,
        amount: Math.round(amount),
        currency: body.currency || "NGN",
        reference: body.reference || null,
        status: verified ? "success" : "pending",
      })
      .returning();

    return NextResponse.json({ donation: row, verified });
  } catch (err) {
    console.error("donation record error", err);
    return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
  }
}
