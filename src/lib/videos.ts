import type { Pool } from "pg";

/**
 * Admin-managed YouTube videos: the admin pastes links, the app fetches each title (YouTube's public oEmbed, no API key) and
 * builds the thumbnail from the video id. Three kinds: "tutorial" (one short video per feature, shown under "How to use Prayer
 * Fire" and as a small "Watch how" link on that feature's page), "podcast" (weekly or daily teaching, newest first) and
 * "teaching" (short teachings for the Home row). All free.
 */
type Db = Pick<Pool, "query">;

// No Node-only imports in this file, so screens (the app and the admin) can import its helpers and types too.
const randomUUID = () => globalThis.crypto.randomUUID();

export type VideoKind = "tutorial" | "podcast" | "teaching";

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  kind: VideoKind;
  feature: string | null;
  sort: number;
  published: boolean;
  createdAt: string;
}

/** The features a tutorial can explain, in the order "How to use Prayer Fire" lists them. `path` is the screen it belongs to. */
export const FEATURES: { key: string; label: string; path: string }[] = [
  { key: "home", label: "Getting started", path: "/" },
  { key: "workshop", label: "Writing prayer points", path: "/workshop" },
  { key: "startup", label: "Start-Up Prayer", path: "/startup" },
  { key: "alarms", label: "Prayer alarms and schedule", path: "/schedule" },
  { key: "bible", label: "The Bible and read-aloud", path: "/bible" },
  { key: "verses", label: "Prayer Verses", path: "/prayer-verses" },
  { key: "study", label: "My Study", path: "/study" },
  { key: "scripture", label: "Scripture Vault", path: "/scripture" },
  { key: "fasting", label: "Fasting", path: "/fasting" },
  { key: "groups", label: "Prayer Groups", path: "/groups" },
  { key: "alerts", label: "Global Prayer Alerts", path: "/alerts" },
  { key: "wall", label: "Prayer wall", path: "/network" },
  { key: "worship", label: "Praise and Worship", path: "/worship" },
  { key: "plans", label: "Plans", path: "/partner" },
];

/** The feature key for a page address (the exact screen, or a page inside it such as /bible/verse/...). */
export function featureForPath(pathname: string): string | null {
  const p = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const hit = FEATURES.find((f) => f.path === p) ?? FEATURES.find((f) => f.path !== "/" && p.startsWith(f.path + "/"));
  return hit?.key ?? null;
}

export function isKind(v: unknown): v is VideoKind {
  return v === "tutorial" || v === "podcast" || v === "teaching";
}

/** The video id in a YouTube link (watch, youtu.be, shorts, live, embed). Same rules as src/app/utils/youtube.ts, repeated here
 *  because the tests run this file directly and cannot import it with an extension-less path. */
function idFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

/** Video ids from a block of pasted text: one link (or bare 11-character id) per line, in order, without repeats. */
export function parseLinks(text: string): string[] {
  const ids: string[] = [];
  for (const part of (text ?? "").split(/\s+/)) {
    const raw = part.trim();
    if (!raw) continue;
    const id = /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : idFromUrl(raw);
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export const thumbnailUrl = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
export const watchUrl = (youtubeId: string) => `https://www.youtube.com/watch?v=${youtubeId}`;
export const embedUrl = (youtubeId: string) => `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;

/** Title and channel from YouTube's public oEmbed (no API key). Null if the video is private, removed or YouTube is unreachable. */
export async function fetchYouTubeInfo(youtubeId: string, fetcher: typeof fetch = fetch): Promise<{ title: string; channel: string } | null> {
  try {
    const res = await fetcher(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(youtubeId))}&format=json`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: unknown; author_name?: unknown };
    const title = typeof j.title === "string" ? j.title.trim().slice(0, 200) : "";
    return title ? { title, channel: typeof j.author_name === "string" ? j.author_name.trim().slice(0, 100) : "" } : null;
  } catch {
    return null;
  }
}

const iso = (v: unknown) => new Date(v as string).toISOString();
const rowOf = (r: Record<string, unknown>): Video => ({
  id: String(r.id),
  youtubeId: String(r.youtube_id),
  title: String(r.title),
  channel: String(r.channel ?? ""),
  kind: r.kind as VideoKind,
  feature: (r.feature as string | null) ?? null,
  sort: Number(r.sort),
  published: r.published === true,
  createdAt: iso(r.created_at),
});

/** Published videos for the app. Tutorials come in "How to use" order, everything else newest first. */
export async function listPublic(db: Db, opts: { kind?: VideoKind; feature?: string; limit?: number } = {}): Promise<Video[]> {
  const where = ["published"];
  const params: unknown[] = [];
  if (opts.kind) {
    params.push(opts.kind);
    where.push(`kind = $${params.length}`);
  }
  if (opts.feature) {
    params.push(opts.feature);
    where.push(`feature = $${params.length}`);
  }
  params.push(Math.min(Math.max(opts.limit ?? 30, 1), 100));
  const order = opts.kind === "tutorial" || opts.feature ? "sort, created_at desc" : "created_at desc";
  const r = await db.query(`select * from videos where ${where.join(" and ")} order by ${order} limit $${params.length}`, params);
  return r.rows.map(rowOf);
}

export async function listAll(db: Db): Promise<Video[]> {
  const r = await db.query("select * from videos order by kind, sort, created_at desc limit 300");
  return r.rows.map(rowOf);
}

export interface AddResult {
  added: Video[];
  skipped: { input: string; reason: string }[];
}

/** Adds every link in `text` as `kind` (fetching titles). A link already saved as that kind is skipped; one YouTube cannot describe is skipped with a reason. */
export async function addLinks(db: Db, text: string, kind: VideoKind, feature: string | null, fetcher: typeof fetch = fetch): Promise<AddResult> {
  const ids = parseLinks(text);
  const result: AddResult = { added: [], skipped: [] };
  if (ids.length === 0) throw new Error("Paste at least one YouTube link.");
  if (ids.length > 20) throw new Error("Add up to 20 links at a time.");
  const feat = kind === "tutorial" && feature && FEATURES.some((f) => f.key === feature) ? feature : null;
  if (kind === "tutorial" && !feat) throw new Error("Choose which feature the tutorial explains.");
  for (const youtubeId of ids) {
    const info = await fetchYouTubeInfo(youtubeId, fetcher);
    if (!info) {
      result.skipped.push({ input: youtubeId, reason: "YouTube could not find this video (is it private or removed?)." });
      continue;
    }
    const id = `v_${randomUUID().replace(/-/g, "")}`;
    const order = kind === "tutorial" ? FEATURES.findIndex((f) => f.key === feat) : 0;
    const ins = await db.query(
      `insert into videos (id, youtube_id, title, channel, kind, feature, sort) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (youtube_id, kind) do nothing returning *`,
      [id, youtubeId, info.title, info.channel, kind, feat, order]
    );
    if (ins.rows.length === 0) result.skipped.push({ input: youtubeId, reason: "Already added." });
    else result.added.push(rowOf(ins.rows[0]));
  }
  return result;
}

export async function updateVideo(db: Db, id: string, a: { title?: string; feature?: string | null; published?: boolean; sort?: number }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [id];
  if (typeof a.title === "string") {
    const t = a.title.trim().slice(0, 200);
    if (t.length < 2) throw new Error("Give the video a title.");
    params.push(t);
    sets.push(`title = $${params.length}`);
  }
  if (a.feature !== undefined) {
    const f = a.feature && FEATURES.some((x) => x.key === a.feature) ? a.feature : null;
    params.push(f);
    sets.push(`feature = $${params.length}`);
  }
  if (typeof a.published === "boolean") {
    params.push(a.published);
    sets.push(`published = $${params.length}`);
  }
  if (typeof a.sort === "number" && Number.isFinite(a.sort)) {
    params.push(Math.round(a.sort));
    sets.push(`sort = $${params.length}`);
  }
  if (sets.length === 0) return;
  const r = await db.query(`update videos set ${sets.join(", ")} where id = $1`, params);
  if (r.rowCount === 0) throw new Error("That video no longer exists.");
}

export async function deleteVideo(db: Db, id: string): Promise<void> {
  await db.query("delete from videos where id = $1", [id]);
}
