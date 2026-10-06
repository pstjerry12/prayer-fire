import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, userActivity, testers, appSettings } from '@/db/schema';
import { getAdminUser } from '@/lib/adminAuth';
import { fullPhone, samePhone, isDayString, shiftDay } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

const TEMPLATE_KEY = 'tester_reminder_template';

// Admin: who opened the app on a given day (Africa/Lagos), who didn't, and
// which hand-listed testers still haven't created an account.
// GET /api/admin/activity?day=YYYY-MM-DD   (defaults to today)
export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const todayRes = await db.execute(sql`select (now() at time zone 'Africa/Lagos')::date::text as d`);
  const today = String((todayRes.rows[0] as { d: string }).d);

  const requested = new URL(req.url).searchParams.get('day');
  const day = isDayString(requested) ? requested : today;

  const [allUsers, activeRows, lastRows, historyRows, rosterRows, templateRows] = await Promise.all([
    db
      .select({
        id: users.id, name: users.name, email: users.email, phone: users.phone,
        countryCode: users.countryCode, role: users.role, createdAt: users.createdAt,
      })
      .from(users),
    db
      .select({ userId: userActivity.userId, firstSeenAt: userActivity.firstSeenAt })
      .from(userActivity)
      .where(eq(userActivity.day, day)),
    db
      .select({ userId: userActivity.userId, last: sql<string>`max(${userActivity.day})::text` })
      .from(userActivity)
      .groupBy(userActivity.userId),
    db
      .select({ day: sql<string>`${userActivity.day}::text`, count: sql<number>`count(*)::int` })
      .from(userActivity)
      // Only count activity from accounts that still exist
      .where(
        sql`${userActivity.day} >= ${shiftDay(today, -13)}::date and exists (select 1 from ${users} where ${users.id} = ${userActivity.userId})`
      )
      .groupBy(userActivity.day),
    db.select().from(testers),
    db.select().from(appSettings).where(eq(appSettings.key, TEMPLATE_KEY)).limit(1),
  ]);

  const seenAt = new Map(activeRows.map((r) => [r.userId, r.firstSeenAt]));
  const lastDay = new Map(lastRows.map((r) => [r.userId, r.last]));

  const shape = (u: (typeof allUsers)[number]) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: fullPhone(u.phone, u.countryCode) || null,
    role: u.role,
    createdAt: u.createdAt,
  });

  const active = allUsers
    .filter((u) => seenAt.has(u.id))
    .map((u) => ({ ...shape(u), firstSeenAt: seenAt.get(u.id) ?? null }))
    .sort((a, b) => String(a.firstSeenAt).localeCompare(String(b.firstSeenAt)));

  // Never-seen accounts first (they most need a nudge), then longest-absent.
  const inactive = allUsers
    .filter((u) => !seenAt.has(u.id) && u.role !== 'admin')
    .map((u) => ({ ...shape(u), lastActiveDay: lastDay.get(u.id) ?? null }))
    .sort((a, b) => (a.lastActiveDay ?? '').localeCompare(b.lastActiveDay ?? '') || (a.name ?? '').localeCompare(b.name ?? ''));

  // A listed tester is "signed up" once an account matches their phone or email.
  const roster = rosterRows
    .map((t) => {
      const match = allUsers.find(
        (u) => (t.email && u.email && u.email.toLowerCase() === t.email) || samePhone(t.phone, u.phone)
      );
      return { id: t.id, name: t.name, phone: t.phone, email: t.email, signedUp: !!match };
    })
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const counts = new Map(historyRows.map((r) => [r.day, r.count]));
  const history = Array.from({ length: 14 }, (_, i) => {
    const d = shiftDay(today, i - 13);
    return { day: d, count: counts.get(d) ?? 0 };
  });

  return NextResponse.json({
    today,
    day,
    active,
    inactive,
    notSignedUp: roster.filter((r) => !r.signedUp),
    rosterSignedUp: roster.filter((r) => r.signedUp).length,
    history,
    totalAccounts: allUsers.length,
    template: templateRows[0]?.value ?? null,
  });
}
