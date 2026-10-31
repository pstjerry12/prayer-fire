import type { Pool } from "pg";

/**
 * Featured groups, the admin's side. These run on the app's own (owner) database connection from the admin routes,
 * after the route has checked the caller is an admin. Leaders cannot do any of this: the restricted `app_user` role
 * has no write access to the featured columns (see supabase/groups.sql), they can only ask.
 */
type Db = Pick<Pool, "query">;

export interface FeatureRequest {
  id: string;
  groupId: string;
  groupName: string;
  leaderName: string;
  members: number;
  message: string;
  createdAt: string;
}

export interface FeaturedGroup {
  groupId: string;
  name: string;
  leaderName: string;
  members: number;
  featuredAt: string | null;
  /** null = no end date */
  until: string | null;
  /** false once the end date has passed (it has switched itself off) */
  active: boolean;
}

const LEADER_NAME = "(select m.display_name from group_members m where m.group_id = g.id and m.role = 'leader' limit 1)";
const MEMBERS = "(select count(*)::int from group_members m where m.group_id = g.id and m.status = 'active')";

export async function listFeatured(db: Db): Promise<{ pending: FeatureRequest[]; featured: FeaturedGroup[] }> {
  const pending = await db.query(
    `select r.id, r.group_id, g.name, ${LEADER_NAME} as leader_name, ${MEMBERS} as members, r.message, r.created_at
     from group_feature_requests r join groups g on g.id = r.group_id
     where r.status = 'pending' order by r.created_at`
  );
  const featured = await db.query(
    `select g.id, g.name, ${LEADER_NAME} as leader_name, ${MEMBERS} as members, g.featured_at, g.featured_until,
       (g.featured_until is null or g.featured_until > now()) as active
     from groups g where g.featured order by (g.featured_until is null or g.featured_until > now()) desc, g.featured_at desc nulls last`
  );
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return {
    pending: pending.rows.map((r) => ({
      id: r.id, groupId: r.group_id, groupName: r.name, leaderName: r.leader_name ?? "Leader", members: Number(r.members), message: r.message ?? "", createdAt: iso(r.created_at)!,
    })),
    featured: featured.rows.map((r) => ({
      groupId: r.id, name: r.name, leaderName: r.leader_name ?? "Leader", members: Number(r.members), featuredAt: iso(r.featured_at), until: iso(r.featured_until), active: r.active === true,
    })),
  };
}

/** An optional end date must be in the future. null or an empty value means "no end date". */
export function parseEnd(value: unknown, now: Date = new Date()): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new Error("That end date is not valid.");
  if (d.getTime() <= now.getTime()) throw new Error("The end date must be in the future.");
  return d;
}

export async function approveRequest(db: Db, requestId: string, adminId: string, until: Date | null): Promise<void> {
  const req = await db.query("select group_id from group_feature_requests where id = $1 and status = 'pending'", [requestId]);
  if (req.rows.length === 0) throw new Error("That request was already handled or no longer exists.");
  await db.query("update groups set featured = true, featured_at = now(), featured_until = $2 where id = $1", [req.rows[0].group_id, until]);
  await db.query("update group_feature_requests set status = 'approved', decided_at = now(), decided_by = $2 where id = $1", [requestId, adminId]);
}

export async function rejectRequest(db: Db, requestId: string, adminId: string, note: string): Promise<void> {
  const r = await db.query(
    "update group_feature_requests set status = 'rejected', decision_note = $3, decided_at = now(), decided_by = $2 where id = $1 and status = 'pending'",
    [requestId, adminId, note.trim().slice(0, 200) || null]
  );
  if (r.rowCount === 0) throw new Error("That request was already handled or no longer exists.");
}

export async function removeFeatured(db: Db, groupId: string): Promise<void> {
  await db.query("update groups set featured = false, featured_at = null, featured_until = null where id = $1", [groupId]);
}

export async function setFeaturedEnd(db: Db, groupId: string, until: Date | null): Promise<void> {
  const r = await db.query("update groups set featured_until = $2 where id = $1 and featured", [groupId, until]);
  if (r.rowCount === 0) throw new Error("That group is not featured.");
}
