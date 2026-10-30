// Prayer-group rules, tested against a REAL Postgres so Row Level Security is what is being tested.
//   GROUPS_TEST_DATABASE_URL=postgres://postgres@localhost/pftest node --experimental-strip-types tests/groups.test.mts
// Skipped (exit 0) when the variable is not set, so `npm test` works anywhere. The database must already
// contain supabase/groups.sql plus stand-in `users`, `app_settings` and `subscriptions` tables (see docs).
import assert from "node:assert/strict";
import pg from "pg";
import { runAsUser, groupError } from "../src/lib/groupsDb.ts";
import * as G from "../src/lib/groups.ts";

const url = process.env.GROUPS_TEST_DATABASE_URL;
if (!url) {
  console.log("groups tests skipped: set GROUPS_TEST_DATABASE_URL to run them");
  process.exit(0);
}
const pool = new pg.Pool({ connectionString: url });
const as = <T,>(id: string, fn: (q: Parameters<Parameters<typeof runAsUser>[2]>[0]) => Promise<T>) => runAsUser(pool, id, fn as never) as Promise<T>;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "no error";
  } catch (e) {
    return (e as Error).message;
  }
};
let checks = 0;
const ok = (cond: unknown, msg: string) => {
  assert.ok(cond, msg);
  checks++;
};
const eq = <T,>(a: T, b: T, msg: string) => {
  assert.deepEqual(a, b, msg);
  checks++;
};

const future = "now() + interval '30 days'";
await pool.query("truncate groups cascade; truncate users, subscriptions, app_settings");
await pool.query("insert into users (id, name) values ('L','Lydia Leader'),('L2','Lena Leader'),('P','Peter Partner'),('F','Faith Free'),('X','Xavier Outsider')");
await pool.query(`insert into subscriptions (user_id, entitlement, status, expires_at) values ('L','leader','ACTIVE',${future}),('L2','leader','ACTIVE',${future}),('P','partner','ACTIVE',${future})`);

// ── free account ────────────────────────────────────────────────────────────
eq(await as("F", G.listDirectory), [], "free account sees no groups");
eq(await code(as("F", (q) => G.createGroup(q, { name: "Nope", description: "", joinMode: "open" }))), "leader_required", "free cannot create");
eq(await code(as("P", (q) => G.createGroup(q, { name: "Nope", description: "", joinMode: "open" }))), "leader_required", "partner cannot create");

// ── leader creates ──────────────────────────────────────────────────────────
const open = await as("L", (q) => G.createGroup(q, { name: "Dawn Watch", description: "Pray at dawn", joinMode: "open", prayerTime: "05:00" }));
const approval = await as("L", (q) => G.createGroup(q, { name: "Elders Circle", description: "", joinMode: "approval" }));
const lDetail = await as("L", (q) => G.getGroupDetail(q, open));
ok(lDetail && lDetail.myRole === "leader" && lDetail.canModerate && /^[A-Z0-9]{6}$/.test(lDetail.inviteCode ?? ""), "leader sees invite code and moderator flag");
eq(await code(as("F", (q) => G.joinGroup(q, open))), "premium_required", "free cannot join");
eq((await as("F", (q) => G.getGroupDetail(q, open))), null, "free cannot read a group");
eq((await as("F", (q) => q("select id from groups"))).length, 0, "free sees no group rows directly");
eq(await code(as("F", (q) => q("insert into groups (id, name, created_by) values ('hack','h','F')"))), "permission denied for table groups", "app_user cannot write tables directly");

// ── partner joins ───────────────────────────────────────────────────────────
eq(await as("P", (q) => G.joinGroup(q, open)), "joined", "partner joins open group");
eq(await as("P", (q) => G.joinGroup(q, open)), "already", "joining twice");
const pDetail = await as("P", (q) => G.getGroupDetail(q, open));
ok(pDetail && pDetail.inviteCode === null && !pDetail.canModerate, "partner does not get the invite code");
ok(pDetail!.members.every((m) => m.userId === undefined) && pDetail!.members.map((m) => m.displayName).sort().join() === "Lydia Leader,Peter Partner", "partner sees display names only, no ids");
eq(await code(as("P", (q) => G.updateGroup(q, open, { joinMode: "approval", prayerTime: "06:00", pinnedVerse: "x" }))), "not_allowed", "partner cannot change settings");
eq(await code(as("P", (q) => G.deleteGroup(q, open))), "not_allowed", "partner cannot delete");
eq(await code(as("P", (q) => G.decideMember(q, open, "F", true))), "not_allowed", "partner cannot approve");
eq((await as("P", (q) => q("select * from group_invites"))).length, 0, "partner cannot read invite codes");

// ── approval-only group ─────────────────────────────────────────────────────
eq(await as("P", (q) => G.joinGroup(q, approval)), "pending", "approval group queues the request");
eq(await as("P", (q) => G.getGroupDetail(q, approval)), null, "pending member cannot read the group");
const pending = (await as("L", (q) => G.getGroupDetail(q, approval)))!.members.find((m) => m.status === "pending");
ok(pending?.userId === "P" && pending.displayName === "Peter Partner", "leader sees the pending request");
eq(await code(as("P", (q) => G.decideMember(q, approval, "P", true))), "not_allowed", "cannot approve yourself");
await as("L", (q) => G.decideMember(q, approval, "P", true));
ok(await as("P", (q) => G.getGroupDetail(q, approval)), "approved member can read");
eq(await as("X", (q) => q("select id from groups")), [], "outsider sees nothing");

// ── posts, comments, praying ────────────────────────────────────────────────
const req = await as("P", (q) => G.addPost(q, open, "request", "Pray for my exam"));
await as("P", (q) => G.addPost(q, open, "testimony", "God healed my mother"));
await as("L", (q) => G.addComment(q, req, "Standing with you"));
eq(await as("L", (q) => G.togglePraying(q, req)), true, "praying on");
eq(await as("P", (q) => G.togglePraying(q, req)), true, "praying on (second person)");
eq(await as("P", (q) => G.togglePraying(q, req)), false, "praying off");
const feed = (await as("L", (q) => G.getGroupDetail(q, open)))!.posts;
const reqPost = feed.find((p) => p.id === req)!;
ok(reqPost.praying === 1 && reqPost.iAmPraying && reqPost.comments === 1 && feed.length === 2, "counts are right");
eq((await as("L", (q) => G.listComments(q, req))).map((c) => c.body), ["Standing with you"], "comments listed");
eq(await code(as("X", (q) => G.addPost(q, open, "message", "hi"))), "not_allowed", "outsider cannot post");
eq(await code(as("P", (q) => G.addPost(q, approval + "x", "message", "hi"))), "not_allowed", "no post in an unknown group");
eq(await code(as("P", (q) => G.addPost(q, open, "bogus" as never, "hi"))), "bad_kind", "bad post kind");
eq(await code(as("P", (q) => G.addPost(q, open, "message", "   "))), "bad_body", "empty post");
eq(await code(as("X", (q) => G.togglePraying(q, req))), "not_allowed", "outsider cannot pray-click");
eq(await as("P", (q) => G.toggleCheckin(q, open)), true, "check-in on");
eq((await as("L", (q) => G.getGroupDetail(q, open)))!.prayedToday, 1, "check-in counted");

// ── other group's data stays separate ───────────────────────────────────────
const other = await as("L2", (q) => G.createGroup(q, { name: "Other", description: "", joinMode: "open" }));
eq((await as("P", (q) => q("select id from group_posts where group_id = $1", [other]))).length, 0, "no posts of a group you are not in");
eq(await as("P", (q) => G.getGroupDetail(q, other)), null, "other group is closed to non-members");
eq(await code(as("L", (q) => G.updateGroup(q, other, { joinMode: "open", prayerTime: "", pinnedVerse: "" }))), "not_allowed", "a leader cannot change someone else's group");

// ── blocked and leaving ─────────────────────────────────────────────────────
await pool.query("update group_members set status = 'blocked' where group_id = $1 and user_id = 'P'", [other]);
await as("P", (q) => G.joinGroup(q, other)).catch(() => {});
await as("P", (q) => G.leaveGroup(q, open));
eq(await as("P", (q) => G.getGroupDetail(q, open)), null, "left group no longer readable");
eq(await code(as("L", (q) => G.leaveGroup(q, open))), "leader_cannot_leave", "leader cannot leave");
await pool.query("insert into group_members (group_id,user_id,status,display_name) values ($1,'P','blocked','Peter Partner') on conflict (group_id,user_id) do update set status='blocked'", [other]);
eq(await as("P", (q) => G.joinGroup(q, other)), "blocked", "blocked cannot rejoin");

// ── Leader plan ends: management stops, membership stays ────────────────────
await pool.query("update subscriptions set expires_at = now() - interval '1 day' where user_id = 'L'");
eq(await code(as("L", (q) => G.createGroup(q, { name: "Late", description: "", joinMode: "open" }))), "leader_required", "expired leader cannot create");
eq(await code(as("L", (q) => G.decideMember(q, approval, "P", true))), "not_allowed", "expired leader cannot moderate");
eq(await as("L", (q) => G.listDirectory(q)), [], "expired leader (no partner plan) is not premium");
await pool.query(`update subscriptions set expires_at = ${future} where user_id = 'L'`);
await pool.query("update subscriptions set status = 'REFUNDED' where user_id = 'L'");
eq(await code(as("L", (q) => G.createGroup(q, { name: "Refunded", description: "", joinMode: "open" }))), "leader_required", "refunded leader loses access at once");
await pool.query("update subscriptions set status = 'ACTIVE' where user_id = 'L'");

// ── Free Premium Mode ───────────────────────────────────────────────────────
await pool.query("insert into app_settings (key,value) values ('free_mode_enabled','true')");
eq(await as("F", (q) => G.joinGroup(q, other)), "joined", "free account can join while free mode is on");
const fg = await as("F", (q) => G.createGroup(q, { name: "Free mode group", description: "", joinMode: "open" }));
ok(fg, "free mode lets anyone create");
await pool.query("insert into app_settings (key,value) values ('free_mode_end', to_char(now() - interval '1 hour','YYYY-MM-DD\"T\"HH24:MI:SSOF'))");
eq(await code(as("F", (q) => G.createGroup(q, { name: "After", description: "", joinMode: "open" }))), "leader_required", "free mode ended by its end date");
eq(await as("F", G.listDirectory), [], "free account sees nothing after free mode ends");
await pool.query("delete from app_settings");

// ── the public Supabase roles cannot use any of it ──────────────────────────
const asAnon = async (sql: string) => {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role anon");
    const r = await c.query(sql);
    return `rows:${r.rows.length}`;
  } catch (e) {
    return (e as Error).message;
  } finally {
    await c.query("rollback").catch(() => {});
    c.release();
  }
};
eq(await asAnon("select app_create_group('x','','open','','')"), "permission denied for function app_create_group", "anon cannot call group functions");
// On Supabase anon holds default table grants, so RLS (no policy for anon) answers "0 rows"; a bare database says "denied". Both are locked.
ok(["rows:0", "permission denied for table groups"].includes(await asAnon("select * from groups")), "anon cannot read group tables");
ok(["rows:0", "permission denied for table group_posts"].includes(await asAnon("select * from group_posts")), "anon cannot read posts");

// ── sign-in missing ─────────────────────────────────────────────────────────
eq(await code(as("", (q) => G.joinGroup(q, open))), "signin_required", "no user, no access");
eq(groupError(new Error("leader_required")).status, 403, "friendly error mapping");

await pool.end();
console.log(`groups rules: all ${checks} checks passed`);
