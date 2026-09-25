import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Public: what's currently live, so open apps can offer an update.
//  - build: the web build now deployed (compared to the build the app loaded)
//  - androidLatestBuild: newest Android versionCode available on the Play
//    Store, set by the admin once a release is live
export async function GET() {
  let androidLatestBuild: number | null = null;
  try {
    // Never let a slow DB hold up the web-build answer
    const rows = await Promise.race([
      db.select().from(appSettings).where(eq(appSettings.key, 'android_latest_build')).limit(1),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    const n = parseInt(rows[0]?.value ?? '', 10);
    if (Number.isFinite(n) && n > 0) androidLatestBuild = n;
  } catch {
    // DB slow/unavailable — still report the web build
  }

  return NextResponse.json(
    {
      build: process.env.VERCEL_GIT_COMMIT_SHA || null,
      androidLatestBuild,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
