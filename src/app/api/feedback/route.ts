import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";

const CATEGORIES = ["bug", "idea", "praise", "other"] as const;
const PLATFORMS = ["android", "ios", "web"] as const;
const MAX_MESSAGE = 2000;
const MAX_SHORT = 200;

function short(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, MAX_SHORT);
  return v || null;
}

// Anyone can send feedback (signed in or not). Only the admin can read it.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Please write your feedback" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: `Please keep it under ${MAX_MESSAGE} characters` }, { status: 400 });
    }

    const category = CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])
      ? (body.category as string)
      : "other";
    const platform = PLATFORMS.includes(body.platform as (typeof PLATFORMS)[number])
      ? (body.platform as string)
      : null;

    await db.insert(feedback).values({
      id: randomUUID(),
      userId: await getUserIdFromRequest(request),
      name: short(body.name),
      contact: short(body.contact),
      category,
      message,
      appVersion: short(body.appVersion),
      platform,
      page: short(body.page),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("feedback submit error", err);
    return NextResponse.json({ error: "Could not send feedback. Please try again." }, { status: 500 });
  }
}
