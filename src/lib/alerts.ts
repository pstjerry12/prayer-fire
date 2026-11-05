import type { Pool } from "pg";
import { randomUUID } from "crypto";

/**
 * Global Prayer Alerts: urgent worldwide prayer needs the admin posts (summary, scriptures, prayer points), with a live
 * "people are praying" counter and the countries they are praying from, plus updates and answered-prayer testimonies.
 * A Leader can ask to raise a PUBLIC altar (shown to everyone only after the admin approves it); a PRIVATE altar goes to
 * the leader's own group as an alert post (see the groups code), not through here.
 * These run on the app's own database connection from server routes that have already checked who is asking.
 */
type Db = Pick<Pool, "query">;

export interface AlertSummary {
  id: string;
  title: string;
  summary: string;
  country: string | null;
  source: "admin" | "leader";
  authorName: string;
  pinned: boolean;
  createdAt: string;
  praying: number;
  countries: number;
  iAmPraying: boolean;
}

export interface AlertUpdate {
  id: string;
  kind: "update" | "testimony";
  body: string;
  createdAt: string;
}

export interface AlertDetail extends AlertSummary {
  scriptures: string[];
  points: string[];
  status: "draft" | "live" | "ended";
  /** Where people are praying from: country code and how many. Most first. */
  topCountries: { code: string; count: number }[];
  updates: AlertUpdate[];
}

export interface AlertInput {
  title: string;
  summary?: string;
  scriptures?: unknown;
  points?: unknown;
  country?: string | null;
}

const iso = (v: unknown) => new Date(v as string).toISOString();

/** A list of short strings from anything: trims, drops empties, caps the count and each length. */
export function cleanList(v: unknown, maxItems = 12, maxLen = 300): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
  return raw
    .map((x) => (typeof x === "string" ? x.trim().slice(0, maxLen) : ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

/** An ISO country code (two letters) from a header value, or "XX" when it is missing or odd. */
export function countryFromHeader(v: string | null | undefined): string {
  const c = (v ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : "XX";
}

export function validateInput(a: AlertInput): { title: string; summary: string; scriptures: string[]; points: string[]; country: string | null } {
  const title = (a.title ?? "").trim().slice(0, 140);
  if (title.length < 3) throw new Error("Give the alert a title (at least 3 letters).");
  const country = (a.country ?? "").toString().trim().slice(0, 60);
  return {
    title,
    summary: (a.summary ?? "").trim().slice(0, 2000),
    scriptures: cleanList(a.scriptures, 8, 80),
    points: cleanList(a.points, 12, 300),
    country: country || null,
  };
}

const COUNTS = `
  (select count(*)::int from alert_praying p where p.alert_id = a.id) as praying,
  (select count(distinct p.country)::int from alert_praying p where p.alert_id = a.id and p.country <> 'XX') as countries,
  exists (select 1 from alert_praying p where p.alert_id = a.id and p.user_id = $1) as i_am_praying`;

function summaryOf(r: Record<string, unknown>): AlertSummary {
  return {
    id: String(r.id),
    title: String(r.title),
    summary: String(r.summary ?? ""),
    country: (r.country as string | null) ?? null,
    source: r.source === "leader" ? "leader" : "admin",
    authorName: String(r.author_name ?? "Prayer Fire"),
    pinned: r.pinned === true,
    createdAt: iso(r.created_at),
    praying: Number(r.praying),
    countries: Number(r.countries),
    iAmPraying: r.i_am_praying === true,
  };
}

/** Live alerts (not ended, not past their end date), pinned first then newest. */
export async function listLive(db: Db, userId: string | null): Promise<AlertSummary[]> {
  const r = await db.query(
    `select a.*, ${COUNTS} from global_alerts a
     where a.status = 'live' and (a.ends_at is null or a.ends_at > now())
     order by a.pinned desc, a.created_at desc limit 30`,
    [userId ?? ""]
  );
  return r.rows.map(summaryOf);
}

export async function getAlert(db: Db, id: string, userId: string | null, includeUnpublished = false): Promise<AlertDetail | null> {
  const r = await db.query(
    `select a.*, ${COUNTS} from global_alerts a where a.id = $2 ${includeUnpublished ? "" : "and a.status <> 'draft'"}`,
    [userId ?? "", id]
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  const top = await db.query(
    "select country, count(*)::int as n from alert_praying where alert_id = $1 and country <> 'XX' group by country order by n desc, country limit 12",
    [id]
  );
  const ups = await db.query("select id, kind, body, created_at from alert_updates where alert_id = $1 order by created_at desc limit 30", [id]);
  return {
    ...summaryOf(row),
    scriptures: cleanList(row.scriptures),
    points: cleanList(row.points),
    status: row.status,
    topCountries: top.rows.map((x) => ({ code: String(x.country), count: Number(x.n) })),
    updates: ups.rows.map((u) => ({ id: u.id, kind: u.kind === "testimony" ? "testimony" : "update", body: u.body, createdAt: iso(u.created_at) })),
  };
}

/** "I'm praying": once per person per alert. Returns true if it was newly counted. Ended and draft alerts do not count. */
export async function pray(db: Db, alertId: string, userId: string, country: string): Promise<boolean> {
  const r = await db.query(
    `insert into alert_praying (alert_id, user_id, country)
     select a.id, $2, $3 from global_alerts a
     where a.id = $1 and a.status = 'live' and (a.ends_at is null or a.ends_at > now())
     on conflict (alert_id, user_id) do nothing`,
    [alertId, userId, countryFromHeader(country)]
  );
  return (r.rowCount ?? 0) > 0;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listAll(db: Db): Promise<(AlertSummary & { status: string })[]> {
  const r = await db.query(`select a.*, ${COUNTS} from global_alerts a order by a.created_at desc limit 100`, [""]);
  return r.rows.map((x) => ({ ...summaryOf(x), status: String(x.status) }));
}

export async function createAlert(db: Db, a: AlertInput, opts: { status?: "draft" | "live"; source?: "admin" | "leader"; authorName?: string; authorId?: string | null; pinned?: boolean } = {}): Promise<string> {
  const v = validateInput(a);
  const id = `al_${randomUUID().replace(/-/g, "")}`;
  await db.query(
    `insert into global_alerts (id, title, summary, scriptures, points, country, status, source, author_name, author_id, pinned)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11)`,
    [id, v.title, v.summary, JSON.stringify(v.scriptures), JSON.stringify(v.points), v.country, opts.status ?? "live", opts.source ?? "admin", opts.authorName ?? "Prayer Fire", opts.authorId ?? null, opts.pinned === true]
  );
  return id;
}

export async function updateAlert(db: Db, id: string, a: AlertInput & { status?: string; pinned?: boolean }): Promise<void> {
  const v = validateInput(a);
  const status = a.status === "draft" || a.status === "ended" ? a.status : "live";
  const r = await db.query(
    "update global_alerts set title = $2, summary = $3, scriptures = $4::jsonb, points = $5::jsonb, country = $6, status = $7, pinned = $8 where id = $1",
    [id, v.title, v.summary, JSON.stringify(v.scriptures), JSON.stringify(v.points), v.country, status, a.pinned === true]
  );
  if (r.rowCount === 0) throw new Error("That alert no longer exists.");
}

export async function setStatus(db: Db, id: string, status: "draft" | "live" | "ended"): Promise<void> {
  await db.query("update global_alerts set status = $2 where id = $1", [id, status]);
}

export async function deleteAlert(db: Db, id: string): Promise<void> {
  await db.query("delete from global_alerts where id = $1", [id]);
}

export async function addUpdate(db: Db, alertId: string, kind: "update" | "testimony", body: string): Promise<void> {
  const text = (body ?? "").trim().slice(0, 2000);
  if (text.length < 2) throw new Error("Write the update first.");
  const r = await db.query("insert into alert_updates (id, alert_id, kind, body) select $1, a.id, $3, $4 from global_alerts a where a.id = $2", [`au_${randomUUID().replace(/-/g, "")}`, alertId, kind, text]);
  if (r.rowCount === 0) throw new Error("That alert no longer exists.");
}

export async function deleteUpdate(db: Db, updateId: string): Promise<void> {
  await db.query("delete from alert_updates where id = $1", [updateId]);
}

// ── Leaders' public altars (need the admin's approval) ───────────────────────

export interface AltarRequest {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  summary: string;
  scriptures: string[];
  points: string[];
  country: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  alertId: string | null;
  createdAt: string;
}

const reqOf = (r: Record<string, unknown>): AltarRequest => ({
  id: String(r.id), userId: String(r.user_id), authorName: String(r.author_name), title: String(r.title), summary: String(r.summary ?? ""),
  scriptures: cleanList(r.scriptures), points: cleanList(r.points), country: (r.country as string | null) ?? null,
  status: r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "pending",
  note: (r.note as string | null) ?? null, alertId: (r.alert_id as string | null) ?? null, createdAt: iso(r.created_at),
});

/** A leader asks for a public altar. At most 3 waiting at a time per leader. */
export async function requestAltar(db: Db, userId: string, authorName: string, a: AlertInput): Promise<string> {
  const v = validateInput(a);
  const waiting = await db.query("select count(*)::int as n from alert_requests where user_id = $1 and status = 'pending'", [userId]);
  if (Number(waiting.rows[0].n) >= 3) throw new Error("You already have 3 altars waiting for approval. Please wait for them to be reviewed.");
  const id = `ar_${randomUUID().replace(/-/g, "")}`;
  await db.query(
    "insert into alert_requests (id, user_id, author_name, title, summary, scriptures, points, country) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)",
    [id, userId, authorName.slice(0, 80) || "Leader", v.title, v.summary, JSON.stringify(v.scriptures), JSON.stringify(v.points), v.country]
  );
  return id;
}

export async function listRequests(db: Db, status: "pending" | "all" = "pending"): Promise<AltarRequest[]> {
  const r = await db.query(`select * from alert_requests ${status === "pending" ? "where status = 'pending'" : ""} order by created_at desc limit 100`);
  return r.rows.map(reqOf);
}

export async function myRequests(db: Db, userId: string): Promise<AltarRequest[]> {
  const r = await db.query("select * from alert_requests where user_id = $1 order by created_at desc limit 20", [userId]);
  return r.rows.map(reqOf);
}

/** Approve (it becomes a live public alert by that leader) or decline with a note. Only a pending request can be decided. */
export async function decideRequest(db: Db, requestId: string, approve: boolean, note: string): Promise<void> {
  const r = await db.query("select * from alert_requests where id = $1 and status = 'pending'", [requestId]);
  if (r.rows.length === 0) throw new Error("That request was already handled or no longer exists.");
  const req = reqOf(r.rows[0]);
  if (approve) {
    const alertId = await createAlert(db, { title: req.title, summary: req.summary, scriptures: req.scriptures, points: req.points, country: req.country }, { source: "leader", authorName: req.authorName, authorId: req.userId });
    await db.query("update alert_requests set status = 'approved', alert_id = $2, decided_at = now() where id = $1", [requestId, alertId]);
  } else {
    await db.query("update alert_requests set status = 'rejected', note = $2, decided_at = now() where id = $1", [requestId, note.trim().slice(0, 300) || null]);
  }
}
