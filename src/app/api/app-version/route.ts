import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Public: what's currently live, so open apps can offer an update.
//  - build: the web build now deployed (compared to the build the app loaded)
//  - androidLatestBuild: newest Android versionCode available on the Play
//    Store, set by the admin once a release is live
//  - idleLockMinutes: minutes of inactivity before the app asks for sign-in
//    again (admin setting; 0 = never). Defaults to 30 when unset.
const DEFAULT_IDLE_LOCK_MINUTES = 30;

export async function GET() {
  let androidLatestBuild: number | null = null;
  let idleLockMinutes = DEFAULT_IDLE_LOCK_MINUTES;
  try {
    // Never let a slow DB hold up the web-build answer
    const rows = await Promise.race([
      db
        .select()
        .from(appSettings)
        .where(inArray(appSettings.key, ['android_latest_build', 'idle_lock_minutes'])),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    const get = (key: string) => rows.find((r) => r.key === key)?.value ?? '';
    const n = parseInt(get('android_latest_build'), 10);
    if (Number.isFinite(n) && n > 0) androidLatestBuild = n;
    const idle = parseInt(get('idle_lock_minutes'), 10);
    if (Number.isFinite(idle) && idle >= 0 && idle <= 1440) idleLockMinutes = idle;
  } catch {
    // DB slow/unavailable — still report the web build
  }

  return NextResponse.json(
    {
      build: process.env.VERCEL_GIT_COMMIT_SHA || null,
      androidLatestBuild,
      idleLockMinutes,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
