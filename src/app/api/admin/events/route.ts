import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminUser } from '@/lib/adminAuth';

export async function GET() {
  const rows = await db.select().from(events).orderBy(events.date);
  return NextResponse.json({ events: rows });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, title, description, date, time, link } = await req.json();
  const rows = await db.insert(events).values({ id: id || crypto.randomUUID(), title, description: description || null, date, time: time || null, link: link || null }).returning();
  return NextResponse.json({ event: rows[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, title, description, date, time, link } = await req.json();
  const rows = await db.update(events).set({ title, description: description || null, date, time: time || null, link: link || null }).where(eq(events.id, id)).returning();
  return NextResponse.json({ event: rows[0] });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
