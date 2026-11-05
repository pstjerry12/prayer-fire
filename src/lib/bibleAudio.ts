import type { Pool } from "pg";

/**
 * Premium Bible voices (for Partner and Leader subscribers, and during Free Premium Mode). Each chapter is generated ONCE per
 * voice and translation with ElevenLabs, stored in Supabase Storage and reused for everyone after that, so each chapter is paid for
 * at most once. Free users keep the phone's own voice (read-aloud), which this file never touches.
 *
 * The outside services (the text-to-speech service and the file storage) are passed in, so the rules here are tested with
 * fakes and no network. The real ones are at the bottom (`elevenLabsTts`, `supabaseStorage`).
 */
type Db = Pick<Pool, "query">;

export interface Voice {
  /** Our own short id, used in the cache key and the app (letters, digits, underscore). */
  id: string;
  label: string;
  description: string;
  /** The voice id in the ElevenLabs voice library. */
  elevenVoiceId: string;
  enabled: boolean;
}

/** ElevenLabs "premade" voices that every account can use. The admin can change all of this (Admin -> Pricing -> Bible voices). */
export const DEFAULT_VOICES: Voice[] = [
  { id: "deep_male", label: "Deep male", description: "A deep, steady voice", elevenVoiceId: "pNInz6obpgDQGcFmaJgB", enabled: true },
  { id: "warm_female", label: "Warm female", description: "A warm, gentle voice", elevenVoiceId: "21m00Tcm4TlvDq8ikWAM", enabled: true },
];

export interface VoiceSettings {
  voices: Voice[];
  /** The most NEW chapters that may be generated per day, across all voices. Protects the ElevenLabs bill. */
  dailyCap: number;
}

export const DEFAULT_DAILY_CAP = 150;

/** Reads the admin's saved settings (JSON) into safe voice settings; anything missing or odd falls back to the defaults. */
export function parseVoiceSettings(raw: unknown): VoiceSettings {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return { voices: DEFAULT_VOICES, dailyCap: DEFAULT_DAILY_CAP };
    }
  }
  if (!v || typeof v !== "object") return { voices: DEFAULT_VOICES, dailyCap: DEFAULT_DAILY_CAP };
  const o = v as Record<string, unknown>;
  const voices: Voice[] = [];
  const seen = new Set<string>();
  if (Array.isArray(o.voices)) {
    for (const x of o.voices.slice(0, 8)) {
      if (!x || typeof x !== "object") continue;
      const r = x as Record<string, unknown>;
      const id = String(r.id ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30);
      const label = String(r.label ?? "").trim().slice(0, 40);
      const eleven = String(r.elevenVoiceId ?? "").trim();
      if (!id || !label || !/^[A-Za-z0-9]{10,40}$/.test(eleven) || seen.has(id)) continue;
      seen.add(id);
      voices.push({ id, label, description: String(r.description ?? "").trim().slice(0, 80), elevenVoiceId: eleven, enabled: r.enabled !== false });
    }
  }
  const cap = Math.floor(Number(o.dailyCap));
  return { voices: voices.length > 0 ? voices : DEFAULT_VOICES, dailyCap: Number.isFinite(cap) && cap >= 0 && cap <= 5000 ? cap : DEFAULT_DAILY_CAP };
}

export const TRANSLATIONS = ["kjv", "asv", "web"] as const;
export type AudioTranslation = (typeof TRANSLATIONS)[number];

export interface ChapterRequest {
  voice: string;
  translation: string;
  /** OSIS book code, the file name in /bible-data (John, 1Cor ...). */
  book: string;
  chapter: number;
}

/** The storage path and cache key of a chapter. Throws on anything that could escape the folder. */
export function chapterKey(r: ChapterRequest): string {
  if (!/^[a-z0-9_]{1,30}$/.test(r.voice)) throw new Error("bad_voice");
  if (!(TRANSLATIONS as readonly string[]).includes(r.translation)) throw new Error("bad_translation");
  if (!/^[A-Za-z0-9]{2,8}$/.test(r.book)) throw new Error("bad_book");
  if (!Number.isInteger(r.chapter) || r.chapter < 1 || r.chapter > 150) throw new Error("bad_chapter");
  return `v1/${r.voice}/${r.translation}/${r.book}/${r.chapter}`;
}

/** The words that are spoken: the chapter heading, then each verse. Footnote marks and extra spaces are removed. */
export function chapterSpeech(bookName: string, chapter: number, verses: { number: number; text: string }[]): string {
  const body = verses
    .map((v) => v.text.replace(/\[\d+\]|\{[^}]*\}/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((t) => (/[.!?:;,”"’')\]]$/.test(t) ? t : `${t}.`))
    .join(" ");
  return `${bookName}, chapter ${chapter}. ${body}`;
}

/** Splits long text into pieces of at most `max` characters, at sentence ends, so each fits one text-to-speech request. */
export function splitText(text: string, max = 4500): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf(". ", max), rest.lastIndexOf("? ", max), rest.lastIndexOf("! ", max));
    if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export interface Tts {
  (text: string, elevenVoiceId: string): Promise<Uint8Array>;
}
export interface Storage {
  exists(key: string): Promise<boolean>;
  put(key: string, data: Uint8Array): Promise<void>;
  signedUrl(key: string, seconds: number): Promise<string>;
}

export type AudioResult =
  | { status: "ready"; url: string; cached: boolean }
  | { status: "preparing"; retryAfterSeconds: number }
  | { status: "busy"; message: string }
  | { status: "error"; message: string };

const STALE_MINUTES = 3;

/**
 * The chapter's audio: from the cache if it is there; otherwise generated now (once, even if several people ask at the same
 * moment), stored, and returned. A daily cap on NEW chapters protects the bill; chapters already generated never count.
 */
export async function getChapterAudio(
  db: Db,
  deps: { storage: Storage; tts: Tts; textFor: (r: ChapterRequest) => Promise<string | null>; settings: VoiceSettings },
  req: ChapterRequest
): Promise<AudioResult> {
  const voice = deps.settings.voices.find((v) => v.id === req.voice && v.enabled);
  if (!voice) return { status: "error", message: "That voice is not available." };
  const key = chapterKey(req);

  const ready = await db.query("select status from bible_audio where key = $1", [key]);
  if (ready.rows[0]?.status === "ready") {
    if (await deps.storage.exists(key)) return { status: "ready", url: await deps.storage.signedUrl(key, 3600), cached: true };
    // The file is gone from storage although the chapter was marked ready: mark it failed so the next step rebuilds it (once).
    await db.query("update bible_audio set status = 'failed', error = 'file missing', updated_at = now() where key = $1 and status = 'ready'", [key]);
  }

  // Daily cap: new generations started today (UTC), not counting chapters that failed.
  const used = await db.query("select count(*)::int as n from bible_audio where created_at >= date_trunc('day', now()) and status <> 'failed'");
  const row = ready.rows[0];
  if (!row && Number(used.rows[0].n) >= deps.settings.dailyCap) {
    return { status: "busy", message: "Premium voices are resting for today. Please try again tomorrow, or use your phone's voice." };
  }

  // Take the job: a new row, or take over a failed one, or one that was left 'generating' for too long.
  const claim = await db.query(
    `insert into bible_audio (key, voice, translation, book, chapter, status) values ($1, $2, $3, $4, $5, 'generating')
     on conflict (key) do update set status = 'generating', error = null, updated_at = now()
       where bible_audio.status = 'failed' or bible_audio.updated_at < now() - ($6 || ' minutes')::interval
     returning key`,
    [key, req.voice, req.translation, req.book, req.chapter, String(STALE_MINUTES)]
  );
  if (claim.rows.length === 0) return { status: "preparing", retryAfterSeconds: 6 };

  try {
    const text = await deps.textFor(req);
    if (!text) throw new Error("The chapter text was not found.");
    const parts: Uint8Array[] = [];
    for (const piece of splitText(text)) parts.push(await deps.tts(piece, voice.elevenVoiceId));
    const total = parts.reduce((n, p) => n + p.length, 0);
    if (total < 1000) throw new Error("The voice service returned no audio.");
    const all = new Uint8Array(total);
    let at = 0;
    for (const p of parts) {
      all.set(p, at);
      at += p.length;
    }
    await deps.storage.put(key, all);
    await db.query("update bible_audio set status = 'ready', bytes = $2, updated_at = now() where key = $1", [key, total]);
    return { status: "ready", url: await deps.storage.signedUrl(key, 3600), cached: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate the audio.";
    await db.query("update bible_audio set status = 'failed', error = $2, updated_at = now() where key = $1", [key, message.slice(0, 300)]);
    return { status: "error", message: "The premium voice could not be prepared right now. Please try again in a moment." };
  }
}

// ── The real services ────────────────────────────────────────────────────────

/** ElevenLabs text-to-speech: returns mp3 bytes. Needs the ELEVENLABS_API_KEY secret. */
export function elevenLabsTts(apiKey: string, fetcher: typeof fetch = fetch): Tts {
  return async (text, elevenVoiceId) => {
    const res = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenVoiceId)}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.75 } }),
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`The voice service answered ${res.status}.`);
    return new Uint8Array(await res.arrayBuffer());
  };
}

/** Supabase Storage (private bucket `bible-audio`) through its REST API. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. */
export function supabaseStorage(baseUrl: string, serviceKey: string, fetcher: typeof fetch = fetch): Storage {
  const bucket = "bible-audio";
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");
  return {
    async exists(key) {
      const res = await fetcher(`${baseUrl}/storage/v1/object/info/${bucket}/${enc(key)}`, { headers });
      return res.ok;
    },
    async put(key, data) {
      const res = await fetcher(`${baseUrl}/storage/v1/object/${bucket}/${enc(key)}`, { method: "POST", headers: { ...headers, "Content-Type": "audio/mpeg", "x-upsert": "true" }, body: data as unknown as BodyInit });
      if (!res.ok) throw new Error(`Storage answered ${res.status}.`);
    },
    async signedUrl(key, seconds) {
      const res = await fetcher(`${baseUrl}/storage/v1/object/sign/${bucket}/${enc(key)}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: seconds }) });
      if (!res.ok) throw new Error(`Storage answered ${res.status}.`);
      const j = (await res.json()) as { signedURL?: string };
      if (!j.signedURL) throw new Error("Storage gave no link.");
      return `${baseUrl}/storage/v1${j.signedURL.startsWith("/") ? "" : "/"}${j.signedURL}`;
    },
  };
}
