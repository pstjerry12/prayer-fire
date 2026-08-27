import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminUser } from '@/lib/adminAuth';

// GET — admin reads all settings
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await db.select().from(appSettings);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return NextResponse.json({ settings: map });
}

// PATCH — admin updates one or more settings
export async function PATCH(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json(); // { key: value, key2: value2, ... }

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue;
    // Upsert: try update first, if 0 rows affected then insert
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
  }

  return NextResponse.json({ ok: true });
}
