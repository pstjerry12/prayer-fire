import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";

const DEMO_EMAIL = "demo.google@prayerfire.example";

/**
 * Demo Google sign-in. In production this would exchange a Google ID token
 * via OAuth2. Here we simply create (or reuse) a demo account.
 */
export async function POST() {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1);

    let account = existing[0];

    if (!account) {
      const id = randomUUID();
      const passwordHash = await hashPassword(
        `google-demo-${Math.random().toString(36).slice(2)}`
      );
      const [created] = await db
        .insert(users)
        .values({
          id,
          name: "Google Demo User",
          email: DEMO_EMAIL,
          phone: null,
          countryCode: null,
          passwordHash,
          provider: "google",
        })
        .returning();
      account = created;
    }

    const token = await signToken({ sub: account.id });
    const user = toAuthUser(account);

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("google auth error", err);
    return NextResponse.json(
      { error: "Unable to sign in with Google. Please try again." },
      { status: 500 }
    );
  }
}
