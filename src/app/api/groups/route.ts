import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { runAsUser, groupError, type Q } from "@/lib/groupsDb";
import * as G from "@/lib/groups";

// Shared prayer groups. This route only forwards the request: WHO may do WHAT is decided inside the database
// (Row Level Security + permission checks in the group functions, see supabase/groups.sql), because every call
// below runs as the restricted `app_user` role for the signed-in person.

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const mode = (v: unknown): G.JoinMode => (v === "approval" ? "approval" : "open");

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Sign in to use prayer groups." }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const post = url.searchParams.get("post");
    const analytics = url.searchParams.get("analytics");

    if (id && analytics) return NextResponse.json({ analytics: await runAsUser(pool, userId, (q) => G.getAnalytics(q, id)) });
    if (post) return NextResponse.json({ comments: await runAsUser(pool, userId, (q) => G.listComments(q, post)) });
    if (id) {
      const detail = await runAsUser(pool, userId, (q) => G.getGroupDetail(q, id));
      if (!detail) return NextResponse.json({ error: "Group not found, or you are not a member." }, { status: 404 });
      return NextResponse.json({ detail });
    }
    return NextResponse.json({ groups: await runAsUser(pool, userId, G.listDirectory) });
  } catch (err) {
    const e = groupError(err);
    if (e.status === 500) console.error("groups GET error", err);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Sign in to use prayer groups." }, { status: 401 });
    let b: Record<string, unknown>;
    try {
      b = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await runAsUser(pool, userId, async (q: Q) => {
      const groupId = str(b.groupId, 80);
      switch (b.action) {
        case "create":
          return { id: await G.createGroup(q, { name: str(b.name, 200), description: str(b.description, 600), joinMode: mode(b.joinMode), prayerTime: str(b.prayerTime, 5), pinnedVerse: str(b.pinnedVerse, 300) }) };
        case "join":
          return { outcome: await G.joinGroup(q, groupId) };
        case "joinByCode":
          return { outcome: await G.joinGroupByCode(q, str(b.code, 20)) };
        case "leave":
          await G.leaveGroup(q, groupId);
          return { ok: true };
        case "decide":
          await G.decideMember(q, groupId, str(b.userId, 80), b.approve === true);
          return { ok: true };
        case "update":
          await G.updateGroup(q, groupId, { joinMode: mode(b.joinMode), prayerTime: str(b.prayerTime, 5), pinnedVerse: str(b.pinnedVerse, 300) });
          return { ok: true };
        case "delete":
          await G.deleteGroup(q, groupId);
          return { ok: true };
        case "post":
          return { id: await G.addPost(q, groupId, str(b.kind, 20) as G.PostKind, str(b.body, 2100)) };
        case "comment":
          return { id: await G.addComment(q, str(b.postId, 80), str(b.body, 1100)) };
        case "praying":
          return { on: await G.togglePraying(q, str(b.postId, 80)) };
        case "checkin":
          return { on: await G.toggleCheckin(q, groupId) };
        case "removeMember":
          await G.removeMember(q, groupId, str(b.userId, 80), b.block === true, b.hidePosts === true);
          return { ok: true };
        case "unblock":
          await G.unblockMember(q, groupId, str(b.userId, 80));
          return { ok: true };
        case "setRole":
          await G.setRole(q, groupId, str(b.userId, 80), b.role === "co_leader" ? "co_leader" : "member");
          return { ok: true };
        case "hidePost":
          await G.setPostHidden(q, str(b.postId, 80), b.hidden === true);
          return { ok: true };
        case "hideComment":
          await G.setCommentHidden(q, str(b.commentId, 80), b.hidden === true);
          return { ok: true };
        case "deletePost":
          await G.deletePost(q, str(b.postId, 80));
          return { ok: true };
        case "deleteComment":
          await G.deleteComment(q, str(b.commentId, 80));
          return { ok: true };
        case "pin":
          await G.pinPost(q, str(b.postId, 80), b.pinned === true);
          return { ok: true };
        case "report":
          await G.report(q, str(b.postId, 80), str(b.commentId, 80) || null, str(b.reason, 300));
          return { ok: true };
        case "resolveReport": {
          const action = b.resolution === "hide" || b.resolution === "delete" ? b.resolution : "dismiss";
          await G.resolveReport(q, str(b.reportId, 80), action);
          return { ok: true };
        }
        default:
          throw new Error("unknown_action");
      }
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "unknown_action") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const e = groupError(err);
    if (e.status === 500) console.error("groups POST error", err);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
}
