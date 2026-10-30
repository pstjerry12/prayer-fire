import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { users, userActivity, feedback, subscriptions } from "@/db/schema";
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
        // Only our copy goes. A Google Play subscription keeps billing until it is cancelled in Play.
        await db.delete(subscriptions).where(eq(subscriptions.userId, payload.sub));
        // Prayer groups: groups this person created go with them (members lose the group); everywhere else
        // their posts, comments, "I'm praying" marks, check-ins and memberships are removed.
        const id = payload.sub;
        await db.execute(sql`delete from groups where created_by = ${id}`);
        await db.execute(sql`delete from group_posts where author_id = ${id}`);
        await db.execute(sql`delete from group_comments where author_id = ${id}`);
        await db.execute(sql`delete from group_praying where user_id = ${id}`);
        await db.execute(sql`delete from group_checkins where user_id = ${id}`);
        await db.execute(sql`delete from group_members where user_id = ${id}`);
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
