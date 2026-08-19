import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        countryCode: users.countryCode,
        role: users.role,
        provider: users.provider,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(200);

    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("admin users error", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (id === admin.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin delete user error", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
