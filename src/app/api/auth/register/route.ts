import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";
import { promoteAdminIfMatches } from "@/lib/adminBootstrap";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      phone?: string;
      countryCode?: string;
      password?: string;
    };

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;
    // Treat empty phone as "not provided" (null), not an empty string.
    // (An empty string would collide with the unique index and block the
    // second email-only signup.)
    const normalizedPhone =
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone.replace(/\D/g, "")
        : null;

    if (!normalizedEmail && !normalizedPhone) {
      return NextResponse.json(
        { error: "Please provide an email address or phone number." },
        { status: 400 }
      );
    }

    if (normalizedEmail) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in." },
          { status: 409 }
        );
      }
    }

    if (normalizedPhone) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.phone, normalizedPhone))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Try signing in." },
          { status: 409 }
        );
      }
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    const [created] = await db
      .insert(users)
      .values({
        id,
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : null,
        email: normalizedEmail,
        phone: normalizedPhone,
        countryCode: typeof body.countryCode === "string" ? body.countryCode : null,
        passwordHash,
        provider: "email",
      })
      .returning();

    const role = await promoteAdminIfMatches(id, normalizedEmail);

    const token = await signToken({ sub: id });
    const user = { ...toAuthUser(created), role };

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}
