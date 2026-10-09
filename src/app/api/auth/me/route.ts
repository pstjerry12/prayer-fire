import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userActivity } from "@/db/schema";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";
import { promoteAdminIfMatches } from "@/lib/adminBootstrap";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(AUTH_COOKIE)?.value ?? null;

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload || typeof payload.sub !== "string") {
      return NextResponse.json({ user: null });
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ user: null });
    }

    // Record that this account opened the app today (Africa/Lagos day). One row
    // per account per day, so repeat opens are a no-op. Never let this break /me.
    try {
      await db
        .insert(userActivity)
        .values({ userId: rows[0].id, day: sql`(now() at time zone 'Africa/Lagos')::date` })
        .onConflictDoNothing();
    } catch (err) {
      console.error("activity log error (ignored)", err);
    }

    // Self-heal: promote the owner on every /me check (catches accounts created earlier).
    // Never downgrade an existing admin if ADMIN_EMAIL is temporarily missing.
    const role =
      rows[0].role === "admin"
        ? "admin"
        : await promoteAdminIfMatches(rows[0].id, rows[0].email);

    return NextResponse.json({ user: { ...toAuthUser(rows[0]), role } });
  } catch (err) {
    console.error("me error", err);
    // 503 (not a "signed out" answer) so a database hiccup never signs anyone out.
    return NextResponse.json({ user: null, error: "unavailable" }, { status: 503 });
  }
}
