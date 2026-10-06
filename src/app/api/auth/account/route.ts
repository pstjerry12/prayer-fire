import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, userActivity, feedback } from "@/db/schema";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(AUTH_COOKIE)?.value ?? null;

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (token) {
      const payload = await verifyToken(token);
      if (payload && typeof payload.sub === "string") {
        // Remove the data we keep about this account's usage, and strip the
        // personal details from any feedback they sent (the message itself stays
        // as anonymous product feedback).
        await db.delete(userActivity).where(eq(userActivity.userId, payload.sub));
        await db
          .update(feedback)
          .set({ userId: null, name: null, contact: null })
          .where(eq(feedback.userId, payload.sub));
        await db.delete(users).where(eq(users.id, payload.sub));
      }
    }

    cookieStore.set(AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete account error", err);
    return NextResponse.json(
      { error: "Unable to delete account." },
      { status: 500 }
    );
  }
}
