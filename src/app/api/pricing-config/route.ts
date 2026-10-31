import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Public: returns current pricing (DB overrides defaults)
export async function GET() {
  const keys = [
    'price_partner_monthly',
    'price_partner_yearly',
    'price_leader_monthly',
    'price_leader_yearly',
  ];

  const map: Record<string, number> = {
    price_partner_monthly: 2.99,
    price_partner_yearly: 29.99,
    price_leader_monthly: 5.99,
    price_leader_yearly: 59.99,
  };

  for (const key of keys) {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (rows[0]?.value) map[key] = parseFloat(rows[0].value);
  }

  return NextResponse.json({ pricing: map });
}
