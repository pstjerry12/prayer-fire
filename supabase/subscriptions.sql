-- Paid subscriptions (Google Play Billing via RevenueCat) and the admin billing logs.
-- Already applied to production by the assistant. Safe to run again on a NEW database.
-- RLS is ON with no policies: only the server (DATABASE_URL / service role) can read or write these tables.

-- One row per account per plan (partner / leader). Written only by the RevenueCat webhook and the sync route.
-- RevenueCat does not hand out Google's purchase token, so Google's order id is kept in store_transaction_id.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id              text NOT NULL,
  entitlement          text NOT NULL,                    -- partner | leader
  product_id           text,                             -- RevenueCat product id: subscription_id:base_plan_id
  base_plan_id         text,                             -- e.g. partner-monthly
  status               text NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | IN_GRACE | CANCELED | ON_HOLD | EXPIRED | REFUNDED
  store                text,                             -- PLAY_STORE ...
  store_transaction_id text,                             -- Google order id (GPA....)
  period_type          text,                             -- TRIAL | INTRO | NORMAL
  environment          text NOT NULL DEFAULT 'PRODUCTION', -- SANDBOX = a licence tester
  expires_at           timestamptz,                      -- access lasts until this moment
  will_renew           boolean NOT NULL DEFAULT true,
  last_event_at        timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entitlement)
);

-- Every price edit made from Admin → Pricing.
CREATE TABLE IF NOT EXISTS public.price_changes (
  id                  text PRIMARY KEY,
  admin_user_id       text,
  admin_email         text,
  product_id          text NOT NULL,                     -- partner_sub | leader_sub
  base_plan_id        text NOT NULL,
  region_code         text NOT NULL,                     -- NG, US, ... or OTHER_USD / OTHER_EUR
  currency_code       text NOT NULL,
  old_price_micros    text,                              -- price x 1,000,000
  new_price_micros    text NOT NULL,
  applied_to_existing boolean NOT NULL DEFAULT false,
  result              text NOT NULL,                     -- success | error
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Other admin billing actions: deferring billing, Free Premium Mode switches.
CREATE TABLE IF NOT EXISTS public.billing_actions (
  id            text PRIMARY KEY,
  admin_user_id text,
  admin_email   text,
  action        text NOT NULL,                           -- defer_billing | free_mode
  details       jsonb,
  result        text NOT NULL,                           -- success | partial | error
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_changes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_actions ENABLE ROW LEVEL SECURITY;
