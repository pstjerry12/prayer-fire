import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "@/lib/auth";
import { toAuthUser } from "@/lib/user";
import { promoteAdminIfMatches } from "@/lib/adminBootstrap";

function getOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

interface GoogleProfile {
  email?: string;
  name?: string;
}

/**
 * Step 2 of real Google sign-in: exchange the code, fetch the Google profile,
 * create (or reuse) the user, and set the session cookie.
 */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("pfm_oauth_state")?.value ?? null;

  const fail = () => NextResponse.redirect(new URL("/?auth=google-failed", origin));

  if (!code || !state || !savedState || state !== savedState) {
    return fail();
  }
  cookieStore.set("pfm_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail();

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange the authorization code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail();

    // 2. Fetch the user's Google profile.
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as GoogleProfile;
    const email = profile.email?.toLowerCase();
    if (!email) return fail();

    // 3. Find or create the user.
    let account = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

    if (!account) {
      const passwordHash = await hashPassword(`google-${randomUUID()}`);
      const [created] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          name: profile.name || null,
          email,
          phone: null,
          countryCode: null,
          passwordHash,
          provider: "google",
        })
        .returning();
      account = created;
    }

    // 4. Promote if this is the site owner.
    const role = await promoteAdminIfMatches(account.id, email);

    // 5. Sign in.
    const token = await signToken({ sub: account.id });
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.redirect(new URL("/?auth=google-success", origin));
  } catch (err) {
    console.error("google callback error", err);
    return fail();
  }
}
