import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { testers } from '@/db/schema';
import { getAdminUser } from '@/lib/adminAuth';
import { parseRosterText, samePhone } from '@/lib/reminders';

const MAX_ADD = 200;

// Admin: add testers by hand (so people with no account yet can be reminded).
// Body: { text: "Name, 0803…\nName, a@b.com" }
export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const parsed = parseRosterText(typeof text === 'string' ? text.slice(0, 20_000) : '').slice(0, MAX_ADD);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: 'Add one person per line, e.g. "Grace Obi, 0803 123 4567" (a phone number or email is needed).' },
      { status: 400 }
    );
  }

  const existing = await db.select().from(testers);
  let added = 0;
  let skipped = 0;
  for (const p of parsed) {
    const dupe = existing.some(
      (e) => (p.email && e.email === p.email) || (p.phone && samePhone(e.phone, p.phone))
    );
    if (dupe) { skipped++; continue; }
    const row = { id: randomUUID(), name: p.name, phone: p.phone, email: p.email };
    await db.insert(testers).values(row);
    existing.push({ ...row, createdAt: new Date() });
    added++;
  }
  return NextResponse.json({ added, skipped });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await db.delete(testers).where(eq(testers.id, id));
  return NextResponse.json({ ok: true });
}
