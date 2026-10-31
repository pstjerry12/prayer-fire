import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { computeFreeMode, FREE_MODE_KEYS, parseFreeModeSettings, type FreeModeSettings } from "./freeModeRules";

export * from "./freeModeRules";

export async function getFreeModeSettings(): Promise<FreeModeSettings> {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, Object.values(FREE_MODE_KEYS)));
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return parseFreeModeSettings(map);
}

/** Whether Free Premium Mode is on right now, for everyone. */
export async function getFreeMode(): Promise<{ active: boolean; endsAt: string | null }> {
  return computeFreeMode(await getFreeModeSettings());
}
