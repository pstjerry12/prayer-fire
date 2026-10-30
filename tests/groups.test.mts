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
await pool.query("insert into users (id, name) values ('L','Lydia Leader'),('L2','Lena Leader'),('P','Peter Partner'),('F','Faith Free'),('X','Xavier Outsider'),('Q','Quinn Quiet'),('R1','Rita One'),('R2','Rita Two'),('R3','Rita Three'),('R4','Rita Four')");
await pool.query(`insert into subscriptions (user_id, entitlement, status, expires_at) values ('L','leader','ACTIVE',${future}),('L2','leader','ACTIVE',${future}),('P','partner','ACTIVE',${future}),('Q','partner','ACTIVE',${future}),('R1','partner','ACTIVE',${future}),('R2','partner','ACTIVE',${future}),('R3','partner','ACTIVE',${future}),('R4','partner','ACTIVE',${future})`);

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


// ═════════════════════════ MODERATION ═════════════════════════
await pool.query("update subscriptions set expires_at = now() + interval '30 days', status = 'ACTIVE'");
const mg = await as("L", (q) => G.createGroup(q, { name: "Moderated", description: "", joinMode: "open" }));
for (const u of ["P", "Q", "R1", "R2", "R3", "R4"]) await as(u, (q) => G.joinGroup(q, mg));
const post1 = await as("P", (q) => G.addPost(q, mg, "request", "Spam spam spam"));
const post2 = await as("Q", (q) => G.addPost(q, mg, "testimony", "A real testimony"));
const c1 = await as("Q", (q) => G.addComment(q, post1, "buy my stuff"));
const detail = (u: string) => as(u, (q) => G.getGroupDetail(q, mg)).then((d) => d!);

// reporting
await as("Q", (q) => G.report(q, post1, null, "spam"));
await as("Q", (q) => G.report(q, post1, null, "spam again")); // duplicate: ignored
eq(await code(as("P", (q) => G.report(q, post1, null, "mine"))), "cannot_target_self", "cannot report your own post");
eq(await code(as("Q", (q) => G.report(q, post1, c1, "mine"))), "cannot_target_self", "cannot report your own comment");
eq(await code(as("X", (q) => G.report(q, post1, null, "x"))), "not_allowed", "outsider cannot report");
eq(await code(as("P", (q) => G.report(q, post1, null, "   "))), "bad_reason", "a reason is required");
await as("P", (q) => G.report(q, post1, c1, "advertising"));
const lq = await detail("L");
eq(lq.reports.length, 2, "queue groups reports per item");
const postItem = lq.reports.find((r) => r.targetType === "post")!;
ok(postItem.count === 1 && postItem.reasons[0] === "spam" && postItem.authorName === "Peter Partner", "duplicate report ignored; reason and author shown");
ok(!JSON.stringify(lq.reports).includes('"Q"') && !("reporterId" in postItem), "reporters are never shown to the leader");
eq((await detail("P")).reports, [], "members never see the queue");
ok((await detail("Q")).posts.find((p) => p.id === post1)!.iReported, "reporter sees they reported");
eq((await as("P", (q) => q("select * from group_reports"))).length, 1, "a member can only read their own report rows");

// members cannot moderate
for (const [what, fn] of [
  ["hide a post", (q: any) => G.setPostHidden(q, post2, true)],
  ["hide a comment", (q: any) => G.setCommentHidden(q, c1, true)],
  ["pin", (q: any) => G.pinPost(q, post2, true)],
  ["resolve a report", (q: any) => G.resolveReport(q, postItem.id, "delete")],
  ["remove a member", (q: any) => G.removeMember(q, mg, "R1", false, false)],
  ["block a member", (q: any) => G.removeMember(q, mg, "R1", true, false)],
  ["appoint a co-leader", (q: any) => G.setRole(q, mg, "R1", "co_leader")],
  ["delete someone else's post", (q: any) => G.deletePost(q, post2)],
  ["delete someone else's comment", (q: any) => G.deleteComment(q, c1)],
] as const) eq(await code(as("P", fn as never)), "not_allowed", `member cannot ${what}`);

// pinning (max 3)
const extra = [] as string[];
for (let i = 0; i < 3; i++) extra.push(await as("R1", (q) => G.addPost(q, mg, "message", `Point ${i}`)));
await as("L", (q) => G.pinPost(q, post2, true));
await as("L", (q) => G.pinPost(q, extra[0], true));
await as("L", (q) => G.pinPost(q, extra[1], true));
eq(await code(as("L", (q) => G.pinPost(q, extra[2], true))), "too_many_pins", "at most 3 pinned posts");
eq((await detail("P")).posts.slice(0, 3).map((p) => p.pinned), [true, true, true], "pinned posts come first for members");
await as("L", (q) => G.pinPost(q, extra[1], false));

// hiding
await as("L", (q) => G.setPostHidden(q, post2, true));
ok(!(await detail("P")).posts.some((p) => p.id === post2), "a hidden post disappears for members");
ok((await detail("Q")).posts.find((p) => p.id === post2)?.status === "hidden", "the author still sees it, marked hidden");
ok((await detail("L")).posts.find((p) => p.id === post2)?.status === "hidden" && !(await detail("L")).posts.find((p) => p.id === post2)!.pinned, "leader sees it; hiding unpins it");
eq(await code(as("P", (q) => G.addComment(q, post2, "hi"))), "not_allowed", "no comments on a hidden post");
eq(await code(as("P", (q) => G.togglePraying(q, post2))), "not_allowed", "no praying on a hidden post");
await as("L", (q) => G.setPostHidden(q, post2, false));
ok((await detail("P")).posts.some((p) => p.id === post2), "unhiding brings it back");
await as("L", (q) => G.setCommentHidden(q, c1, true));
eq((await as("R1", (q) => G.listComments(q, post1))).length, 0, "hidden comment is gone for other members");
eq((await as("Q", (q) => G.listComments(q, post1)))[0].status, "hidden", "the comment's author still sees it");
eq((await as("L", (q) => G.listComments(q, post1)))[0].reports, 1, "leader sees the comment's report count");

// resolving reports
await as("L", (q) => G.resolveReport(q, postItem.id, "hide"));
eq((await detail("L")).reports.map((r) => r.targetType), ["comment"], "resolving closes the item's reports");
ok((await detail("L")).posts.find((p) => p.id === post1)!.status === "hidden", "'hide' hides the reported post");
const commentItem = (await detail("L")).reports[0];
await as("L", (q) => G.resolveReport(q, commentItem.id, "delete"));
eq((await as("L", (q) => G.listComments(q, post1))).length, 0, "'delete' removes the reported comment");
eq((await detail("L")).reports, [], "queue is empty");
await as("R2", (q) => G.report(q, extra[0], null, "rude"));
const rudeItem = (await detail("L")).reports[0];
await as("L", (q) => G.resolveReport(q, rudeItem.id, "dismiss"));
ok((await detail("L")).posts.find((p) => p.id === extra[0])!.status === "visible", "'dismiss' leaves the post alone");

// authors may delete their own
const mine = await as("P", (q) => G.addPost(q, mg, "message", "to delete"));
eq(await code(as("Q", (q) => G.deletePost(q, mine))), "not_allowed", "others cannot delete my post");
await as("P", (q) => G.deletePost(q, mine));
ok(!(await detail("P")).posts.some((p) => p.id === mine), "author deleted their own post");
await as("L", (q) => G.deletePost(q, extra[2]));

// co-leaders
await as("L", (q) => G.setRole(q, mg, "Q", "co_leader"));
eq((await detail("L")).members.find((m) => m.displayName === "Quinn Quiet")!.role, "co_leader", "co-leader appointed");
eq(await code(as("Q", (q) => G.setPostHidden(q, extra[0], true))), "not_allowed", "a co-leader without a Leader plan cannot moderate");
await pool.query("insert into subscriptions (user_id, entitlement, status, expires_at) values ('Q','leader','ACTIVE',now() + interval '30 days')");
await as("Q", (q) => G.setPostHidden(q, extra[0], true));
ok(!(await detail("P")).posts.some((p) => p.id === extra[0]), "a co-leader with a Leader plan can hide posts");
await as("Q", (q) => G.setPostHidden(q, extra[0], false));
eq(await code(as("Q", (q) => G.removeMember(q, mg, "L", false, false))), "not_allowed", "co-leader cannot remove the leader");
eq(await code(as("Q", (q) => G.setRole(q, mg, "R1", "co_leader"))), "not_allowed", "only the leader appoints co-leaders");
eq(await code(as("L", (q) => G.setRole(q, mg, "L", "co_leader"))), "cannot_target_self", "leader cannot re-role self");
eq(await code(as("L", (q) => G.removeMember(q, mg, "L", false, false))), "cannot_target_self", "leader cannot remove self");
eq(await code(as("L", (q) => G.setRole(q, mg, "X", "co_leader"))), "not_allowed", "only active members can be co-leaders");
await as("L", (q) => G.setRole(q, mg, "R1", "co_leader"));
await as("L", (q) => G.setRole(q, mg, "R2", "co_leader"));
eq(await code(as("L", (q) => G.setRole(q, mg, "R3", "co_leader"))), "too_many_coleaders", "at most 3 co-leaders (Quinn, Rita One, Rita Two)");
await as("L", (q) => G.setRole(q, mg, "R1", "member"));
eq(await code(as("Q", (q) => G.removeMember(q, mg, "R2", false, false))), "not_allowed", "a co-leader cannot remove another co-leader");

// removing and blocking
const pPost = await as("P", (q) => G.addPost(q, mg, "message", "P speaks"));
await as("P", (q) => G.addComment(q, pPost, "P comments"));
await as("Q", (q) => G.removeMember(q, mg, "P", true, true)); // co-leader blocks an ordinary member and hides their posts
eq(await as("P", (q) => G.getGroupDetail(q, mg)), null, "blocked member loses access");
eq(await as("P", (q) => G.joinGroup(q, mg)), "blocked", "blocked member cannot rejoin");
ok((await detail("L")).members.some((m) => m.displayName === "Peter Partner" && m.status === "blocked"), "leader sees the blocked list");
eq((await detail("R1")).posts.find((p) => p.id === pPost), undefined, "blocked member's posts were hidden from members");
eq(await code(as("R1", (q) => G.unblockMember(q, mg, "P"))), "not_allowed", "member cannot unblock");
await as("Q", (q) => G.unblockMember(q, mg, "P"));
eq(await as("P", (q) => G.joinGroup(q, mg)), "joined", "unblocked person can join again");
await as("L", (q) => G.removeMember(q, mg, "R4", false, false));
eq(await as("R4", (q) => G.joinGroup(q, mg)), "joined", "a removed (not blocked) person may rejoin");

// leader plan ends: the leader loses moderation, a co-leader with a plan keeps it
await pool.query("update subscriptions set expires_at = now() - interval '1 day' where user_id = 'L'");
eq(await code(as("L", (q) => G.setPostHidden(q, extra[0], true))), "not_allowed", "lapsed leader cannot moderate");
await as("Q", (q) => G.setPostHidden(q, extra[0], true));
ok(true, "co-leader with an active Leader plan still moderates");
await pool.query("update subscriptions set expires_at = now() + interval '30 days' where user_id = 'L'");

// deleting a post removes its reports, comments and praying marks
const cleanup = await as("R2", (q) => G.addPost(q, mg, "request", "will be deleted"));
await as("R3", (q) => G.report(q, cleanup, null, "test"));
await as("R3", (q) => G.togglePraying(q, cleanup));
await as("L", (q) => G.deletePost(q, cleanup));
eq((await pool.query("select count(*)::int n from group_reports where post_id = $1", [cleanup])).rows[0].n, 0, "reports go with their post");
eq((await pool.query("select count(*)::int n from group_praying where post_id = $1", [cleanup])).rows[0].n, 0, "praying marks go with their post");

// the public roles still cannot use the new functions
eq(await asAnon("select app_remove_member('x','y',true,true)"), "permission denied for function app_remove_member", "anon cannot moderate");


// ═════════════════════════ ANALYTICS ═════════════════════════
await pool.query("update subscriptions set expires_at = now() + interval '30 days', status = 'ACTIVE' where entitlement in ('leader','partner')");
await pool.query("delete from subscriptions where user_id = 'Q' and entitlement = 'leader'");
const ag = await as("L", (q) => G.createGroup(q, { name: "Numbers", description: "", joinMode: "open" }));
for (const u of ["P", "Q", "R1", "R2"]) await as(u, (q) => G.joinGroup(q, ag));
const at = async (daysAgo: number) => (await pool.query("select (((now() at time zone 'Africa/Lagos')::date - $1::int) + time '12:00') at time zone 'Africa/Lagos' as t", [daysAgo])).rows[0].t as Date;
await pool.query("update group_members set joined_at = $2 where group_id = $1 and user_id = 'P'", [ag, await at(2)]);
await pool.query("update group_members set joined_at = $2 where group_id = $1 and user_id = 'Q'", [ag, await at(10)]);
await pool.query("update group_members set joined_at = $2 where group_id = $1 and user_id = 'R1'", [ag, await at(40)]);
await pool.query("update group_members set joined_at = $2 where group_id = $1 and user_id = 'R2'", [ag, await at(0)]);
let n = 0;
const post = async (kind: string, daysAgo: number, status = "visible", author = "P") => {
  const id = `an_p${n++}`;
  await pool.query("insert into group_posts (id, group_id, author_id, author_name, kind, body, status, created_at) values ($1,$2,$3,'Peter Partner',$4,'x',$5,$6)", [id, ag, author, kind, status, await at(daysAgo)]);
  return id;
};
const requests = [await post("request", 0), await post("request", 0), await post("request", 6), await post("request", 7), await post("request", 29), await post("request", 30)];
await post("testimony", 1); await post("testimony", 20); await post("message", 0);
const hiddenReq = await post("request", 0, "hidden");
const pray = async (postId: string, user: string, daysAgo: number) => pool.query("insert into group_praying (post_id, group_id, user_id, created_at) values ($1,$2,$3,$4)", [postId, ag, user, await at(daysAgo)]);
await pray(requests[0], "P", 0); await pray(requests[0], "Q", 0); await pray(requests[2], "R1", 3); await pray(requests[4], "R2", 25);
await pray(hiddenReq, "P", 0); // a hidden post's praying is not counted
await pool.query("insert into group_comments (id, post_id, group_id, author_id, author_name, body, created_at) values ('an_c1',$1,$2,'Q','Quinn Quiet','x',$3)", [requests[0], ag, await at(0)]);
await pool.query("insert into group_checkins (group_id, user_id, day) values ($1,'P',(now() at time zone 'Africa/Lagos')::date)", [ag]);

const A = await as("L", (q) => G.getAnalytics(q, ag));
eq(A.members, { total: 5, new7: 2, new30: 3 }, "members: total counts everyone active; new members exclude the leader");
eq(A.requests, { total: 6, last7: 3, last30: 5 }, "prayer requests: total, 7-day and 30-day windows (hidden ones excluded)");
eq(A.testimonies, { total: 2, last7: 1, last30: 2 }, "testimonies");
eq(A.praying, { total: 4, last7: 3, last30: 4 }, "I'm praying taps (taps on hidden posts excluded)");
eq(A.daily.length, 30, "30 daily buckets");
const todayRow = A.daily[29];
eq([todayRow.requests, todayRow.testimonies, todayRow.praying, todayRow.members], [2, 0, 2, 1], "today's bucket");
eq(todayRow.activity, 7, "activity = 3 posts + 1 comment + 2 praying + 1 check-in");
eq(A.daily[0].requests, 1, "day -29 is the first bucket");
eq(A.daily.reduce((s, d) => s + d.requests, 0), 5, "buckets add up to the 30-day total");
eq(A.topDays[0], { day: A.today, activity: 7 }, "busiest day first");
eq(A.weekday.length, 7, "seven weekday totals");
eq(A.weekday.reduce((s, d) => s + d.activity, 0), A.daily.reduce((s, d) => s + d.activity, 0), "weekday totals add up to the daily activity");
ok(!/Peter|Quinn|Rita|Lydia|"P"|"Q"|R1|R2/.test(JSON.stringify(A)), "analytics carry no member names or ids");

eq(await code(as("P", (q) => G.getAnalytics(q, ag))), "not_allowed", "a member cannot see analytics");
await as("L", (q) => G.setRole(q, ag, "Q", "co_leader"));
await pool.query("insert into subscriptions (user_id, entitlement, status, expires_at) values ('Q','leader','ACTIVE',now() + interval '30 days')");
eq(await code(as("Q", (q) => G.getAnalytics(q, ag))), "not_allowed", "a co-leader (even with a Leader plan) cannot see analytics: leader only");
eq(await code(as("X", (q) => G.getAnalytics(q, ag))), "not_allowed", "an outsider cannot see analytics");
eq(await code(as("L2", (q) => G.getAnalytics(q, ag))), "not_allowed", "another group's leader cannot see them");
await pool.query("insert into app_settings (key,value) values ('free_mode_enabled','true')");
eq(await code(as("P", (q) => G.getAnalytics(q, ag))), "not_allowed", "Free Premium Mode does not give members analytics");
ok(await as("L", (q) => G.getAnalytics(q, ag)), "...but the group's leader keeps them in free mode");
await pool.query("delete from app_settings");
await pool.query("update subscriptions set expires_at = now() - interval '1 day' where user_id = 'L' and entitlement = 'leader'");
eq(await code(as("L", (q) => G.getAnalytics(q, ag))), "not_allowed", "a lapsed Leader plan stops analytics");
await pool.query("update subscriptions set expires_at = now() + interval '30 days' where user_id = 'L'");
eq(await asAnon("select app_group_analytics('x')"), "permission denied for function app_group_analytics", "anon cannot call analytics");

// ── sign-in missing ─────────────────────────────────────────────────────────
eq(await code(as("", (q) => G.joinGroup(q, open))), "signin_required", "no user, no access");
eq(groupError(new Error("leader_required")).status, 403, "friendly error mapping");

await pool.end();
console.log(`groups rules: all ${checks} checks passed`);
