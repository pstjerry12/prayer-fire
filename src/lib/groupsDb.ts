import type { Pool, QueryResultRow } from "pg";

/**
 * Runs `fn` as ONE database transaction in which Postgres knows who is asking:
 *   set_config('app.user_id', <id>)  +  set local role app_user
 * `app_user` is a restricted role (see supabase/groups.sql), so every query inside is judged by the Row Level
 * Security policies and the permission checks inside the database functions, even if the code around has a bug.
 */
export type Q = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;

export async function runAsUser<T>(pool: Pick<Pool, "connect">, userId: string, fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    await client.query("set local role app_user");
    const q: Q = async (text, params) => (await client.query(text, params as unknown[] | undefined)).rows as never;
    const result = await fn(q);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** The database functions raise short codes (for example "leader_required"). This turns them into plain sentences. */
const MESSAGES: Record<string, { status: number; message: string }> = {
  signin_required: { status: 401, message: "Sign in to use prayer groups." },
  premium_required: { status: 403, message: "Prayer groups are part of Prayer Fire Partner." },
  leader_required: { status: 403, message: "Creating and managing groups is part of Prayer Fire Leader." },
  not_allowed: { status: 403, message: "You are not allowed to do that in this group." },
  leader_cannot_leave: { status: 400, message: "You lead this group. Delete it instead of leaving." },
  too_many_groups: { status: 400, message: "You can lead up to 10 groups." },
  bad_name: { status: 400, message: "Give the group a name of 2 to 80 characters." },
  bad_join_mode: { status: 400, message: "Choose open or approval-only." },
  bad_kind: { status: 400, message: "Unknown post type." },
  bad_body: { status: 400, message: "Write something (up to 2,000 characters; comments up to 1,000)." },
};

export function groupError(err: unknown): { status: number; message: string } {
  const code = err instanceof Error ? err.message : "";
  return MESSAGES[code] ?? { status: 500, message: "Something went wrong with prayer groups. Please try again." };
}
