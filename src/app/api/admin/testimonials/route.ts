import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testimonials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminUser } from '@/lib/adminAuth';

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await db.select().from(testimonials).orderBy(testimonials.createdAt);
  return NextResponse.json({ testimonials: rows });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, name, location, testimony, approved } = await req.json();
  const rows = await db.insert(testimonials).values({ id: id || crypto.randomUUID(), name, location: location || null, testimony, approved: approved ?? false }).returning();
  return NextResponse.json({ testimonial: rows[0] }, { status: 201 });
}

export async function PATCH(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, approved } = await req.json();
  const rows = await db.update(testimonials).set({ approved }).where(eq(testimonials.id, id)).returning();
  return NextResponse.json({ testimonial: rows[0] });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await db.delete(testimonials).where(eq(testimonials.id, id));
  return NextResponse.json({ ok: true });
}
