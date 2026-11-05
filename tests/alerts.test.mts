// Global Prayer Alerts, tested against a real Postgres (the same variable as the groups tests).
//   GROUPS_TEST_DATABASE_URL=postgres://postgres@localhost/pftest node --experimental-strip-types tests/alerts.test.mts
// Skipped (exit 0) when the variable is not set. The database must already contain supabase/alerts.sql.
import assert from "node:assert/strict";
import pg from "pg";
import * as A from "../src/lib/alerts.ts";

const url = process.env.GROUPS_TEST_DATABASE_URL;
if (!url) {
  console.log("alerts tests skipped: set GROUPS_TEST_DATABASE_URL to run them");
  process.exit(0);
}
const db = new pg.Pool({ connectionString: url });
let checks = 0;
const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };
const ok = (c: unknown, m: string) => { assert.ok(c, m); checks++; };
const fails = async (p: Promise<unknown>) => { try { await p; return "no error"; } catch (e) { return (e as Error).message; } };

// pure helpers
eq(A.cleanList(" a \n\n b ", 5, 10), ["a", "b"], "a text block becomes a list");
eq(A.cleanList(["x".repeat(500), 5, "y"], 5, 4), ["xxxx", "y"], "long items are cut, non-text dropped");
eq(A.cleanList(new Array(30).fill("z"), 3, 10).length, 3, "the list is capped");
eq(A.countryFromHeader("ng"), "NG", "country code is upper-cased");
eq(A.countryFromHeader("Nigeria"), "XX", "odd values mean unknown");
eq(A.countryFromHeader(null), "XX", "missing means unknown");

await db.query("truncate global_alerts cascade; truncate alert_requests");

// admin posts an alert
const id = await A.createAlert(db, { title: "Pray for the church in Nigeria", summary: "Attacks on villages", scriptures: ["Psalm 91:1-2", " "], points: "Protection\nComfort for families", country: "Nigeria" }, { pinned: true });
eq((await A.listLive(db, "u1")).map((a) => a.id), [id], "a live alert is listed");
const d0 = (await A.getAlert(db, id, "u1"))!;
eq(d0.scriptures, ["Psalm 91:1-2"], "scriptures cleaned");
eq(d0.points, ["Protection", "Comfort for families"], "prayer points cleaned");
ok(d0.pinned && d0.country === "Nigeria" && d0.praying === 0 && !d0.iAmPraying, "fresh alert");
eq(await fails(A.createAlert(db, { title: "x" })), "Give the alert a title (at least 3 letters).", "a title is required");

// "I'm praying": once per person, with countries
eq(await A.pray(db, id, "u1", "NG"), true, "first tap counts");
eq(await A.pray(db, id, "u1", "GB"), false, "a second tap by the same person does not count");
eq(await A.pray(db, id, "u2", "GB"), true, "another person counts");
eq(await A.pray(db, id, "u3", "NG"), true, "third person");
eq(await A.pray(db, id, "u4", "weird"), true, "an unknown country still counts as praying");
const d1 = (await A.getAlert(db, id, "u1"))!;
ok(d1.praying === 4 && d1.countries === 2 && d1.iAmPraying, "counter: 4 praying from 2 countries (unknown not counted as a country)");
eq(d1.topCountries, [{ code: "GB", count: 1 }, { code: "NG", count: 2 }].sort((a, b) => b.count - a.count), "top countries, most first");
eq((await A.getAlert(db, id, "zz"))!.iAmPraying, false, "iAmPraying is per person");

// updates and testimonies
await A.addUpdate(db, id, "update", "Villagers are safe for now");
await A.addUpdate(db, id, "testimony", "A family was rescued");
eq((await A.getAlert(db, id, null))!.updates.map((u) => u.kind).sort(), ["testimony", "update"], "updates and testimonies are shown");
eq(await fails(A.addUpdate(db, id, "update", " ")), "Write the update first.", "an empty update is refused");
eq(await fails(A.addUpdate(db, "nope", "update", "hello")), "That alert no longer exists.", "an update needs a real alert");

// draft and ended
const draft = await A.createAlert(db, { title: "Draft alert" }, { status: "draft" });
eq((await A.listLive(db, null)).map((a) => a.id), [id], "a draft is not listed");
eq(await A.getAlert(db, draft, null), null, "a draft cannot be opened by the public");
ok(await A.getAlert(db, draft, null, true), "...but the admin can");
eq(await A.pray(db, draft, "u1", "NG"), false, "nobody can pray on a draft");
await A.setStatus(db, id, "ended");
eq((await A.listLive(db, null)).length, 0, "an ended alert leaves the live list");
eq(await A.pray(db, id, "u9", "NG"), false, "an ended alert takes no more taps");
ok((await A.getAlert(db, id, null))!.praying === 4, "...but still shows who prayed");
await A.setStatus(db, id, "live");
await db.query("update global_alerts set ends_at = now() - interval '1 minute' where id = $1", [id]);
eq((await A.listLive(db, null)).length, 0, "an alert past its end date is no longer live");
await db.query("update global_alerts set ends_at = null where id = $1", [id]);

// admin edit
await A.updateAlert(db, id, { title: "Pray for Nigeria", summary: "Updated", scriptures: ["Isaiah 41:10"], points: ["Peace"], country: "", status: "live", pinned: false });
const d2 = (await A.getAlert(db, id, null))!;
ok(d2.title === "Pray for Nigeria" && d2.country === null && !d2.pinned && d2.praying === 4, "an edit keeps the people who prayed");
eq(await fails(A.updateAlert(db, "nope", { title: "Whatever" })), "That alert no longer exists.", "editing a missing alert");

// leaders' public altars need approval
const r1 = await A.requestAltar(db, "L1", "Lydia Leader", { title: "Altar for Kenya", summary: "Floods", scriptures: "Psalm 46:1", points: ["Pray for rescue"], country: "Kenya" });
eq((await A.listLive(db, null)).some((a) => a.title === "Altar for Kenya"), false, "a request is not public yet");
eq((await A.myRequests(db, "L1"))[0].status, "pending", "the leader sees it waiting");
await A.requestAltar(db, "L1", "Lydia Leader", { title: "Second altar" });
await A.requestAltar(db, "L1", "Lydia Leader", { title: "Third altar" });
eq(await fails(A.requestAltar(db, "L1", "Lydia Leader", { title: "Fourth altar" })), "You already have 3 altars waiting for approval. Please wait for them to be reviewed.", "at most 3 waiting");
await A.decideRequest(db, r1, true, "");
const pub = (await A.listLive(db, null)).find((a) => a.title === "Altar for Kenya")!;
ok(pub && pub.source === "leader" && pub.authorName === "Lydia Leader", "approved: a public alert by that leader");
eq((await A.myRequests(db, "L1")).find((r) => r.id === r1)!.alertId, pub.id, "the request points to its alert");
eq(await fails(A.decideRequest(db, r1, true, "")), "That request was already handled or no longer exists.", "decided once");
const r2 = (await A.listRequests(db))[0].id;
await A.decideRequest(db, r2, false, "Please add a Bible verse");
const declined = (await A.myRequests(db, "L1")).find((r) => r.id === r2)!;
ok(declined.status === "rejected" && declined.note === "Please add a Bible verse", "declined with a note the leader can read");
eq((await A.listLive(db, null)).filter((a) => a.source === "leader").length, 1, "a declined altar never goes public");

// delete cascades
await A.deleteAlert(db, id);
eq((await db.query("select count(*)::int as n from alert_praying where alert_id = $1", [id])).rows[0].n, 0, "deleting an alert removes its taps");
eq((await db.query("select count(*)::int as n from alert_updates where alert_id = $1", [id])).rows[0].n, 0, "...and its updates");

await db.end();
console.log(`alerts: all ${checks} checks passed`);
