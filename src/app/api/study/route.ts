import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userStudy } from "@/db/schema";
import { getUserIdFromRequest } from "@/lib/auth";
import { emptyDoc, mergeDocs, sanitizeDoc } from "@/lib/studyMerge";

// "My Study" sync. The phone always keeps its own copy (so everything works
// offline); when signed in it sends that copy here and gets back the merge of
// its copy and the server's. Merging happens on both sides with the same rules
// (src/lib/studyMerge.ts), so edits made on two phones combine instead of one
// overwriting the other. Private to the signed-in user.

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Sign in to sync your study." }, { status: 401 });

    const rows = await db.select().from(userStudy).where(eq(userStudy.userId, userId)).limit(1);
    return NextResponse.json({ doc: rows[0] ? sanitizeDoc(rows[0].data) : emptyDoc() });
  } catch (err) {
    console.error("study load error", err);
    return NextResponse.json({ error: "Could not load your study." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Sign in to sync your study." }, { status: 401 });

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Your study is too large to sync." }, { status: 413 });
    }
    let body: { doc?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const incoming = sanitizeDoc(body.doc);
    const rows = await db.select().from(userStudy).where(eq(userStudy.userId, userId)).limit(1);
    const merged = rows[0] ? mergeDocs(sanitizeDoc(rows[0].data), incoming) : incoming;

    await db
      .insert(userStudy)
      .values({ userId, data: merged })
      .onConflictDoUpdate({ target: userStudy.userId, set: { data: merged, updatedAt: new Date() } });

    return NextResponse.json({ doc: merged });
  } catch (err) {
    console.error("study save error", err);
    return NextResponse.json({ error: "Could not save your study." }, { status: 500 });
  }
}
