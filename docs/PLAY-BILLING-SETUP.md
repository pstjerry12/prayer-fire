# Google Play Billing (Partner and Leader): manual setup and test checklist

Written for the owner, in plain language. The code is done (build 26). These are the steps only you can do in
Play Console, Google Cloud, RevenueCat, Vercel and Supabase, and on a phone. Do them in this order.

## What the system does

- **Android app:** sells **Prayer Fire Partner** and **Fire Partner Leader** only through Google Play. Prices, currency and
  the free-trial wording always come from Google Play, never from the app's code.
- **RevenueCat** (the middleman) verifies every purchase with Google, acknowledges it (so Google never auto-refunds it),
  and receives Google's live notifications (renewals, cancellations, grace period, account hold, expiry, refunds).
  It then calls our server's webhook, and our server saves the result in the `subscriptions` table. That table is the
  single source of truth that unlocks features.
- **Partner:** everything in the paid community (join prayer groups, partner requests, alerts, voice-to-text, priority support).
  **Leader:** everything in Partner, plus **creating and managing prayer groups**. (Partner can join groups but not create them.)
- **Web:** unchanged: a free 7-day trial, no payment. **Donations (Flutterwave):** unchanged, and they unlock nothing.
- **Admin → Pricing** (admin only): edit Google Play prices, make promotional offers, switch Free Premium Mode on and off,
  defer billing, and see a log of every change. The Google Play service account lives only in a Supabase Edge Function
  called `billing-admin`; nothing in the browser ever sees it.

## Names to copy exactly

| What | Value |
|---|---|
| App package | `com.prayerfireaction.prayerfire` |
| Partner subscription ID | `partner_sub`, base plans `partner-monthly` and `partner-yearly` |
| Leader subscription ID | `leader_sub`, base plans `leader-monthly` and `leader-yearly` |
| RevenueCat entitlements | `partner` and `leader` |
| RevenueCat offerings | `partner` (Monthly + Annual) and `leader` (Monthly + Annual) |
| RevenueCat webhook URL | `https://prayer-fire.vercel.app/api/revenuecat/webhook` |
| Supabase Edge Function | `billing-admin` (already deployed) |

Starting prices (you set these in Play Console; the app never hardcodes them):

| Plan | Nigeria | Rest of the world (USD) |
|---|---|---|
| Partner monthly | ₦1,500 | $2.99 |
| Partner yearly ("2 months free") | ₦15,000 | $29.99 |
| Leader monthly | ₦3,000 | $5.99 |
| Leader yearly ("2 months free") | ₦30,000 | $59.99 |

## Already done for you

- The database tables `subscriptions`, `price_changes` and `billing_actions` exist in Supabase (private, no public access).
- The `billing-admin` Edge Function is deployed. It refuses every request until you add its secrets (step 6).

## Step 1. Upload build 26 to a test track first

Google only lets you create subscriptions after an app version that contains billing has been uploaded.

1. Get the file: GitHub → repo `pstjerry12/prayer-fire` → **Actions** → **Android Release Build** → open the newest successful run on the
   branch → download the artifact `prayer-fire-android-run-<number>`. Inside is `app-release.aab` (versionCode 26, name 1.0.25).
   (On your own computer: `bash scripts/build-mobile.sh` makes `android/app/build/outputs/bundle/release/app-release.aab`.)
2. Play Console → **Test and release** → **Testing** → **Closed testing** (your Alpha track) → **Create new release** → upload
   `app-release.aab` → **Save** → **Send for review**. Do NOT put it in Production yet.

## Step 2. Create the two subscriptions in Play Console

Left menu → **Monetize with Play** → **Products** → **Subscriptions** → **Create subscription**.

**Partner**
1. **Product ID:** `partner_sub` (cannot be changed later). **Name:** `Prayer Fire Partner`. Add a short description. Save.
2. **Add a base plan** → ID `partner-monthly` → **Auto-renewing** → billing period **Every 1 month**. Set the prices:
   open **Set prices**, enter **$2.99** for the United States and tap **Convert prices** so Google fills every country, then change
   **Nigeria to ₦1,500**. Also set a **Grace period of 7 days** and **Account hold of 30 days** (these keep access while a payment is retried).
   **Activate**.
3. **Add a base plan** → ID `partner-yearly` → **Auto-renewing** → **Every 1 year** → **$29.99** (US), convert, **Nigeria ₦15,000**, same grace period and hold. **Activate**.
4. On each base plan choose **Add offer** → offer ID `free-trial-7` → eligibility **New customer acquisition** → phase **Free trial, 7 days** → **Activate**.
   (This keeps the current 7-day trial. People who already used a trial are not offered it again; Google decides that.)
5. Make sure the subscription itself shows **Active**.

**Leader:** repeat with product ID `leader_sub`, name `Fire Partner Leader`, base plans `leader-monthly` ($5.99, ₦3,000) and
`leader-yearly` ($59.99, ₦30,000), and the same 7-day trial offers.

## Step 3. Google Cloud service account (for RevenueCat and for the Pricing admin screen)

One service account serves both. RevenueCat's own page walks you through the same steps.

1. Google Cloud Console → pick or create a project → **IAM & Admin** → **Service accounts** → **Create service account** (any name, for example `prayerfire-billing`) →
   **Keys** → **Add key** → **Create new key** → **JSON**. A JSON file downloads. Keep it private. Never commit it or paste it into a chat.
2. In the same project, **APIs & Services** → **Library**: enable **Google Play Android Developer API** and **Google Play Developer Reporting API**.
3. Play Console → **Users and permissions** → **Invite new users** → paste the service account's email address → under **App permissions** add **Prayer Fire** and tick:
   - **View app information and download bulk reports (read-only)**
   - **View financial data, orders and cancellation survey responses**
   - **Manage orders and subscriptions**
   - the permission for **managing products and subscriptions** (called "Create and manage products" or "Manage store presence", depending on your Play Console), which is what lets the Pricing screen change prices and offers.
   Then **Invite user**. If the Pricing screen later says "permission denied", open this service account in Play Console and add the permission the message names.
4. Google can take **up to 36 hours** to accept a new service account. If RevenueCat says "credentials invalid", wait and try again.

## Step 4. RevenueCat

1. Create an account at revenuecat.com → **New project** named `Prayer Fire`.
2. **Apps** → **Add app** → **Play Store** → package `com.prayerfireaction.prayerfire` → upload the JSON key from step 3.
3. **Google's live notifications (the Pub/Sub topic):** in the Play Store app's settings, RevenueCat has a **Connect to Google** / **Google Developer Notifications** section.
   Follow it: it creates the Pub/Sub topic for you and shows its name. Then Play Console → **Monetize with Play** → **Monetization setup** →
   **Real-time developer notifications** → paste the topic name → **Send test notification**. RevenueCat should show "received". This is how renewals, cancellations,
   grace period, account hold, expiry and refunds reach the app automatically. (Google allows only one topic per app, and RevenueCat owns it.)
4. **Products:** import the four Google products: `partner_sub:partner-monthly`, `partner_sub:partner-yearly`, `leader_sub:leader-monthly`, `leader_sub:leader-yearly`. (They appear after step 2 is active.)
5. **Entitlements** → **New** → identifier **`partner`** → attach the two `partner_sub` products. **New** → identifier **`leader`** → attach the two `leader_sub` products.
6. **Offerings** → **New offering** with identifier **`partner`** → add package **Monthly** (`$rc_monthly`) → product `partner_sub:partner-monthly`, and package **Annual** (`$rc_annual`) → `partner_sub:partner-yearly`.
   Create a second offering **`leader`** the same way with the `leader_sub` products. (The app looks the offerings up by these two names.) Make `partner` the current offering.
7. **Project settings** → **API keys**: copy the **Public SDK key for Google** (starts `goog_`), and create a **Secret API key** (v1, starts `sk_`).
8. **Project settings** → **Integrations** → **Webhooks** → **New webhook**: URL `https://prayer-fire.vercel.app/api/revenuecat/webhook`;
   **Authorization header value**: a long random password you invent (at least 32 characters; it is `REVENUECAT_WEBHOOK_AUTH`); environments **Production and Sandbox**; events **all**.

## Step 5. Vercel environment variables

Vercel → project **prayer-fire** → **Settings** → **Environment Variables** → add to **Production** (and Preview if you want to test there):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` | the `goog_...` public key |
| `REVENUECAT_SECRET_API_KEY` | the `sk_...` secret key |
| `REVENUECAT_WEBHOOK_AUTH` | the same password you put in RevenueCat's Authorization header |
| `BILLING_FUNCTIONS_SECRET` | a long random password (at least 32 characters), **the same value as in Supabase (step 6)** |
| `SUPABASE_FUNCTIONS_URL` | optional; only if the function's address ever changes (default `https://ebhlmjryezzxtoymoetn.supabase.co/functions/v1`) |

Then **Deployments** → latest → **⋯** → **Redeploy** (the `NEXT_PUBLIC_` key is read when the site is built). Never put these values in GitHub or in any file.

## Step 6. Supabase secrets for the `billing-admin` function

Supabase → project → **Edge Functions** → **Secrets** (or Project settings → Edge Functions → Secrets) → add:

| Name | Value |
|---|---|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | open the JSON key file and paste its **entire** contents |
| `BILLING_FUNCTIONS_SECRET` | exactly the same password as in Vercel |
| `REVENUECAT_SECRET_API_KEY` | the `sk_...` secret key (used only for deferring billing) |
| `GOOGLE_PLAY_REGIONS_VERSION` | optional; Google's current "regions version" for price updates (default `2022/02`). If a price save says the version is out of date, put the version the message names here. |

## Step 7. Test with a licence tester, before you merge

A licence tester buys with a **test card**: no real money moves, and renewals run every few minutes so you can watch a whole life cycle.

**Set up**
1. Play Console → **Settings** → **License testing** → add the Gmail you use on the test phone → **Save**.
2. That Gmail must also be a tester on your closed track (and have accepted the opt-in link). Install the build from Google Play on that phone (not from a file).
3. Sign in to Prayer Fire on that phone with a normal Prayer Fire account.

**Buying and the life cycle**

| # | Do this | What you should see |
|---|---|---|
| 1 | Partner Network → **Prayer Fire Partner** screen | Two tabs (Partner, Leader). **Yearly** is selected first with the "2 months free" label. Prices are Google's, in your currency; "Start with a 7-day free trial". |
| 2 | Tap **Start free trial**, confirm with the test card | Google's purchase sheet, then "Thank you! Prayer Fire Partner is now active." Partner features unlock. |
| 3 | Check RevenueCat → **Customers** (search your account id) | `partner` active. In Supabase → table `subscriptions`: a row with `status ACTIVE`, `environment SANDBOX`, `period_type TRIAL`. |
| 4 | Prayer Groups | You can join groups. **Create Group** shows a "Leader" tag and opens the plans. |
| 5 | Switch to the **Leader** tab and tap **Upgrade to Leader** | You pay only the difference; Leader unlocks and **Create Group** opens. |
| 6 | Switch back to **Partner** and tap **Switch to Partner at renewal** | Leader stays until the period ends, then Partner begins. |
| 7 | **Manage subscription** | Opens Google Play's subscriptions page. Cancel there: the app shows "Your subscription is cancelled. You keep access until it ends." |
| 8 | Sign in on a second phone (same Prayer Fire account) | Partner/Leader appears at login. **Restore purchases** also works. |
| 9 | Play Console → **Orders** → find the test order → **Refund** | Access is removed within a minute or two (status REFUNDED). |
| 10 | In Play, switch the test card to **"Test card, always declines"** and wait for a renewal | The app shows the payment-problem notice (grace period / on hold). |
| 11 | Wait for a renewal and for expiry | Access ends automatically at the end date. |

**Admin → Pricing**
1. **Prices:** it lists every price from Google. Press **Edit** on one, type a price, press **Preview change**: it must show old → new and whether it is an increase or decrease. **Do not press Apply** until you are happy. For the first real test, change a price by a small amount and put it back (both changes appear in the log).
2. **Offers:** create a draft offer (for example `test-50-off`, 50% off for 1 period). Check in Play Console that it appears as a **Draft**. Activate it, then Deactivate it.
3. **Free Premium Mode:** switch it on with an end date a few minutes ahead and press **Save**. Open the app on another phone: the green "Premium is free for a limited time" strip appears, the subscribe screens are hidden, and **Create Group** opens for everyone. After the end time it switches itself off (the next time the app checks, at most about ten minutes after you reopen it).
4. **Defer billing:** with a licence-tester subscription active, set Free Premium Mode to "Push their next billing date back", tick **Include licence testers**, press **Preview** (it should count 1), then **Defer billing now**. Check RevenueCat → Customers for the new end date. **Test this before using it on real subscribers.**

If anything in the table does not match, stop and tell the assistant what you saw (a screenshot helps) before merging.

## Step 8. Update Play Console declarations

1. **App content** → **Data safety**: add that purchase history is collected (through Google Play and RevenueCat) and that RevenueCat is a service provider. Save and publish.
2. **Privacy policy** (`/privacy` on the site): add a short line that subscriptions are handled by Google Play and RevenueCat, who receive your account id and purchase status. (Ask the assistant to write it.)
3. The in-app purchases answer is now **Yes, the app contains in-app purchases** (subscriptions).

## Step 9. Go to production

Only after step 7 passes: Play Console → **Production** → **Create new release** → **Add from library** → build 26 → release notes → **Next** → **Save** → **Send changes for review**.
When it is live, open the app's Admin → **Settings** → **App Updates** and set the latest Android build to `26`.

## Things to know

- **Free Premium Mode does not pause anyone's payments.** People who already pay are still charged while it is on, unless you use **Defer billing**. The Pricing screen says this in a yellow box. If a deferral fails for someone, that person is still charged, and the result message tells you how many.
- **Price increases** need existing subscribers to accept the new price (Google tells them; anyone who does not accept is cancelled after the notice period). **Decreases** apply to existing subscribers automatically. New subscribers always pay the new price at once.
- **Pub/Sub and purchase verification** are handled by RevenueCat, so there is no Pub/Sub endpoint of our own. RevenueCat does not give out Google's purchase token, so the `subscriptions` table keeps Google's order id (`store_transaction_id`) instead.
- **Deleting an account** removes our copy of the subscription but does not cancel it in Google Play. The person must cancel in Play.
- Edits made in the **Pricing** screen go straight to Google Play. Every change is logged with who made it and when.

## If something goes wrong

- **"Subscriptions are not available in this version yet"** in the app: `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` was not set when the site was built. Add it, then redeploy.
- **"We could not load the subscription options"**: an offering (`partner` or `leader`) is missing or not attached to active products, or the products are not active in Play yet.
- **The purchase worked but nothing unlocks:** check RevenueCat → Webhooks → recent deliveries (should say 200) and that `REVENUECAT_WEBHOOK_AUTH` matches exactly. Tapping **Restore purchases** asks the server to re-check.
- **Admin → Pricing says "Billing admin is not set up yet":** `BILLING_FUNCTIONS_SECRET` is missing in Vercel. **"Not allowed" or a 502:** the secret differs between Vercel and Supabase.
- **Admin → Pricing says "Google sign-in failed" or "permission denied":** check `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and the service account's Play Console permissions (step 3).
- **A person says they were charged and have no access:** ask them to sign in with the same Google account and tap **Restore purchases**; check RevenueCat → Customers.
