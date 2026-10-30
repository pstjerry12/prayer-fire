-- Paid "Prayer Fire Partner" subscription state (Google Play Billing via RevenueCat).
-- Run once in Supabase → SQL Editor (already applied to production by the assistant).
-- RLS is ON with no policies: only the server (DATABASE_URL) can read or write this table.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id       text PRIMARY KEY,
  entitlement   text NOT NULL DEFAULT 'partner',
  product_id    text,
  store         text,
  period_type   text,
  environment   text NOT NULL DEFAULT 'PRODUCTION',
  expires_at    timestamptz,
  will_renew    boolean NOT NULL DEFAULT true,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
