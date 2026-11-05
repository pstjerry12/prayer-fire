import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_PLAN_CONFIG, parsePlanConfig } from '@/lib/planConfig';

// Public: what the Free, Partner and Leader plans include and the Leader member limits. The admin's version (if any)
// is stored in app_settings under `plan_config`; anything missing or broken falls back to the defaults.
export async function GET() {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, 'plan_config')).limit(1);
    const config = rows[0]?.value ? parsePlanConfig(rows[0].value) : DEFAULT_PLAN_CONFIG;
    return NextResponse.json({ config }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ config: DEFAULT_PLAN_CONFIG });
  }
}
