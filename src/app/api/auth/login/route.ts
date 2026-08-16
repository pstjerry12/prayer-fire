import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, signToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      identifier?: string;
      password?: string;
    };

    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please enter your email/phone and password." },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes("@");
    const normalized = isEmail ? identifier.toLowerCase() : identifier.replace(/\D/g, "");

    const rows = await db
      .select()
      .from(users)
      .where(isEmail ? eq(users.email, normalized) : eq(users.phone, normalized))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No account found with that email or phone number." },
        { status: 401 }
      );
    }

    const account = rows[0];
    const valid = await verifyPassword(password, account.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
    }

    const token = await signToken({ sub: account.id });
    const user = toAuthUser(account);

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 }
    );
  }
}
