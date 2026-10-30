# Google Play Billing (Prayer Fire Partner): manual setup checklist

Written for the owner, in plain language. The code is done (build 26). These are the steps only you can do in
Play Console, RevenueCat, Vercel and on a phone. Do them in this order.

What was built: the Android app sells **Prayer Fire Partner** only through Google Play. RevenueCat is the
middleman that talks to Google. When someone subscribes, RevenueCat tells our server, the server saves it
in the `subscriptions` table, and the app unlocks Partner features. The web keeps its free trial. Donations
(Flutterwave) are untouched.

Names you will use everywhere (copy them exactly):

| What | Value |
|---|---|
| App package | `com.prayerfireaction.prayerfire` |
| Play subscription ID | `prayerfire_partner` |
| Base plan IDs | `monthly` and `yearly` |
| RevenueCat entitlement | `partner` |
| RevenueCat offering | `default` (the current one), with the **Monthly** and **Annual** packages |
| Webhook URL | `https://prayer-fire.vercel.app/api/revenuecat/webhook` |

## Step 1. Upload build 26 to a test track first
Google only lets you create subscriptions after an app version that contains billing has been uploaded.

1. Get the build: GitHub → repo `pstjerry12/prayer-fire` → **Actions** → **Android Release Build** → **Run workflow** (on `main`). When it finishes, open the run and download the artifact `prayer-fire-android-run-<number>`. Inside is `app-release.aab`. (Building on your own computer is `bash scripts/build-mobile.sh`; the file appears under `android/app/build/outputs/bundle/release/app-release.aab`. The GitHub way is easier.)
2. Play Console → **Test and release** → **Testing** → **Closed testing** (your Alpha track) → **Create new release** → upload `app-release.aab` (versionCode 26 / 1.0.25) → **Save** → **Send for review**. Do NOT put it in Production yet.

## Step 2. Create the subscription in Play Console
1. Left menu → **Monetize with Play** → **Products** → **Subscriptions** → **Create subscription**.
2. **Product ID:** `prayerfire_partner` (it can never be changed). **Name:** `Prayer Fire Partner`. Save.
3. **Add a base plan:** ID `monthly`, **Auto-renewing**, billing period **Every 1 month**. Set the price: **$2.99** (US) and tap **Set prices** so Google fills in every country. Open Nigeria and set your Naira price if you do not like the converted one. **Activate**.
4. **Add another base plan:** ID `yearly`, **Auto-renewing**, **Every 1 year**, **$23.99**. Activate.
5. On each base plan choose **Add offer**: a **free trial**, **7 days**, eligibility **New customer acquisition**. Activate the offers.
6. Make sure the subscription itself shows **Active**.

## Step 3. Let RevenueCat talk to Google (service account)
RevenueCat shows these steps itself under *Apps → Play Store app → Service account credentials*. Follow its guided page, in short:
1. Google Cloud Console → create a **service account** (any name, for example `revenuecat`) → **Keys** → **Add key** → **JSON**. A JSON file downloads. Keep it private; never commit it or paste it in chat.
2. In the same Google Cloud project enable the **Google Play Android Developer API** and the **Google Play Developer Reporting API**.
3. Play Console → **Users and permissions** → **Invite new users** → paste the service account's email → give it **View app information**, **View financial data** and **Manage orders and subscriptions** for Prayer Fire → **Invite**.
4. Google can take up to 36 hours to accept the new service account. If RevenueCat says "credentials invalid", wait and try again.

## Step 4. Set up RevenueCat
1. Create an account at revenuecat.com → **New project** named `Prayer Fire`.
2. **Apps** → **Add app** → **Play Store** → package `com.prayerfireaction.prayerfire` → upload the JSON file from Step 3.
3. **Products** → import or add the two Google products: `prayerfire_partner:monthly` and `prayerfire_partner:yearly`. (They only appear after Step 2 is active.)
4. **Entitlements** → **New** → identifier **`partner`** → attach both products.
5. **Offerings** → open **default** (make it the current offering) → add two packages: **Monthly** (`$rc_monthly`) pointing to the monthly product and **Annual** (`$rc_annual`) pointing to the yearly product.
6. **Project settings** → **API keys**:
   - copy the **Public SDK key for Google**; it starts with `goog_`. This is the `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` value.
   - create a **Secret API key** (v1); it starts with `sk_`. This is the `REVENUECAT_SECRET_API_KEY` value. Keep it secret.
7. **Project settings** → **Integrations** → **Webhooks** → **New webhook**:
   - **Webhook URL:** `https://prayer-fire.vercel.app/api/revenuecat/webhook`
   - **Authorization header value:** a long random password you invent (at least 32 characters). Save it somewhere safe; it is `REVENUECAT_WEBHOOK_AUTH`.
   - **Environment:** both Production and Sandbox. **Events:** all.

## Step 5. Add the three environment variables in Vercel
Vercel → project **prayer-fire** → **Settings** → **Environment Variables** → add to **Production** (and Preview if you want to test there):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` | the `goog_...` public key |
| `REVENUECAT_SECRET_API_KEY` | the `sk_...` secret key |
| `REVENUECAT_WEBHOOK_AUTH` | the same password you put in RevenueCat's Authorization header |

Then **Deployments** → the latest one → **⋯** → **Redeploy**. (The `NEXT_PUBLIC_` key is read when the site is built, so it needs a fresh deploy.) Do not put these values in GitHub or in any file.

## Step 6. Check the database table
The `subscriptions` table was created in Supabase by the assistant. To double-check: Supabase → **Table editor** → `subscriptions` should exist (empty).

## Step 7. Test with a licence tester (free, no real money)
1. Play Console → **Settings** → **License testing** → add the Gmail address you use on the test phone → **Save**.
2. That same Gmail must be a tester on your closed track (Step 1) and have accepted the opt-in link. Install the build from Google Play on that phone (not from a file).
3. Open Prayer Fire → sign in → **Partner Network** or **Prayer Groups** → the **Prayer Fire Partner** screen. You should see the monthly and yearly prices and "Start with a 7-day free trial".
4. Tap **Start free trial** → Google's purchase sheet shows a test card ("always approves") → confirm.
5. Within seconds the screen should say you are a Prayer Fire Partner, and Partner features unlock.
6. Check three places: RevenueCat → **Customers** (your account id shows `partner` active); Supabase → `subscriptions` (a row with your user id, `environment = SANDBOX`); and Vercel → **Logs** (no errors from `/api/revenuecat/webhook`).
7. Also test: **Restore purchases**; **Manage subscription** (opens Google Play's subscriptions page); cancelling there (you keep access until the end date); signing out and in again; signing in on a second phone with the same account (Partner should appear).
8. Test subscriptions renew every few minutes for a licence tester, so you can watch a renewal and an expiry happen quickly.

## Step 8. Update the Play Console declarations
1. **App content** → **Data safety**: add that purchase history is collected (through Google Play and RevenueCat) and that RevenueCat is a service provider. Save and publish the change.
2. **Privacy policy** (`/privacy` on the site): add a short line that subscriptions are handled by Google Play and RevenueCat, who receive your account id and purchase status. (Ask the assistant to write it.)
3. If the app's page asks about in-app purchases or ads, the answer is now **Yes, it contains in-app purchases** (subscriptions).

## Step 9. Go to production
Only after Step 7 passes:
1. Play Console → **Production** → **Create new release** → **Add from library** → build 26 → release notes → **Next** → **Save** → **Send changes for review**.
2. When it is live, open the app's Admin → **Settings** → **App Updates** and set the latest Android build to `26`, so testers and users get the update popup.

## If something goes wrong
- **"Subscriptions are not available in this version yet"** in the app: `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` was not set when the site was built. Add it, then redeploy.
- **"We could not load the subscription options"**: the RevenueCat offering is missing, not set as current, or the products are not active in Play yet.
- **The purchase worked but Partner does not unlock**: check the webhook (RevenueCat → Webhooks → recent deliveries shows 200 or an error) and that `REVENUECAT_WEBHOOK_AUTH` matches exactly. Tapping **Restore purchases** asks the server to re-check.
- **A person says they were charged and have no access**: ask them to sign in with the same Google account and tap **Restore purchases**; check RevenueCat → Customers.
