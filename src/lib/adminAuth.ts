import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { promoteAdminIfMatches } from "@/lib/adminBootstrap";
import type { User } from "@/db/schema";

/** Returns the signed-in user, or null if not authenticated. */
export async function getSessionUser(request: Request): Promise<User | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(AUTH_COOKIE)?.value ?? null;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || typeof payload.sub !== "string") return null;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns the user only if they are an admin, otherwise null.
 *
 * Self-heals: if the signed-in user's email matches ADMIN_EMAIL (the site
 * owner), they are promoted on the spot — so the owner can never be locked
 * out of the back office even if their `role` column was stored as "user".
 */
export async function getAdminUser(request: Request): Promise<User | null> {
  const user = await getSessionUser(request);
  if (!user) return null;
  if (user.role === "admin") return user;

  // Belt-and-braces: even if the DB write fails, the owner email still wins.
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const emailMatches =
    !!adminEmail && !!user.email && user.email.toLowerCase() === adminEmail;

  const role = await promoteAdminIfMatches(user.id, user.email);
  if (role === "admin" || emailMatches) return { ...user, role: "admin" };

  return null;
}
