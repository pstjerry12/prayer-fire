import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";

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

    return NextResponse.json({ user: toAuthUser(rows[0]) });
  } catch (err) {
    console.error("me error", err);
    return NextResponse.json({ user: null });
  }
}
