import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * If the signed-in user's email matches ADMIN_EMAIL, promote them to admin.
 * This is how the site owner (you) gets access to the back office.
 * Returns the user's final role ('admin' or 'user') so callers can send the
 * correct, up-to-date role back to the browser.
 *
 * NOTE: This is intentionally defensive. If anything here fails (e.g. the
 * `role` column doesn't exist yet in the database), it must NEVER break
 * registration. It just silently returns "user" so signup keeps working.
 */
export async function promoteAdminIfMatches(
  userId: string,
  email: string | null
): Promise<"admin" | "user"> {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (!adminEmail || !email) return "user";
    if (email.toLowerCase() !== adminEmail) return "user";

    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
    return "admin";
  } catch (err) {
    // Never break the main flow (registration/login) because of admin promotion.
    console.error("admin promotion error (ignored):", err);
    return "user";
  }
}
