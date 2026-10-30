import type { DirectoryGroup, GroupComment, GroupDetail } from "@/lib/groups";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "Something went wrong. Please try again.", status: res.status };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "No connection. Check your internet and try again.", status: 0 };
  }
}

export const fetchDirectory = () => call<{ groups: DirectoryGroup[] }>("/api/groups");
export const fetchDetail = (id: string) => call<{ detail: GroupDetail }>(`/api/groups?id=${encodeURIComponent(id)}`);
export const fetchComments = (groupId: string, postId: string) =>
  call<{ comments: GroupComment[] }>(`/api/groups?id=${encodeURIComponent(groupId)}&post=${encodeURIComponent(postId)}`);

export const groupAction = <T = { ok: true }>(body: Record<string, unknown>) =>
  call<T>("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// ── Groups that were saved on this phone before groups moved online ────────────

export interface LegacyGroup {
  id: string;
  name: string;
  description: string;
  admins: string[];
  prayerTime?: string;
  pinnedVerse?: string;
  public: boolean;
}

const MOVED_KEY = "pfm_groups_moved";

/** Groups this person created on this phone (the official team seed is never offered). */
export function readLegacyGroups(me: { id?: string; name?: string | null; email?: string | null }): LegacyGroup[] {
  try {
    const moved = new Set<string>(JSON.parse(localStorage.getItem(MOVED_KEY) || "[]"));
    const all = JSON.parse(localStorage.getItem("pfm_groups") || "[]") as LegacyGroup[];
    if (!Array.isArray(all)) return [];
    return all.filter(
      (g) => g.id !== "group-prayer-fire-movement" && !moved.has(g.id) && (g.admins ?? []).some((a) => a === me.id || a === me.name || (!!me.email && a === me.email))
    );
  } catch {
    return [];
  }
}

export function markLegacyMoved(id: string) {
  try {
    const moved = new Set<string>(JSON.parse(localStorage.getItem(MOVED_KEY) || "[]"));
    moved.add(id);
    localStorage.setItem(MOVED_KEY, JSON.stringify([...moved]));
  } catch {
    /* storage unavailable: the offer simply stays */
  }
}
