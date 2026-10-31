import type { Q } from "./groupsDb.ts";

/** Queries for shared prayer groups. They run through runAsUser(), so the database decides what each caller may see. */

export type JoinOutcome = "joined" | "pending" | "already" | "blocked" | "notfound";
export type JoinMode = "open" | "approval";
export type PostKind = "message" | "alert" | "request" | "testimony";
export type GroupRole = "leader" | "co_leader" | "member";

export interface DirectoryGroup {
  id: string;
  name: string;
  description: string;
  joinMode: JoinMode;
  prayerTime: string | null;
  createdAt: string;
  memberCount: number;
  prayedToday: number;
  myStatus: "active" | "pending" | "removed" | "blocked" | null;
  myRole: GroupRole | null;
}

export interface GroupMember {
  /** Only sent to leaders and co-leaders (needed to approve people); everyone else gets display names only. */
  userId?: string;
  displayName: string;
  role: GroupRole;
  status: "active" | "pending" | "removed" | "blocked";
  mine: boolean;
}

export interface GroupPost {
  id: string;
  authorName: string;
  mine: boolean;
  kind: PostKind;
  body: string;
  pinned: boolean;
  createdAt: string;
  praying: number;
  iAmPraying: boolean;
  comments: number;
  /** "hidden": a leader hid it. Only leaders and the author still see it. */
  status: "visible" | "hidden";
  /** Open reports (leaders only; members always see 0). */
  reports: number;
  iReported: boolean;
}

export interface ReportItem {
  /** Any one report id of this item: resolving it closes all open reports on the same item. */
  id: string;
  targetType: "post" | "comment";
  postId: string;
  commentId: string | null;
  text: string;
  authorName: string;
  hidden: boolean;
  count: number;
  reasons: string[];
}

export interface GroupDetail {
  group: { id: string; name: string; description: string; joinMode: JoinMode; prayerTime: string | null; pinnedVerse: string | null; createdAt: string };
  myRole: GroupRole;
  /** Only leaders and co-leaders get the invite code. */
  inviteCode: string | null;
  canModerate: boolean;
  members: GroupMember[];
  posts: GroupPost[];
  /** Open reports, only for leaders and co-leaders. */
  reports: ReportItem[];
  prayedToday: number;
  iPrayedToday: boolean;
}

export interface GroupComment {
  id: string;
  authorName: string;
  mine: boolean;
  body: string;
  createdAt: string;
  status: "visible" | "hidden";
  reports: number;
  iReported: boolean;
}

type Row = Record<string, unknown>;

export async function listDirectory(q: Q): Promise<DirectoryGroup[]> {
  const rows = await q<Row>("select * from app_group_directory()");
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    joinMode: r.join_mode as JoinMode,
    prayerTime: (r.prayer_time as string | null) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
    memberCount: Number(r.member_count),
    prayedToday: Number(r.prayed_today),
    myStatus: (r.my_status as DirectoryGroup["myStatus"]) ?? null,
    myRole: (r.my_role as GroupRole | null) ?? null,
  }));
}

export async function getGroupDetail(q: Q, groupId: string): Promise<GroupDetail | null> {
  const [group] = await q<Row>("select id, name, description, join_mode, prayer_time, pinned_verse, created_at from groups where id = $1", [groupId]);
  if (!group) return null; // not a member (or no such group): the database shows nothing
  const [me] = await q<Row>("select role from group_members where group_id = $1 and user_id = app_uid() and status = 'active'", [groupId]);
  if (!me) return null;
  const [invite] = await q<Row>("select code from group_invites where group_id = $1", [groupId]); // only moderators can read it
  const canModerate = !!invite;
  const members = await q<Row>(
    "select user_id, user_id = app_uid() as mine, display_name, role, status from group_members where group_id = $1 order by (role = 'leader') desc, (role = 'co_leader') desc, joined_at",
    [groupId]
  );
  const posts = await q<Row>(
    `select p.id, p.author_name, p.author_id = app_uid() as mine, p.kind, p.body, p.pinned, p.created_at,
       (select count(*) from group_praying r where r.post_id = p.id)::int as praying,
       exists (select 1 from group_praying r where r.post_id = p.id and r.user_id = app_uid()) as i_am_praying,
       (select count(*) from group_comments c where c.post_id = p.id and (c.status = 'visible' or app_is_mod(p.group_id)))::int as comments,
       p.status,
       (select count(*) from group_reports r where r.post_id = p.id and r.comment_id is null and r.status = 'open' and app_is_mod(p.group_id))::int as reports,
       exists (select 1 from group_reports r where r.post_id = p.id and r.comment_id is null and r.reporter_id = app_uid()) as i_reported
     from group_posts p where p.group_id = $1
     order by p.pinned desc, p.created_at desc limit 100`,
    [groupId]
  );
  const reports = canModerate ? await listReports(q, groupId) : [];
  const [checkins] = await q<Row>(
    "select count(*)::int as n, coalesce(bool_or(user_id = app_uid()), false) as mine from group_checkins where group_id = $1 and day = (now() at time zone 'Africa/Lagos')::date",
    [groupId]
  );
  return {
    group: {
      id: String(group.id),
      name: String(group.name),
      description: String(group.description ?? ""),
      joinMode: group.join_mode as JoinMode,
      prayerTime: (group.prayer_time as string | null) ?? null,
      pinnedVerse: (group.pinned_verse as string | null) ?? null,
      createdAt: new Date(group.created_at as string).toISOString(),
    },
    myRole: me.role as GroupRole,
    inviteCode: invite ? String(invite.code) : null,
    canModerate,
    members: members.map((m) => ({
      ...(canModerate ? { userId: String(m.user_id) } : {}),
      displayName: String(m.display_name),
      role: m.role as GroupRole,
      status: m.status as GroupMember["status"],
      mine: m.mine === true,
    })),
    posts: posts.map((p) => ({
      id: String(p.id),
      authorName: String(p.author_name),
      mine: p.mine === true,
      kind: p.kind as PostKind,
      body: String(p.body),
      pinned: p.pinned === true,
      createdAt: new Date(p.created_at as string).toISOString(),
      praying: Number(p.praying),
      iAmPraying: p.i_am_praying === true,
      comments: Number(p.comments),
      status: p.status === "hidden" ? "hidden" : "visible",
      reports: Number(p.reports),
      iReported: p.i_reported === true,
    })),
    reports,
    prayedToday: Number(checkins?.n ?? 0),
    iPrayedToday: checkins?.mine === true,
  };
}

export async function listComments(q: Q, postId: string): Promise<GroupComment[]> {
  const rows = await q<Row>(
    `select c.id, c.author_name, c.author_id = app_uid() as mine, c.body, c.created_at, c.status,
       (select count(*) from group_reports r where r.comment_id = c.id and r.status = 'open' and app_is_mod(c.group_id))::int as reports,
       exists (select 1 from group_reports r where r.comment_id = c.id and r.reporter_id = app_uid()) as i_reported
     from group_comments c where c.post_id = $1 order by c.created_at`,
    [postId]
  );
  return rows.map((c) => ({
    id: String(c.id), authorName: String(c.author_name), mine: c.mine === true, body: String(c.body), createdAt: new Date(c.created_at as string).toISOString(),
    status: c.status === "hidden" ? ("hidden" as const) : ("visible" as const), reports: Number(c.reports), iReported: c.i_reported === true,
  }));
}

/** The moderation queue: open reports grouped by the post or comment they are about (reporters are never shown). */
export async function listReports(q: Q, groupId: string): Promise<ReportItem[]> {
  const rows = await q<Row>(
    `select r.id, r.post_id, r.comment_id, r.reason, r.created_at,
       p.body as post_body, p.author_name as post_author, p.status as post_status,
       c.body as comment_body, c.author_name as comment_author, c.status as comment_status
     from group_reports r
     join group_posts p on p.id = r.post_id
     left join group_comments c on c.id = r.comment_id
     where r.group_id = $1 and r.status = 'open'
     order by r.created_at`,
    [groupId]
  );
  const items = new Map<string, ReportItem>();
  for (const r of rows) {
    const key = `${r.post_id}|${r.comment_id ?? ""}`;
    const isComment = r.comment_id !== null && r.comment_id !== undefined;
    const existing = items.get(key);
    if (existing) {
      existing.count++;
      existing.reasons.push(String(r.reason));
      continue;
    }
    items.set(key, {
      id: String(r.id),
      targetType: isComment ? "comment" : "post",
      postId: String(r.post_id),
      commentId: isComment ? String(r.comment_id) : null,
      text: String(isComment ? r.comment_body : r.post_body),
      authorName: String(isComment ? r.comment_author : r.post_author),
      hidden: (isComment ? r.comment_status : r.post_status) === "hidden",
      count: 1,
      reasons: [String(r.reason)],
    });
  }
  return [...items.values()].sort((a, b) => b.count - a.count);
}

// ── Actions: each is one database function that checks the caller itself ─────

const one = async <T>(q: Q, sql: string, params: unknown[]): Promise<T> => ((await q<Row>(sql, params))[0].r as T);

export const createGroup = (q: Q, a: { name: string; description: string; joinMode: JoinMode; prayerTime?: string | null; pinnedVerse?: string | null }) =>
  one<string>(q, "select app_create_group($1, $2, $3, $4, $5) as r", [a.name, a.description, a.joinMode, a.prayerTime ?? "", a.pinnedVerse ?? ""]);
export const joinGroup = (q: Q, groupId: string) => one<JoinOutcome>(q, "select app_join_group($1) as r", [groupId]);
export const joinGroupByCode = (q: Q, code: string) => one<JoinOutcome>(q, "select app_join_group_by_code($1) as r", [code]);
export const leaveGroup = (q: Q, groupId: string) => q("select app_leave_group($1)", [groupId]);
export const decideMember = (q: Q, groupId: string, userId: string, approve: boolean) => q("select app_decide_member($1, $2, $3)", [groupId, userId, approve]);
export const updateGroup = (q: Q, groupId: string, a: { joinMode: JoinMode; prayerTime: string; pinnedVerse: string }) =>
  q("select app_update_group($1, $2, $3, $4)", [groupId, a.joinMode, a.prayerTime, a.pinnedVerse]);
export const deleteGroup = (q: Q, groupId: string) => q("select app_delete_group($1)", [groupId]);
export const addPost = (q: Q, groupId: string, kind: PostKind, body: string) => one<string>(q, "select app_add_post($1, $2, $3) as r", [groupId, kind, body]);
export const addComment = (q: Q, postId: string, body: string) => one<string>(q, "select app_add_comment($1, $2) as r", [postId, body]);
export const togglePraying = (q: Q, postId: string) => one<boolean>(q, "select app_toggle_praying($1) as r", [postId]);
export const toggleCheckin = (q: Q, groupId: string) => one<boolean>(q, "select app_toggle_checkin($1) as r", [groupId]);

// ── Moderation ───────────────────────────────────────────────────────────────

export const removeMember = (q: Q, groupId: string, userId: string, block: boolean, hidePosts: boolean) =>
  q("select app_remove_member($1, $2, $3, $4)", [groupId, userId, block, hidePosts]);
export const unblockMember = (q: Q, groupId: string, userId: string) => q("select app_unblock_member($1, $2)", [groupId, userId]);
export const setRole = (q: Q, groupId: string, userId: string, role: "co_leader" | "member") => q("select app_set_role($1, $2, $3)", [groupId, userId, role]);
export const setPostHidden = (q: Q, postId: string, hidden: boolean) => q("select app_set_post_hidden($1, $2)", [postId, hidden]);
export const setCommentHidden = (q: Q, commentId: string, hidden: boolean) => q("select app_set_comment_hidden($1, $2)", [commentId, hidden]);
export const deletePost = (q: Q, postId: string) => q("select app_delete_post($1)", [postId]);
export const deleteComment = (q: Q, commentId: string) => q("select app_delete_comment($1)", [commentId]);
export const pinPost = (q: Q, postId: string, pinned: boolean) => q("select app_pin_post($1, $2)", [postId, pinned]);
export const report = (q: Q, postId: string, commentId: string | null, reason: string) => q("select app_report($1, $2, $3)", [postId, commentId, reason]);
export const resolveReport = (q: Q, reportId: string, action: "dismiss" | "hide" | "delete") => q("select app_resolve_report($1, $2)", [reportId, action]);

// ── Analytics (the group's own leader only; numbers, never member details) ───

export interface AnalyticsDay {
  /** YYYY-MM-DD (Africa/Lagos day) */
  day: string;
  members: number;
  requests: number;
  testimonies: number;
  praying: number;
  /** posts + comments + "I'm praying" taps + check-ins */
  activity: number;
}

export interface CountWindows {
  total: number;
  last7: number;
  last30: number;
}

export interface GroupAnalytics {
  today: string;
  members: { total: number; new7: number; new30: number };
  requests: CountWindows;
  testimonies: CountWindows;
  praying: CountWindows;
  /** The last 30 days, oldest first. The app charts the last 7 or all 30. */
  daily: AnalyticsDay[];
  /** Activity by weekday over the last 30 days: dow 1 = Monday ... 7 = Sunday. */
  weekday: { dow: number; activity: number }[];
  topDays: { day: string; activity: number }[];
}

export async function getAnalytics(q: Q, groupId: string): Promise<GroupAnalytics> {
  const [row] = await q<Row>("select app_group_analytics($1) as r", [groupId]);
  return row.r as GroupAnalytics;
}
