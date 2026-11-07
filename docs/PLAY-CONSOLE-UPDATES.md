# Google Play Console updates needed for the new features

Do these in Play Console **before** you release the new Android build. Answers below match what the app does once Phases 1-11 are live. Re-check each answer against what you actually switch on.

Links to paste:
- Privacy policy: https://prayer-fire.vercel.app/privacy
- Terms: https://prayer-fire.vercel.app/terms
- Community guidelines: https://prayer-fire.vercel.app/community-guidelines
- Account deletion page: https://prayer-fire.vercel.app/delete-account
- Contact: prayerfiremovemnt@gmail.com

## 1. App content > Ads
Click **Policy and programs > App content > Ads** and change the answer to **Yes, my app contains ads** (AdMob banner on the Home screen). Do this once ads are switched on in Admin -> Pricing -> Ads.

## 2. App content > Advertising ID
Answer **Yes, the app uses advertising ID**, purpose **Advertising or marketing**. (AdMob uses it. The app declares the AD_ID permission in its own manifest from build 34 on; older uploaded builds without it show a Play Console error until they are replaced or retired.)

## 3. App content > Data safety
Open **Data safety > Manage** and declare:
- **Personal info:** name, email address, phone number. Collected (account). Not sold. Purpose: account management, app functionality.
- **User-generated content:** prayer group posts, comments, prayer requests (altar requests). Collected and shared with other users in the group or alert.
- **App activity:** prayer streaks, "I am praying" taps, in-app activity. Purpose: app functionality.
- **Device or other IDs:** advertising ID (AdMob). Purpose: advertising. **Shared** with Google (AdMob).
- **App info and performance:** crash logs and diagnostics from Google services, if shown in the form.
- **Financial info:** purchase history handled by Google Play and RevenueCat (subscription status only). No card details are stored by us.
- **Data is encrypted in transit:** Yes.
- **Users can request data deletion:** Yes. Paste the account deletion page above. In the app: Settings > Delete account.

## 4. App content > User-generated content
Prayer groups let people post and comment. Play wants proof of moderation. We have: community guidelines, a Report button on posts, group leaders who can remove or block members, admin approval of every new group, and admin tools. Answer the UGC questions accordingly and link the community guidelines.

## 5. App content > Content rating
Re-do the questionnaire: say users can interact and share content (groups), and the app shows ads. Expect a Everyone / Teen type rating.

## 6. App content > Target audience
Keep it at 13+ / adults. Ads are served with the **General** content rating cap.

## 7. Store listing and subscriptions
- Subscription text must say price, billing period, auto-renewal and how to cancel. The plans screen already shows this and links the Terms.
- Leader **Church** tier (500 members) is marked "coming soon". When you want to sell it, create a new Play subscription and a RevenueCat entitlement first.
- Flutterwave "Partner With Us" donations are voluntary gifts that unlock nothing. They are not on the Android subscription screen.

## 8. Account deletion requirement
Play requires a delete option **in the app and on the web**: Settings > Delete account, and https://prayer-fire.vercel.app/delete-account. Both are live once the legal pull request is merged.
