import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json({ admin: false }, { status: 401 });
    }
    return NextResponse.json({
      admin: true,
      name: admin.name,
      email: admin.email,
    });
  } catch (err) {
    console.error("admin me error", err);
    return NextResponse.json({ admin: false }, { status: 500 });
  }
}
