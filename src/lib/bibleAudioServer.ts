import { db, pool } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSubscriptions, toSubscriptionInfo } from "@/lib/subscription";
import { getFreeMode } from "@/lib/freeMode";
import { BIBLE_BOOKS } from "@/app/data/bibleBooks";
import {
  chapterSpeech, elevenLabsTts, getChapterAudio, parseVoiceSettings, supabaseStorage, TRANSLATIONS,
  type ChapterRequest, type VoiceSettings,
} from "@/lib/bibleAudio";

/** The server wiring for premium Bible voices: the admin's settings, who may use them, and the real ElevenLabs and Storage services. */

const DEFAULT_SUPABASE_URL = "https://ebhlmjryezzxtoymoetn.supabase.co";

export function audioConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function loadVoiceSettings(): Promise<VoiceSettings> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, "bible_voices")).limit(1);
  return parseVoiceSettings(rows[0]?.value ?? null);
}

/** Partner and Leader subscribers, and everyone while Free Premium Mode is on. */
export async function mayUsePremiumVoices(userId: string): Promise<boolean> {
  if ((await getFreeMode()).active) return true;
  return toSubscriptionInfo(await getSubscriptions(userId)) !== null;
}

export async function chapterAudioFor(origin: string, req: ChapterRequest) {
  const settings = await loadVoiceSettings();
  const storage = supabaseStorage(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const tts = elevenLabsTts(process.env.ELEVENLABS_API_KEY!);
  return getChapterAudio(
    pool,
    {
      storage,
      tts,
      settings,
      // The chapter text comes from the app's own bundled Bible files (served as static files next to the app).
      textFor: async (r) => {
        const book = BIBLE_BOOKS.find((b) => b.osis === r.book);
        if (!book || !(TRANSLATIONS as readonly string[]).includes(r.translation)) return null;
        const res = await fetch(`${origin}/bible-data/v1/${r.translation}/${encodeURIComponent(r.book)}.json`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = (await res.json()) as { chapters?: { chapter: number; verses: { number: number; text: string }[] }[] };
        const ch = data.chapters?.find((c) => c.chapter === r.chapter);
        return ch && ch.verses.length > 0 ? chapterSpeech(book.name, r.chapter, ch.verses) : null;
      },
    },
    req
  );
}
