# Prayer Fire: post-transfer audit (personal Play account → Nexus Digital Collective Ltd)

Transfer completed: **12 Nov 2026** (requested 8–9 Nov, accepted 10 Nov). The app now lives in the organisation Play Console.

| | Old account | New account |
|---|---|---|
| Name | Prayer Fire Movement (personal) | Nexus Digital Collective (organisation, NEXUS DIGITAL COLLECTIVE LTD) |
| Developer account ID | 7332412495815922552 | **6202479642124337067** |
| Owner sign-in | pstjerryn@gmail.com | nexusdigitalcollectiveltd@gmail.com |
| Payments profile | (personal) | NEXUS DIGITAL COLLECTIVE LTD, ID 0582-9896-6900 (no payout bank yet on 10 Nov) |

Package `com.prayerfireaction.prayerfire` is unchanged (permanent).

## What Google says moves and what does not (Play Console Help, "Transfer apps to a different developer account", read 12 Nov 2026)
- **Moves:** users, statistics, ratings, reviews, **subscriptions**, content ratings, store listing, and every **App content** declaration (data safety, ads, app access, financial features…).
- **Does NOT move:** test groups (internal, closed, open: recreate, testers may need to opt in again); permissions and links of integrated services (service accounts, Firebase, Cloud projects, ad SDKs); bulk/earnings/payout reports; promotions (issued promo codes keep working).
- **Orders before the transfer stay in the old account**: refund those from the old account.
- **Currency:** if the new account's default currency differs, an app with in-app purchases is **unpublished until you check the prices and publish again**.
- **Signing keys:** the app signing key (held by Google) and the upload key stay the same unless you ask for a reset/upgrade.

## Console links
- New account home: https://play.google.com/console/u/0/developers/6202479642124337067/app-list → open Prayer Fire. Its address bar then reads `.../developers/6202479642124337067/app/<APP-ID>/app-dashboard`; copy `<APP-ID>` into the ops notebook. Every app page below is that prefix plus the suffix shown.
- Account-level pages (no app id): `.../developers/6202479642124337067/users-and-permissions`, `.../developers/6202479642124337067/license-testing`, Payments profile via **Settings (gear) → Payments profile**.

## Checklist (healthy state → fix if wrong)
1. **Subscriptions** — app `.../subscriptions` (Monetize with Play → Products → Subscriptions). Healthy: `partner_sub` (base plans `partner-monthly`, `partner-yearly`) and `leader_sub` (`leader-monthly`, `leader-yearly`) all **Active**, NGN 1,500 / 15,000 and 3,000 / 30,000, USD 2.99 / 29.99 and 5.99 / 59.99. Fix: if a base plan is inactive or prices moved to another currency, check prices, Activate, then Save.
2. **App still published** — app `.../app-dashboard` and **Publishing overview**. Healthy: no "unpublished" banner. Fix: if the currency change unpublished it, check prices (step 1) then Publishing overview → Send changes for review / Publish.
3. **RevenueCat / Play API access** — account `.../users-and-permissions`. Healthy: the Google Cloud **service account** used by RevenueCat and the Supabase `billing-admin` function is listed with Prayer Fire and: View app information, View financial data, Manage orders and subscriptions (and Manage store presence/pricing for the admin Pricing screen). It was invited in the OLD account, so it is almost certainly **missing**. Fix: Invite new users → paste the service account email → App permissions → Prayer Fire → tick those → Invite. Then RevenueCat → Prayer Fire project → Play Store app → Service account credentials: **Validate** (allow up to 36 h). The JSON key itself is unchanged; no new key is needed unless RevenueCat still fails.
4. **Real-time notifications (RTDN)** — app `Monetize with Play → Monetization setup`. Healthy: "Real-time developer notifications" topic = the RevenueCat topic (`projects/…/topics/…` shown in RevenueCat), and **Send test notification** turns green in RevenueCat. Fix: paste RevenueCat's topic and save.
5. **End-to-end purchase test** — Settings → **License testing** (`.../license-testing`): add the test Gmail again (list does not move). Buy Partner on that phone (build 34). Healthy: Play shows "test card", RevenueCat customer shows the purchase, app unlocks Partner, `subscriptions` row appears.
6. **Payments profile / payouts** — Settings → Payments profile. Healthy: NEXUS DIGITAL COLLECTIVE LTD, ID 0582-9896-6900, **verified**, a **payout bank account** (USD domiciliary) added and verified. Fix: add the Wema USD account; payouts wait until it is verified.
7. **Trader status** — Settings → Developer account → About you / Trader status (EU DSA). Healthy: "Trader" declared for the company, with company email, phone and registered address. Public listing (checked 12 Nov 2026) already shows NEXUS DIGITAL COLLECTIVE LTD with a Port Harcourt address, the Nexus Gmail and a +234 phone.
8. **App signing** — app `.../keymanagement` (Test and release → App integrity → App signing). Healthy: app signing key "Google Play", **upload key certificate SHA-1 `B5:AC:25:00:ED:5F:E6:59:21:69:1A:C1:DC:4C:34:16:7D:31:B2:EE`** (SHA-256 `C1:0F:CC:B6:67:E6:BC:E7:87:EC:B6:EE:F4:62:54:80:3E:DE:39:29:D5:20:71:F4:D5:C5:CE:20:54:47:75:9D`), the certificate GitHub Actions signed build 34 with (run 61, 7 Nov 2026, CN=Prayer Fire Movement). Fix if different: only then request an upload-key reset. No reset is needed just because of the transfer.
9. **Google sign-in** — Google Cloud console → APIs & Services → Credentials (project that owns the OAuth **Web** client). Prayer Fire signs in through the website in a Chrome Custom Tab, so it uses a **Web** client with redirect `https://prayer-fire.vercel.app/api/auth/google/callback`; it does **not** depend on the app's SHA-1, and the Play transfer does not touch it. Healthy: client exists, redirect URI present, Vercel `GOOGLE_CLIENT_ID` matches. Test: sign in with Google in the app.
10. **Firebase** — none. The app has no `google-services.json`, so there is nothing to relink. (Push notifications need Firebase later.)
11. **AdMob** — AdMob → Apps → Prayer Fire. Healthy: app id `ca-app-pub-4222770426649249~2306815627`, banner unit `ca-app-pub-4222770426649249/8392702667`, store link = `com.prayerfireaction.prayerfire`, app-ads.txt verified. The AdMob account is the owner's own and is independent of the Play account; the ids are in build 34. Optional: Play Console → Setup → Linked services / AdMob to link the new account. Ads stay OFF in Admin until build 34 is live.
12. **App content** — app `.../app-content/summary`. Healthy: every row "Completed": Privacy policy, App access (reviewer login **prayerfire.reviewer@gmail.com**, instructions, password set), Ads (Yes, contains ads, matching build 34 even while switched off), Advertising ID (Yes, Advertising or marketing), Content rating (Everyone), Target audience, Data safety, Financial features, Government apps (No), News (No), Health (No). Fix: open any "Action required" row and resubmit. Note: the public listing (12 Nov) shows **"In-app purchases" but no "Contains ads"**: re-check the Ads answer before ads are switched on.
13. **Store listing** — app `.../main-store-listing` and `.../store-settings`. Check title, short/long text, screenshots, website `https://prayer-fire.vercel.app`, privacy policy URL, contact email (still prayerfiremovemnt@gmail.com) and phone. Decide whether contact email/website should become the Nexus ones.
14. **Release tracks** — app `.../tracks/production`, `.../tracks/closed-testing`, `.../tracks/internal-testing`. Healthy: production release present (public listing shows "Updated on Nov 8, 2026", 10+ downloads), build 34 (1.0.33) rolling out or in review. Test groups did NOT move: recreate the closed-testing tester list (email list) and resend the opt-in link.
15. **Inbox / policy** — app `.../app-dashboard` and Policy status. Healthy: no new policy issues, no "Action required".
16. **Personal data** — public listing → About the developer (checked 12 Nov 2026): shows **NEXUS DIGITAL COLLECTIVE LTD**, nexusdigitalcollectiveltd@gmail.com, a Port Harcourt (Rivers) address and a +234 phone. Confirm that address is the company's registered/office address, not a home. The listing's "App support" still shows the support Gmail and the same phone. The old personal account keeps its own profile: remove its trader/address details or close it once nothing is left in it (Google refunds the old registration fee on request).

## Needs a build or code change?
- **No new Android build is needed for the transfer itself** (package, signing, AdMob ids, Google sign-in, RevenueCat keys all unchanged). Ship build 34 as planned.
- **Web text (no build):** the privacy policy (`src/app/data/legal.ts`) and the About page (`about.operatedBy` in `locales/*.json`) still say the app is operated by "Prayer Fire Movement". Change to NEXUS DIGITAL COLLECTIVE LTD when the owner confirms the wording.
- Everything else is console configuration.
