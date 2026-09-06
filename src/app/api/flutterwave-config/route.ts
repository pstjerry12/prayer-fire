import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Public: returns the active Flutterwave public key (DB overrides env var)
export async function GET() {
  // Check DB first
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, 'flutterwave_public_key')).limit(1);
  const dbKey = rows[0]?.value;

  // DB key takes priority, then env var, then empty
  const publicKey = dbKey || process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
  const isLive = publicKey.startsWith('FLWPUBK-');

  return NextResponse.json({
    publicKey,
    isLive,
    mode: isLive ? 'LIVE' : (publicKey ? 'TEST' : 'NOT_CONFIGURED'),
  });
}
