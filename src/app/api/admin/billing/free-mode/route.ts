import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, billingActions } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";
import { computeFreeMode, FREE_MODE_KEYS, getFreeModeSettings } from "@/lib/freeMode";

async function save(key: string, value: string) {
  const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing.length > 0) await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
  else await db.insert(appSettings).values({ key, value });
}

// GET: the saved Free Premium Mode settings and whether it is on right now
export async function GET(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await getFreeModeSettings();
  return NextResponse.json({ settings, current: computeFreeMode(settings) });
}

// PUT: { enabled, start?, end?, existing: "keep" | "defer" }
export async function PUT(request: Request) {
  const admin = await getAdminUser(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { enabled?: unknown; start?: unknown; end?: unknown; existing?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const date = (v: unknown): string | null | "bad" => {
    if (v === null || v === undefined || v === "") return null;
    return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : "bad";
  };
  const start = date(body.start);
  const end = date(body.end);
  if (start === "bad" || end === "bad") return NextResponse.json({ error: "Those dates are not valid." }, { status: 400 });
  if (start && end && Date.parse(end) <= Date.parse(start)) return NextResponse.json({ error: "The end date must be after the start date." }, { status: 400 });
  if (body.enabled === true && end && Date.parse(end) <= Date.now()) {
    return NextResponse.json({ error: "The end date has already passed, so free mode would switch itself off at once." }, { status: 400 });
  }
  const existing = body.existing === "defer" ? "defer" : "keep";

  await save(FREE_MODE_KEYS.enabled, body.enabled === true ? "true" : "false");
  await save(FREE_MODE_KEYS.start, start ?? "");
  await save(FREE_MODE_KEYS.end, end ?? "");
  await save(FREE_MODE_KEYS.existing, existing);

  await db.insert(billingActions).values({
    id: crypto.randomUUID(),
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "free_mode",
    details: { enabled: body.enabled === true, start, end, existing },
    result: "success",
  });

  const settings = await getFreeModeSettings();
  return NextResponse.json({ ok: true, settings, current: computeFreeMode(settings) });
}
