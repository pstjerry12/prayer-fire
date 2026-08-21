# Prayer Fire Movement — Project Guide

> Read this file FIRST. It tells any developer/assistant everything about this project.

## What this app is
"Prayer Fire Movement" (Pray 3x) — A Cure For Prayerlessness.
Write it. Speak it. Pray it. Trust God. — "Praying like Daniel".

## Live + infra
- Live site: https://prayer-fire.vercel.app
- Admin dashboard: https://prayer-fire.vercel.app/admin
- GitHub: https://github.com/pstjerry12/prayer-fire
- Database: Supabase (PostgreSQL)
- Owner/admin email: prayerfiremovemnt@gmail.com

## Supabase connection string
```
postgresql://postgres.ebhlmjryezzxtoymoetn:PrayerFire2026@aws-0-eu-north-1.pooler.supabase.com:6543/postgres
```
NOTE: password is `PrayerFire2026`. Do NOT change it or the live site breaks.

## Tech stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 (custom dark mode via CSS variables in src/app/globals.css)
- PostgreSQL + Drizzle ORM (schema: src/db/schema.ts)
- Auth: JWT (jose) + bcryptjs + HTTP-only cookie (`pfm_token`) + localStorage backup
- Fonts: Fraunces (headings) + Nunito Sans (body) via next/font
- Icons: lucide-react
- Payments: Paystack inline (donations) — public key NOT configured yet

## Design system
- Light: warm ivory (#faf7f2). Dark ("night mode"): deep navy (#0a1628).
- Moon/sun toggle, persisted in localStorage as `pfm_theme`.
- Accents: emerald (actions/answered), amber (fire/streak/premium), red (intercessory/danger/logo).
- Colors use semantic Tailwind tokens defined in globals.css:
  bg-page, bg-card, bg-card-2, bg-card-3, text-ink, text-ink-soft, text-ink-muted,
  text-ink-faint, border-edge, border-edge-strong, text-acc, bg-acc-soft,
  text-danger, bg-danger-soft, text-warn, bg-warn-soft, etc.

## Pages (11 + admin)
`/` home · `/workshop` · `/startup` · `/groups` · `/worship` · `/schedule` ·
`/partner` (pricing) · `/scripture` · `/bible` · `/fasting` · `/network` · `/admin`

## Architecture
- `src/app/context.tsx` — AppProvider with ALL shared state (prayers, songs, groups,
  messages, auth user, theme, appointments, premium flag, etc). Uses localStorage for persistence.
- `src/app/AppShell.tsx` — wraps everything; renders global modals (AuthModal, PricingPage,
  AccountSettings, PrivacyPolicy, DailyVerse/Wisdom, BottomNav) + SplashScreen + PrayerAlarm + NotificationPermission + ServiceWorkerRegister.
- `src/app/layout.tsx` — fonts, metadata, PWA manifest, theme/splash inline scripts.
- `src/lib/` — auth.ts (JWT), authClient.ts (client API + localStorage session),
  user.ts, adminAuth.ts, adminBootstrap.ts, clientUtils.ts (playChime, playCelebration,
  useSpeechToText), audioStore.ts (IndexedDB songs), alarmSound.ts, paystack.ts, countryCodes.ts.
- `src/app/data/` — bibleVerses.ts (KJV + scripture cards + default categories),
  wisdomData.ts (Pray 3x chapters), pricingPlans.ts (currencies + plans), legal.ts (Terms + Privacy).

## Key features
1. **Auth** — email+phone signup (Nigerian phone fixed: empty phone → null),
   real Google OAuth (`/api/auth/google/start` + `/callback`), password strength meter,
   "I am human" checkbox, Terms & Privacy checkboxes with clickable modals (LegalModal).
   Admin auto-promotion: if email === ADMIN_EMAIL, role becomes "admin".
2. **Prayer Workshop** — Family / Special / Intercessory sessions (dropdown forms).
3. **Start-Up Prayer** — 7-step guided with editable total timer (default 5 min;
   Mercy/Thanks/HolySpirit fixed 30s each, rest shared). Celebration popup + applause sound.
4. **Prayer Reader** — tap a prayer point → large-print modal (Next/Previous/Amen).
5. **Daily Schedule** — 12am/12pm/4am check-ins + phone alarms (NotificationPermission banner,
   PrayerAlarm watcher, sw.js service worker).
6. **Scripture Vault** (5 languages) + **KJV Bible Library** + **Pray 3x wisdom**.
7. **Worship** — upload/play songs (IndexedDB via audioStore.ts).
8. **Fasting tracker** (3/7/21/40 days).
9. **Partner Network** + **Donation card** (Paystack-ready; Naira/Dollar toggle).
10. **Prayer Groups** — WhatsApp-style: 3 admins + members, chat, emergency alerts,
    group prayer time, pinned verse, invite codes. All localStorage.
11. **Admin back office** — stats, users, partner requests (approve/delete), donations.

## Database tables (public schema)
- `users` (id, name, email, phone, country_code, password_hash, provider, role, created_at)
- `partner_requests` (id, name, location, request, prayers, approved, created_at)
- `donations` (id, name, email, amount, currency, reference, status, created_at)

## Environment variables (set in Vercel)
- DATABASE_URL (Supabase, password PrayerFire2026)
- JWT_SECRET
- ADMIN_EMAIL=prayerfiremovemnt@gmail.com
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (NOT set yet — donations show demo fallback until added)

## Deploy / update
```
git add .
git commit -m "update"
git push -u origin main --force
```
Vercel auto-rebuilds (~3 min). The project also ships a `prayer-fire.zip` for manual download.

## Troubleshooting (common past issues)
- Signup 500 "Unable to create account": DATABASE_URL password wrong in Vercel, OR
  Supabase missing `role` column. Run: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';`
- Google sign-in "not configured": GOOGLE_CLIENT_ID/SECRET missing. Redirect URI must be
  `https://prayer-fire.vercel.app/api/auth/google/callback`.
- "Sign Out" missing: it's the ⋮ (3-dots) button in the Navbar (next to logo).

## Owner preferences
- User name: Jerry. Wants simple, step-by-step guidance ("explain like I'm 7").
- Prefers "do it for me" then give 3 push commands.
