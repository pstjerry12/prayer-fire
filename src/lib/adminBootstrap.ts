import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * If the signed-in user's email matches ADMIN_EMAIL, promote them to admin.
 * This is how the site owner (you) gets access to the back office.
 */
export async function promoteAdminIfMatches(userId: string, email: string | null): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail || !email) return;
  if (email.toLowerCase() !== adminEmail) return;

  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}
