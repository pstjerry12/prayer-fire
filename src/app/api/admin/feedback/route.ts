import { NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getAdminUser } from '@/lib/adminAuth';

const STATUSES = ['new', 'planned', 'done'];

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return NextResponse.json({ feedback: rows });
}

// Update status and/or the resolution note ("Fixed in build 13: …").
export async function PATCH(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, status, resolution } = await req.json();
  const updates: { status?: string; resolution?: string | null } = {};
  if (typeof status === 'string' && STATUSES.includes(status)) updates.status = status;
  if (typeof resolution === 'string') updates.resolution = resolution.trim() || null;
  if (!id || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  const rows = await db.update(feedback).set(updates).where(eq(feedback.id, id)).returning();
  return NextResponse.json({ feedback: rows[0] });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  await db.delete(feedback).where(eq(feedback.id, id));
  return NextResponse.json({ ok: true });
}
