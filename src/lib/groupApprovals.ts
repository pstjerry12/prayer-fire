import type { Pool } from "pg";

/**
 * New prayer groups, the admin's side. A Leader APPLIES to open a group (it starts as 'pending' and nobody else can see
 * or join it); the app admin approves or declines it here. Runs on the app's own (owner) database connection from the
 * admin route after it has checked the caller is an admin. The restricted `app_user` role cannot change `status`.
 */
type Db = Pick<Pool, "query">;

export interface GroupApplication {
  groupId: string;
  name: string;
  description: string;
  leaderName: string;
  joinMode: string;
  prayerTime: string | null;
  hasCallLink: boolean;
  appliedAt: string;
}

const LEADER_NAME = "(select m.display_name from group_members m where m.group_id = g.id and m.role = 'leader' limit 1)";

export async function listApplications(db: Db): Promise<GroupApplication[]> {
  const r = await db.query(
    `select g.id, g.name, g.description, g.join_mode, g.prayer_time, g.call_url, g.created_at, ${LEADER_NAME} as leader_name
     from groups g where g.status = 'pending' order by g.created_at`
  );
  return r.rows.map((x) => ({
    groupId: x.id,
    name: x.name,
    description: x.description ?? "",
    leaderName: x.leader_name ?? "Leader",
    joinMode: x.join_mode,
    prayerTime: x.prayer_time ?? null,
    hasCallLink: !!x.call_url,
    appliedAt: new Date(x.created_at).toISOString(),
  }));
}

/** Approve (the group goes live) or decline it (with a note the leader sees). Only a pending group can be decided. */
export async function decideApplication(db: Db, groupId: string, approve: boolean, note: string): Promise<void> {
  const r = await db.query(
    "update groups set status = $2, review_note = $3, reviewed_at = now() where id = $1 and status = 'pending'",
    [groupId, approve ? "approved" : "rejected", approve ? null : note.trim().slice(0, 300) || null]
  );
  if (r.rowCount === 0) throw new Error("That application was already handled or no longer exists.");
}
