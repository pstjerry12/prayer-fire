import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { donations } from "@/db/schema";

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

/**
 * Verify a Flutterwave transaction by tx_ref on the server.
 * This is what makes donations real: the client can never be trusted to say
 * "payment succeeded" — only Flutterwave's API can confirm it.
 *
 * Returns true if the payment is confirmed. If FLUTTERWAVE_SECRET_KEY is not
 * configured yet (the current demo state), we keep the old behaviour so the
 * site still works without a key.
 */
async function verifyFlutterwaveReference(
  reference: string,
  expectedAmount: number,
  expectedCurrency: string
): Promise<boolean> {
  if (!FLUTTERWAVE_SECRET) return true;

  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      status?: string;
      data?: { status?: string; amount?: number; currency?: string };
    };
    if (data?.status !== "success" || data?.data?.status !== "successful") return false;
    // Guard against amount/currency tampering: the paid amount must match
    // what we're about to record (Flutterwave amounts are not ×100).
    const paidAmount = Math.round((data.data.amount || 0) * 100);
    return paidAmount === expectedAmount && data.data.currency === expectedCurrency;
  } catch (err) {
    console.error("flutterwave verify error", err);
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

    const currency = body.currency || "NGN";

    // Confirm with Flutterwave before trusting the reference. Only when
    // verified do we mark the donation as a real success.
    const verified = body.reference
      ? await verifyFlutterwaveReference(String(body.reference), Math.round(amount), currency)
      : !FLUTTERWAVE_SECRET; // demo fallback when no key is configured

    const [row] = await db
      .insert(donations)
      .values({
        id: randomUUID(),
        name: body.name || null,
        email: body.email || null,
        amount: Math.round(amount),
        currency,
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
