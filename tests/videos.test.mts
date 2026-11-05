// Admin-managed YouTube videos. The pure parts always run; the database part runs when GROUPS_TEST_DATABASE_URL is set
// (the same real Postgres as the groups tests, with supabase/videos.sql loaded). YouTube is faked: no network is used.
import assert from "node:assert/strict";
import pg from "pg";
import * as V from "../src/lib/videos.ts";

let checks = 0;
const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };
const ok = (c: unknown, m: string) => { assert.ok(c, m); checks++; };
const fails = async (p: Promise<unknown>) => { try { await p; return "no error"; } catch (e) { return (e as Error).message; } };

// ── links ───────────────────────────────────────────────────────────────────
const A = "dQw4w9WgXcQ";
const B = "9bZkp7q19f0";
eq(V.parseLinks(`https://www.youtube.com/watch?v=${A}\nhttps://youtu.be/${B}?t=5`), [A, B], "watch and youtu.be links");
eq(V.parseLinks(`https://youtube.com/shorts/${A} https://m.youtube.com/live/${B}`), [A, B], "shorts and live links on one line");
eq(V.parseLinks(`${A}\n${A}\nhttps://youtu.be/${A}`), [A], "repeats are dropped");
eq(V.parseLinks("hello https://example.com/watch?v=dQw4w9WgXcQ not-a-link"), [], "other sites and junk are ignored");
eq(V.parseLinks(""), [], "nothing pasted");
eq(V.thumbnailUrl(A), `https://i.ytimg.com/vi/${A}/hqdefault.jpg`, "thumbnail from the id");
ok(V.embedUrl(A).startsWith("https://www.youtube-nocookie.com/embed/" + A), "privacy-friendly embed");

// ── which feature a page belongs to ─────────────────────────────────────────
eq(V.featureForPath("/"), "home", "home");
eq(V.featureForPath("/bible"), "bible", "bible");
eq(V.featureForPath("/bible/verse/JHN/3/16"), "bible", "a page inside the Bible");
eq(V.featureForPath("/groups/"), "groups", "trailing slash");
eq(V.featureForPath("/admin"), null, "no tutorial for admin");
eq(V.featureForPath("/schedule?x=1"), "alarms", "query string ignored");

// ── titles from YouTube (faked) ─────────────────────────────────────────────
const fakeYT = (known: Record<string, { title: string; author_name: string }>): typeof fetch =>
  (async (input: unknown) => {
    const u = new URL(String(input));
    const id = new URL(u.searchParams.get("url")!).searchParams.get("v")!;
    const hit = known[id];
    return hit ? new Response(JSON.stringify(hit), { status: 200 }) : new Response("Not Found", { status: 404 });
  }) as typeof fetch;
const yt = fakeYT({ [A]: { title: "How to use Prayer Fire", author_name: "Prayer Fire" }, [B]: { title: "Weekly teaching", author_name: "Pastor Jerry" } });
eq(await V.fetchYouTubeInfo(A, yt), { title: "How to use Prayer Fire", channel: "Prayer Fire" }, "title and channel");
eq(await V.fetchYouTubeInfo("zzzzzzzzzzz", yt), null, "unknown video");
eq(await V.fetchYouTubeInfo(A, (async () => { throw new Error("offline"); }) as unknown as typeof fetch), null, "offline gives null, not a crash");

const url = process.env.GROUPS_TEST_DATABASE_URL;
if (!url) {
  console.log(`videos (no database): all ${checks} checks passed; database checks skipped (set GROUPS_TEST_DATABASE_URL)`);
  process.exit(0);
}
const db = new pg.Pool({ connectionString: url });
await db.query("truncate videos");

eq(await fails(V.addLinks(db, "nothing here", "podcast", null, yt)), "Paste at least one YouTube link.", "needs a link");
eq(await fails(V.addLinks(db, A, "tutorial", null, yt)), "Choose which feature the tutorial explains.", "a tutorial needs a feature");
eq(await fails(V.addLinks(db, A, "tutorial", "nonsense", yt)), "Choose which feature the tutorial explains.", "an unknown feature is refused");
const r1 = await V.addLinks(db, `${A}\nzzzzzzzzzzz`, "tutorial", "bible", yt);
eq(r1.added.map((v) => v.title), ["How to use Prayer Fire"], "the title is fetched and saved");
eq(r1.skipped.map((s) => s.input), ["zzzzzzzzzzz"], "a video YouTube cannot find is skipped with a reason");
ok(r1.added[0].feature === "bible" && r1.added[0].channel === "Prayer Fire" && r1.added[0].kind === "tutorial", "feature, channel and kind");
eq((await V.addLinks(db, A, "tutorial", "bible", yt)).skipped[0].reason, "Already added.", "the same video twice as a tutorial");
eq((await V.addLinks(db, A, "podcast", null, yt)).added.length, 1, "...but it may also be a podcast episode");
await V.addLinks(db, B, "podcast", null, yt);

eq((await V.listPublic(db, { kind: "podcast" })).map((v) => v.youtubeId), [B, A], "podcast: newest first");
eq((await V.listPublic(db, { kind: "tutorial" })).length, 1, "tutorials listed");
eq((await V.listPublic(db, { feature: "bible" })).map((v) => v.kind), ["tutorial"], "the tutorial for one feature");
eq((await V.listPublic(db, { feature: "groups" })), [], "no tutorial for another feature");

// unpublish, rename, delete
const id = r1.added[0].id;
await V.updateVideo(db, id, { published: false });
eq((await V.listPublic(db, { kind: "tutorial" })).length, 0, "an unpublished video is hidden from the app");
eq((await V.listAll(db)).filter((v) => v.kind === "tutorial").length, 1, "...but the admin still sees it");
await V.updateVideo(db, id, { published: true, title: "  Using the Bible  ", feature: "study" });
const upd = (await V.listPublic(db, { feature: "study" }))[0];
ok(upd && upd.title === "Using the Bible", "rename and move to another feature");
eq(await fails(V.updateVideo(db, id, { title: " " })), "Give the video a title.", "empty title refused");
eq(await fails(V.updateVideo(db, "nope", { title: "Hello" })), "That video no longer exists.", "missing video");
await V.deleteVideo(db, id);
eq((await V.listAll(db)).filter((v) => v.kind === "tutorial").length, 0, "deleted");

// tutorials come in "How to use" order, whatever order they were added in
await V.addLinks(db, B, "tutorial", "groups", yt);
await V.addLinks(db, A, "tutorial", "startup", yt);
eq((await V.listPublic(db, { kind: "tutorial" })).map((v) => v.feature), ["startup", "groups"], "tutorials follow the order of the feature list");

await db.end();
console.log(`videos: all ${checks} checks passed`);
