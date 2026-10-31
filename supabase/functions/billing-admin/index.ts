// Supabase Edge Function "billing-admin": the only place that holds the Google Play service account.
// It is called by the app's own server (src/app/api/admin/billing), never by browsers, and only with the shared
// secret in the x-billing-secret header. The app server has already checked that the caller is an admin.
//
// Actions (POST JSON, { action, ... }):
//   pricing.list      read every subscription, base plan and regional price from Google Play
//   pricing.preview   show what a price change would do (old price, new price, increase or decrease)
//   pricing.update    change one regional price in Google Play, confirm it saved, log it
//   offers.list       list the promotional offers on every base plan (draft, active, inactive)
//   offers.create     create a promotional offer as a DRAFT (nobody sees it yet)
//   offers.activate   make a draft or inactive offer available to new subscribers
//   offers.deactivate stop offering it to new subscribers (people who have it keep it)
//   defer.preview     count the subscribers whose billing could be deferred
//   defer.run         push each eligible subscriber's next billing date forward (through RevenueCat)
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  the service account key (the whole JSON file)
//   BILLING_FUNCTIONS_SECRET          long random password, the same value as in Vercel
//   REVENUECAT_SECRET_API_KEY         RevenueCat secret API key (sk_...), only needed for defer.run
//   GOOGLE_PLAY_REGIONS_VERSION       optional; Google's regions version for price updates (default 2022/02)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  migratePricesBody,
  parsePriceInput,
  planDefer,
  planOffer,
  planPriceUpdate,
  readPrice,
  summarizeOffer,
  summarizeSubscription,
  validateOfferSpec,
  type OfferSpec,
  type PlaySubscription,
  type SubscriberRow,
} from "./pricing.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const PACKAGE = "com.prayerfireaction.prayerfire";
const SUBSCRIPTION_IDS = ["partner_sub", "leader_sub"];
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3";

const db = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v)), { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// ── Google authentication (service account → access token) ───────────────────

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set in Supabase secrets.");
  const key = JSON.parse(raw) as { client_email: string; private_key: string };
  const pem = key.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: key.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000 })
  )}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in failed: ${data.error_description ?? data.error ?? res.status}`);
  return data.access_token as string;
}

async function play(path: string, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
  const token = await googleAccessToken();
  const res = await fetch(`${PLAY_API}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Google Play said: ${data?.error?.message ?? res.status}`);
  return data;
}

const getSubscription = (productId: string) => play(`/applications/${PACKAGE}/subscriptions/${productId}`) as Promise<PlaySubscription>;

// ── Actions ──────────────────────────────────────────────────────────────────

interface Admin {
  id?: string;
  email?: string;
}

async function pricingList() {
  const products = [];
  for (const productId of SUBSCRIPTION_IDS) {
    try {
      products.push(summarizeSubscription(await getSubscription(productId)));
    } catch (err) {
      products.push({ productId, basePlans: [], error: (err as Error).message });
    }
  }
  return { products };
}

function parseChange(body: Record<string, unknown>) {
  const priceMicros = typeof body.price === "string" ? parsePriceInput(body.price) : null;
  if (priceMicros === null) throw new Error("Enter the new price as a plain number, for example 1500 or 2.99.");
  if (!SUBSCRIPTION_IDS.includes(String(body.productId))) throw new Error("Unknown subscription.");
  return { productId: String(body.productId), basePlanId: String(body.basePlanId), regionCode: String(body.regionCode), newPriceMicros: priceMicros };
}

async function pricingPreview(body: Record<string, unknown>) {
  const c = parseChange(body);
  const plan = planPriceUpdate(await getSubscription(c.productId), c);
  return {
    productId: c.productId,
    basePlanId: plan.basePlanId,
    regionCode: plan.regionCode,
    currencyCode: plan.currencyCode,
    oldPriceMicros: plan.oldPriceMicros,
    newPriceMicros: plan.newPriceMicros,
    direction: plan.direction,
  };
}

async function pricingUpdate(body: Record<string, unknown>, admin: Admin) {
  const c = parseChange(body);
  const applyToExisting = body.applyToExisting === true;
  const regionsVersion = Deno.env.get("GOOGLE_PLAY_REGIONS_VERSION") ?? "2022/02";
  const supabase = db();
  const log = (fields: Record<string, unknown>) =>
    supabase.from("price_changes").insert({
      id: crypto.randomUUID(),
      admin_user_id: admin.id ?? null,
      admin_email: admin.email ?? null,
      product_id: c.productId,
      base_plan_id: c.basePlanId,
      region_code: c.regionCode,
      new_price_micros: c.newPriceMicros.toString(),
      applied_to_existing: applyToExisting,
      ...fields,
    });

  let plan: ReturnType<typeof planPriceUpdate> | null = null;
  try {
    plan = planPriceUpdate(await getSubscription(c.productId), c);
    if (plan.direction === "same") throw new Error("That is already the current price. Nothing to change.");

    await play(`/applications/${PACKAGE}/subscriptions/${c.productId}?updateMask=basePlans&regionsVersion.version=${encodeURIComponent(regionsVersion)}`, {
      method: "PATCH",
      body: plan.patchBody,
    });

    // Do not trust the PATCH answer alone: read it back and make sure Google really holds the new price.
    const after = await getSubscription(c.productId);
    if (readPrice(after, c.basePlanId, c.regionCode) !== c.newPriceMicros) throw new Error("Google accepted the request but the price did not change. Check Play Console.");

    let migration: string | null = null;
    if (applyToExisting && c.regionCode !== "OTHER_USD" && c.regionCode !== "OTHER_EUR") {
      await play(`/applications/${PACKAGE}/subscriptions/${c.productId}/basePlans/${c.basePlanId}:migratePrices`, {
        method: "POST",
        body: migratePricesBody(c.regionCode, regionsVersion, new Date(), plan.direction === "increase"),
      });
      migration = plan.direction === "increase" ? "Existing subscribers were asked to accept the new price." : "Existing subscribers were moved to the lower price.";
    }

    await log({ currency_code: plan.currencyCode, old_price_micros: plan.oldPriceMicros.toString(), result: "success" });
    return { ok: true, direction: plan.direction, currencyCode: plan.currencyCode, oldPriceMicros: plan.oldPriceMicros, newPriceMicros: plan.newPriceMicros, migration };
  } catch (err) {
    await log({
      currency_code: plan?.currencyCode ?? "?",
      old_price_micros: plan ? plan.oldPriceMicros.toString() : null,
      result: "error",
      error_message: (err as Error).message,
    });
    throw err;
  }
}

// ── Promotional offers ───────────────────────────────────────────────────────

function offerTarget(body: Record<string, unknown>) {
  if (!SUBSCRIPTION_IDS.includes(String(body.productId))) throw new Error("Unknown subscription.");
  const basePlanId = String(body.basePlanId ?? "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(basePlanId)) throw new Error("Unknown base plan.");
  return { productId: String(body.productId), basePlanId };
}

async function logAction(action: string, admin: Admin, details: Record<string, unknown>, result: string) {
  await db().from("billing_actions").insert({ id: crypto.randomUUID(), admin_user_id: admin.id ?? null, admin_email: admin.email ?? null, action, details, result });
}

async function offersList() {
  const offers = [];
  const problems: string[] = [];
  for (const productId of SUBSCRIPTION_IDS) {
    try {
      const sub = await getSubscription(productId);
      for (const bp of sub.basePlans ?? []) {
        const res = (await play(`/applications/${PACKAGE}/subscriptions/${productId}/basePlans/${bp.basePlanId}/offers?pageSize=100`)) as { subscriptionOffers?: Record<string, unknown>[] };
        for (const offer of res.subscriptionOffers ?? []) offers.push(summarizeOffer({ ...offer, productId, basePlanId: bp.basePlanId }));
      }
    } catch (err) {
      problems.push(`${productId}: ${(err as Error).message}`);
    }
  }
  return { offers, problems };
}

async function offersCreate(body: Record<string, unknown>, admin: Admin) {
  const { productId, basePlanId } = offerTarget(body);
  const spec = { offerId: String(body.offerId ?? ""), kind: body.kind, percentOff: Number(body.percentOff), periods: Number(body.periods), days: Number(body.days) } as OfferSpec;
  validateOfferSpec(spec);
  const regionsVersion = Deno.env.get("GOOGLE_PLAY_REGIONS_VERSION") ?? "2022/02";
  const details = { productId, basePlanId, offerId: spec.offerId, kind: spec.kind, percentOff: spec.percentOff, periods: spec.periods, days: spec.days };
  try {
    const sub = await getSubscription(productId);
    const basePlan = (sub.basePlans ?? []).find((b) => b.basePlanId === basePlanId);
    if (!basePlan) throw new Error(`Base plan "${basePlanId}" was not found in ${productId}.`);
    const offerBody = planOffer(PACKAGE, productId, basePlan, spec);
    const created = (await play(
      `/applications/${PACKAGE}/subscriptions/${productId}/basePlans/${basePlanId}/offers?offerId=${encodeURIComponent(spec.offerId)}&regionsVersion.version=${encodeURIComponent(regionsVersion)}`,
      { method: "POST", body: offerBody }
    )) as Record<string, unknown>;
    await logAction("offer_create", admin, details, "success");
    return { ok: true, offer: summarizeOffer({ ...created, productId, basePlanId }) };
  } catch (err) {
    await logAction("offer_create", admin, { ...details, error: (err as Error).message }, "error");
    throw err;
  }
}

async function offersSetState(body: Record<string, unknown>, admin: Admin, state: "activate" | "deactivate") {
  const { productId, basePlanId } = offerTarget(body);
  const offerId = String(body.offerId ?? "");
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(offerId)) throw new Error("Unknown offer.");
  const details = { productId, basePlanId, offerId };
  try {
    const offer = (await play(`/applications/${PACKAGE}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${offerId}:${state}`, { method: "POST", body: {} })) as Record<string, unknown>;
    await logAction(`offer_${state}`, admin, details, "success");
    return { ok: true, offer: summarizeOffer({ ...offer, productId, basePlanId }) };
  } catch (err) {
    await logAction(`offer_${state}`, admin, { ...details, error: (err as Error).message }, "error");
    throw err;
  }
}

async function loadSubscribers(): Promise<SubscriberRow[]> {
  const { data, error } = await db().from("subscriptions").select("user_id,entitlement,product_id,store,status,environment,expires_at,will_renew");
  if (error) throw new Error(`Could not read subscribers: ${error.message}`);
  return (data ?? []) as SubscriberRow[];
}

async function deferPreview(body: Record<string, unknown>) {
  const { targets, skipped } = planDefer(await loadSubscribers(), Number(body.days), new Date(), body.includeSandbox === true);
  return { eligible: targets.length, skipped, days: Number(body.days) };
}

async function deferRun(body: Record<string, unknown>, admin: Admin) {
  if (body.confirm !== true) throw new Error("Deferring billing must be confirmed.");
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY is not set in Supabase secrets.");
  const days = Number(body.days);
  const { targets, skipped } = planDefer(await loadSubscribers(), days, new Date(), body.includeSandbox === true);
  const supabase = db();
  const failed: { userId: string; error: string }[] = [];
  let done = 0;
  for (const t of targets) {
    try {
      // RevenueCat wants the Google subscription id only (partner_sub), and works out the new end date itself.
      const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(t.userId)}/subscriptions/${encodeURIComponent(t.subscriptionId)}/defer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ extend_by_days: days }),
      });
      if (!res.ok) throw new Error(`RevenueCat said ${res.status}: ${(await res.text()).slice(0, 200)}`);
      // RevenueCat sends no webhook for a deferral, so keep our own copy in step from its answer.
      const answer = (await res.json().catch(() => null)) as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> } } | null;
      const newEnd = answer?.subscriber?.entitlements?.[t.entitlement]?.expires_date;
      await supabase
        .from("subscriptions")
        .update({ expires_at: newEnd ? new Date(newEnd).toISOString() : new Date(t.newExpiryMs).toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", t.userId)
        .eq("entitlement", t.entitlement);
      done++;
    } catch (err) {
      failed.push({ userId: t.userId, error: (err as Error).message });
    }
  }
  await supabase.from("billing_actions").insert({
    id: crypto.randomUUID(),
    admin_user_id: admin.id ?? null,
    admin_email: admin.email ?? null,
    action: "defer_billing",
    details: { days, eligible: targets.length, done, skipped, failed: failed.length, includeSandbox: body.includeSandbox === true },
    result: failed.length === 0 ? "success" : done === 0 ? "error" : "partial",
  });
  return { done, skipped, failed };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const expected = Deno.env.get("BILLING_FUNCTIONS_SECRET");
  if (!expected) return json({ error: "BILLING_FUNCTIONS_SECRET is not set." }, 503);
  if (!timingSafeEqual(req.headers.get("x-billing-secret") ?? "", expected)) return json({ error: "Not allowed." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const admin = (body.admin ?? {}) as Admin;

  try {
    switch (body.action) {
      case "pricing.list":
        return json(await pricingList());
      case "pricing.preview":
        return json(await pricingPreview(body));
      case "pricing.update":
        return json(await pricingUpdate(body, admin));
      case "offers.list":
        return json(await offersList());
      case "offers.create":
        return json(await offersCreate(body, admin));
      case "offers.activate":
        return json(await offersSetState(body, admin, "activate"));
      case "offers.deactivate":
        return json(await offersSetState(body, admin, "deactivate"));
      case "defer.preview":
        return json(await deferPreview(body));
      case "defer.run":
        return json(await deferRun(body, admin));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
