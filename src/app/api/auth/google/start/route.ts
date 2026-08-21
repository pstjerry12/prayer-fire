import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

function getOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/**
 * Step 1 of real Google sign-in: redirect the browser to Google's consent screen.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?auth=google-not-configured", getOrigin(request))
    );
  }

  const redirectUri = `${getOrigin(request)}/api/auth/google/callback`;
  const state = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("pfm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
