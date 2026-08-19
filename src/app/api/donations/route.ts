import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { donations } from "@/db/schema";

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

    const [row] = await db
      .insert(donations)
      .values({
        id: randomUUID(),
        name: body.name || null,
        email: body.email || null,
        amount: Math.round(amount),
        currency: body.currency || "NGN",
        reference: body.reference || null,
        status: "success",
      })
      .returning();

    return NextResponse.json({ donation: row });
  } catch (err) {
    console.error("donation record error", err);
    return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
  }
}
