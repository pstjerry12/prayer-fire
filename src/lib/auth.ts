import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "pfm-dev-jwt-secret-8f3a1c9e2b4d7f6a5c3e1b9d0a"
);

export const AUTH_COOKIE = "pfm_token";
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Reads the auth token from the httpOnly cookie (or an Authorization: Bearer
// header fallback, for contexts where the cookie doesn't ride along — e.g.
// the Capacitor WebView) and returns the verified user id, or null.
// Shared by any route that needs to scope data to "the current user".
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(AUTH_COOKIE)?.value ?? null;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || typeof payload.sub !== "string") return null;
  return payload.sub;
}
