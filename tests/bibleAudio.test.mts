// Premium Bible voices. The pure parts always run; the cache/cap/lock part runs when GROUPS_TEST_DATABASE_URL is set (a real
// Postgres with supabase/bible-audio.sql loaded, minus the storage bucket line). ElevenLabs and Supabase Storage are FAKED.
import assert from "node:assert/strict";
import pg from "pg";
import * as B from "../src/lib/bibleAudio.ts";

let checks = 0;
const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };
const ok = (c: unknown, m: string) => { assert.ok(c, m); checks++; };
const throws = (fn: () => unknown) => { try { fn(); return "no error"; } catch (e) { return (e as Error).message; } };

// ── settings ────────────────────────────────────────────────────────────────
eq(B.parseVoiceSettings(null), { voices: B.DEFAULT_VOICES, dailyCap: B.DEFAULT_DAILY_CAP }, "nothing saved: the defaults");
eq(B.parseVoiceSettings("not json"), { voices: B.DEFAULT_VOICES, dailyCap: B.DEFAULT_DAILY_CAP }, "broken JSON: the defaults");
const s = B.parseVoiceSettings(JSON.stringify({ dailyCap: 20, voices: [
  { id: "African Elder!", label: "African accent", description: "Warm", elevenVoiceId: "abcDEF1234567890xyz", enabled: true },
  { id: "bad", label: "No voice id", elevenVoiceId: "x" },
  { id: "african_elder_", label: "Duplicate", elevenVoiceId: "abcDEF1234567890xyz" },
  { id: "off", label: "Switched off", elevenVoiceId: "zzzzzzzzzz1234", enabled: false },
] }));
eq(s.voices.map((v) => v.id), ["african_elder_", "off"], "ids cleaned, bad and duplicate voices dropped");
eq(s.voices[1].enabled, false, "a switched-off voice stays listed but disabled");
eq(s.dailyCap, 20, "the daily cap is kept");
eq(B.parseVoiceSettings({ dailyCap: 99999 }).dailyCap, B.DEFAULT_DAILY_CAP, "an absurd cap falls back");
eq(B.parseVoiceSettings({ dailyCap: 0 }).dailyCap, 0, "zero means no new chapters (a valid way to pause spending)");

// ── keys (nothing may escape the folder) ────────────────────────────────────
eq(B.chapterKey({ voice: "deep_male", translation: "kjv", book: "John", chapter: 3 }), "v1/deep_male/kjv/John/3", "a normal key");
eq(throws(() => B.chapterKey({ voice: "../x", translation: "kjv", book: "John", chapter: 3 })), "bad_voice", "voice with dots refused");
eq(throws(() => B.chapterKey({ voice: "a", translation: "niv", book: "John", chapter: 3 })), "bad_translation", "unknown translation refused");
eq(throws(() => B.chapterKey({ voice: "a", translation: "kjv", book: "../etc", chapter: 3 })), "bad_book", "book path refused");
eq(throws(() => B.chapterKey({ voice: "a", translation: "kjv", book: "John", chapter: 0 })), "bad_chapter", "chapter 0 refused");
eq(throws(() => B.chapterKey({ voice: "a", translation: "kjv", book: "John", chapter: 1.5 })), "bad_chapter", "fractional chapter refused");

// ── the words that are spoken ───────────────────────────────────────────────
eq(B.chapterSpeech("John", 3, [{ number: 1, text: "There was a man  of the Pharisees" }, { number: 2, text: "The same came to Jesus by night, and said." }]),
  "John, chapter 3. There was a man of the Pharisees. The same came to Jesus by night, and said.", "heading, spacing and full stops");
ok(!/\[\d+\]/.test(B.chapterSpeech("X", 1, [{ number: 1, text: "Hello[1] world {note}" }])), "footnote marks removed");
const long = Array.from({ length: 400 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
const pieces = B.splitText(long, 1000);
ok(pieces.length > 5 && pieces.every((p) => p.length <= 1000), "long text is cut into pieces that fit");
eq(pieces.join(" ").replace(/\s+/g, " "), long, "...without losing a word");
eq(B.splitText("short"), ["short"], "short text stays whole");

// ── the cache, the lock and the cap (fake services) ─────────────────────────
const url = process.env.GROUPS_TEST_DATABASE_URL;
if (!url) {
  console.log(`bibleAudio (no database): all ${checks} checks passed; cache checks skipped (set GROUPS_TEST_DATABASE_URL)`);
  process.exit(0);
}
const db = new pg.Pool({ connectionString: url });
await db.query("truncate bible_audio");
const files = new Map<string, Uint8Array>();
let ttsCalls = 0;
let failTts = false;
const storage: B.Storage = {
  exists: async (k) => files.has(k),
  put: async (k, d) => { files.set(k, d); },
  signedUrl: async (k) => `https://files.test/${k}?token=t`,
};
const tts: B.Tts = async () => { ttsCalls++; await new Promise((r) => setTimeout(r, 40)); if (failTts) throw new Error("service down"); return new Uint8Array(2000).fill(7); };
const settings = (cap: number) => ({ voices: B.DEFAULT_VOICES, dailyCap: cap });
const deps = (cap = 50, text: string | null = "John, chapter 3. For God so loved the world.") => ({ storage, tts, textFor: async () => text, settings: settings(cap) });
const req = (chapter: number, voice = "deep_male") => ({ voice, translation: "kjv", book: "John", chapter });

const r1 = await B.getChapterAudio(db, deps(), req(3));
ok(r1.status === "ready" && !r1.cached && r1.url.includes("v1/deep_male/kjv/John/3"), "first request generates and returns a link");
eq(ttsCalls, 1, "one voice request");
const r2 = await B.getChapterAudio(db, deps(), req(3));
ok(r2.status === "ready" && r2.cached, "second request comes from the cache");
eq(ttsCalls, 1, "...and costs nothing");
eq((await B.getChapterAudio(db, deps(), req(3, "warm_female"))).status, "ready", "another voice is its own chapter");
eq(ttsCalls, 2, "...generated separately");
eq((await B.getChapterAudio(db, deps(), req(3, "nobody"))).status, "error", "an unknown voice is refused");

// two people ask for a new chapter at the same moment: paid once
const [a, b] = await Promise.all([B.getChapterAudio(db, deps(), req(4)), B.getChapterAudio(db, deps(), req(4))]);
eq([a.status, b.status].sort(), ["preparing", "ready"], "one generates, the other is told to wait");
eq(ttsCalls, 3, "the chapter was generated once");
eq((await B.getChapterAudio(db, deps(), req(4))).status, "ready", "afterwards everyone gets it");

// a failure leaves nothing half-done and can be retried
failTts = true;
eq((await B.getChapterAudio(db, deps(), req(5))).status, "error", "a voice-service failure is reported plainly");
eq((await db.query("select status from bible_audio where key = 'v1/deep_male/kjv/John/5'")).rows[0].status, "failed", "recorded as failed");
failTts = false;
eq((await B.getChapterAudio(db, deps(), req(5))).status, "ready", "a failed chapter is retried");
eq((await B.getChapterAudio(db, deps(50, null), req(6))).status, "error", "missing chapter text is an error, not a charge");
eq((await B.getChapterAudio(db, deps(), req(6))).status, "ready", "...and works once the text exists");

// a job left 'generating' for a long time is taken over
await db.query("insert into bible_audio (key, voice, translation, book, chapter, status, updated_at) values ('v1/deep_male/kjv/John/7','deep_male','kjv','John',7,'generating', now() - interval '10 minutes')");
eq((await B.getChapterAudio(db, deps(), req(7))).status, "ready", "a stuck job is taken over");

// the daily cap protects the bill, but never blocks what is already generated
const generated = Number((await db.query("select count(*)::int as n from bible_audio where status <> 'failed'")).rows[0].n);
eq((await B.getChapterAudio(db, deps(generated), req(8))).status, "busy", "at the daily cap, NEW chapters wait until tomorrow");
eq((await B.getChapterAudio(db, deps(generated), req(3))).status, "ready", "...but cached chapters still play");
eq((await B.getChapterAudio(db, deps(0), req(9))).status, "busy", "a cap of 0 pauses all new generation");

// the file vanished from storage: it is rebuilt
files.delete("v1/deep_male/kjv/John/3");
const before = ttsCalls;
eq((await B.getChapterAudio(db, deps(), req(3))).status, "ready", "a missing file is rebuilt");
eq(ttsCalls, before + 1, "...once");

await db.end();
console.log(`bibleAudio: all ${checks} checks passed`);
