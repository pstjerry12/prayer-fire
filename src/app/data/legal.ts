export interface LegalSection {
  title: string;
  /** A paragraph. */
  body?: string;
  /** Bullet points shown under the paragraph. */
  bullets?: string[];
}

/** Shown on every legal page. Change it here whenever the text below changes (do not use today's date: it must stay fixed). */
export const LEGAL_UPDATED = '5 November 2026';
export const CONTACT_EMAIL = 'prayerfiremovemnt@gmail.com';
export const DELETE_ACCOUNT_PATH = '/delete-account';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using Prayer Fire ("the Service"), you agree to these Terms of Service, our Privacy Policy and our Community Guidelines. If you do not agree, please do not use the Service.',
  },
  {
    title: '2. Nature of the Service',
    body: 'Prayer Fire is a faith-based spiritual wellness application. The Service provides prayer planning tools, alarms, scripture content, audio Bible, fasting trackers, prayer groups and community features. The Service does not provide medical, psychological, financial, legal, or other professional advice, and it is not an emergency service. In an emergency, contact your local emergency services.',
  },
  {
    title: '3. Your Account',
    body: 'You are responsible for keeping your password confidential and for all activity under your account. You agree to provide accurate information and to tell us immediately of any unauthorized use. You must be at least 13 years old to use the Service. You can delete your account at any time (see section 12).',
  },
  {
    title: '4. Plans: Free, Partner and Leader',
    body: 'Most of Prayer Fire is free. Prayer Fire Partner and Prayer Fire Leader are optional paid subscriptions that add features, such as no ads, premium Bible voices and, for Leaders, opening and managing prayer groups. The features of each plan are shown on the Plans page and may change over time; we will not remove a feature you have paid for during a period you have already paid for.',
  },
  {
    title: '5. Subscriptions and billing (Android app)',
    bullets: [
      'Subscriptions are bought through Google Play. The price, currency and any free trial are shown by Google Play before you confirm. Payment is charged to your Google Play account.',
      'Subscriptions renew automatically at the end of each period (monthly or yearly) until you cancel. If you start with a free trial, you are charged when the trial ends unless you cancel before then.',
      'To cancel, open Google Play, then Payments & subscriptions, then Subscriptions, choose Prayer Fire and tap Cancel. You keep your plan until the end of the period you have already paid for. Deleting the app or your Prayer Fire account does NOT cancel a Google Play subscription: cancel it in Google Play.',
      'Refunds are handled by Google Play under its refund policy. If Google refunds a purchase, the plan ends.',
      'Members who join a prayer group do not pay. Only the Leader who opens and manages a group subscribes.',
    ],
  },
  {
    title: '6. Privacy of Your Prayer Content',
    body: 'Your private prayer points and personal notes are stored on your own device and are not publicly shared. If you are signed in, some content you choose to use online (for example sermon notes you back up, or intercessory prayers) is stored on our servers, private to your account. Content you choose to publish (prayer requests, testimonies, group posts and comments) is visible to other users as described in our Privacy Policy.',
  },
  {
    title: '7. Community content and moderation',
    body: 'Prayer groups, prayer requests, testimonies and comments are user-generated content. You are responsible for what you post. Group leaders and Prayer Fire may hide or remove content, remove or block members, and suspend or end accounts that break these Terms or the Community Guidelines. You can report any post or comment inside a group. We act on reports as quickly as we reasonably can. Opening a public prayer group needs our approval.',
  },
  {
    title: '8. Acceptable Use',
    body: 'You agree not to misuse the Service, including: posting unlawful, harassing, hateful, defamatory, sexually explicit or obscene content; threatening or targeting others; sharing other people’s private information; attempting to access other users’ accounts or data; scraping or copying the Service; using it to spam, sell, or promote unrelated products; or placing or clicking ads in a way intended to inflate ad activity.',
  },
  {
    title: '9. Advertising',
    body: 'Free accounts in the Android app may see one small banner advertisement on the Home screen, provided by Google AdMob. There are no ads on prayer, Bible, read-aloud, alarm or group screens, and no ads for Partner and Leader subscribers. In some regions you will be asked for your choice about personalised ads, which you can change later in Settings.',
  },
  {
    title: '10. Intellectual Property',
    body: 'The Prayer Fire name, logo, teachings, videos, designs and compilations are the property of the Service. You may not copy, reproduce, or redistribute our content without permission. Bible text is from public-domain translations (King James Version, American Standard Version and World English Bible). Premium voice recordings are generated for the Service and are for your personal listening.',
  },
  {
    title: '11. Donations',
    body: 'Donations made through the Service (for example the "Partner With Us" gift) are voluntary gifts. Donating does not unlock any feature and is not a purchase of a plan. Payments are processed by third-party payment providers; donations are generally non-refundable, except where required by law.',
  },
  {
    title: '12. Deleting your account',
    body: `You can delete your account in the app (Settings, Privacy & Data, Delete my account) or on the web at prayer-fire.vercel.app${DELETE_ACCOUNT_PATH}. If you cannot sign in, email ${CONTACT_EMAIL} from the address on your account. Deleting your account removes your profile and the data linked to it from our servers, as described in the Privacy Policy.`,
  },
  {
    title: '13. Disclaimer of Warranties',
    body: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components. Alarms depend on your phone’s settings and battery management; please test them and do not rely on them for anything safety-critical.',
  },
  {
    title: '14. Limitation of Liability',
    body: 'To the fullest extent permitted by law, Prayer Fire and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Nothing in these Terms limits any right you have under the law that cannot be limited.',
  },
  {
    title: '15. Changes to These Terms',
    body: 'We may update these Terms from time to time. We will post the new version on this page with a new "Last updated" date, and for important changes we will tell you in the app. Your continued use of the Service after changes are posted means you accept the updated Terms.',
  },
  {
    title: '16. Governing law and contact',
    body: `These Terms are governed by the laws of the Federal Republic of Nigeria, without taking away any consumer protection that applies to you where you live. For questions about these Terms, contact us at ${CONTACT_EMAIL}.`,
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Who we are',
    body: `Prayer Fire ("we", "us", "the app") is operated by Prayer Fire Movement. We are the controller of the personal data described here. Contact and data-protection enquiries: ${CONTACT_EMAIL}.`,
  },
  {
    title: '2. Information we collect',
    bullets: [
      'Account: your name, email address and/or phone number (with country dial code) and a securely hashed password. If you sign in with Google, we receive your name and email from Google.',
      'Your prayer content: private prayer points, schedules, fasting plans, bookmarks and preferences are stored on your device. If you are signed in, intercessory prayers and the My Study backup (bookmarks, highlights, sermon notes) are also stored on our servers, private to your account.',
      'Community content: prayer requests, testimonies, group posts, comments, "I’m praying" taps, group check-ins, group membership and the display name you use in a group. Content you publish is visible to the people it is published to (a group, or everyone for public requests, testimonies and alerts).',
      'Global Prayer Alerts: when you tap "I’m praying" we record that your account prayed and the country of the request, taken from your connection. We use it for the counter and the list of countries. We do not record a precise location.',
      'App activity: when you are signed in we record the days on which your account opens the app, to understand usage and, if needed, send a friendly reminder.',
      'Subscriptions: your plan, its status and renewal date. Payments are made through Google Play; we receive purchase status through RevenueCat, using your account ID. We never see your card details.',
      'Feedback: the message you send and any details you choose to add, with your app version and device type.',
      'Donations: if you give voluntarily, payment is processed by our payment provider (Flutterwave). We do not store your card details.',
      'Advertising (Android app, free accounts only): Google AdMob may collect your device advertising ID, device and app information, approximate location from your IP address and how you interact with an ad. In the EEA, UK and some other regions we ask for your consent first, and you can change it in Settings under "Ad privacy choices". Partner and Leader subscribers see no ads.',
      'Videos: when you play a Prayer Fire video, it is shown through YouTube’s privacy-enhanced player, so Google/YouTube may receive information as described in their policy.',
      'Device permissions: notifications and alarms (to ring at your prayer times), and, if you choose, the phone’s text-to-speech. Alarm times are stored on your device.',
    ],
  },
  {
    title: '3. Why we use it, and our legal basis',
    bullets: [
      'To create and secure your account and run the app (performance of our agreement with you).',
      'To provide features you ask for: reminders, groups, backup, alerts, audio (performance of our agreement, and your consent where you choose to publish or enable something).',
      'To process subscriptions and donations (performance of our agreement).',
      'To show ads to free accounts and to ask for your consent where the law requires it (consent, and our legitimate interest in funding the free app).',
      'To keep the community safe: review reports, moderate content, prevent abuse (legitimate interest and legal obligation).',
      'To understand and improve the app (legitimate interest).',
      'We do not sell your personal information, and we do not use your private prayer content for advertising.',
    ],
  },
  {
    title: '4. Privacy of prayer content',
    body: 'Your private prayer points and notes stay on your device, or on our servers private to your account if you use backup. We do not read, share, or display them. Only what you choose to publish is shared, and only with the audience it is published to. Group leaders can see the posts in their group and the display names of its members. Group members see only display names, never emails or phone numbers.',
  },
  {
    title: '5. Who we share it with',
    bullets: [
      'Hosting and database: Vercel and Supabase (servers outside Nigeria), which store and process data for us.',
      'Sign-in: Google, if you choose "Continue with Google".',
      'Purchases: Google Play and RevenueCat.',
      'Donations: Flutterwave.',
      'Advertising: Google AdMob (free accounts in the Android app).',
      'Videos: YouTube (when you play a video).',
      'Premium Bible voices: our text-to-speech provider (ElevenLabs) receives only the public Bible text of a chapter, never your personal data.',
      'Authorities, where the law requires it. Otherwise we do not share your personal information.',
    ],
  },
  {
    title: '6. Transfers outside Nigeria',
    body: 'Our service providers store and process data in other countries. When we transfer personal data abroad we do so only to providers that protect it to a standard the Nigeria Data Protection Act 2023 (NDPA) accepts, for example under their data-processing terms, and only what is needed.',
  },
  {
    title: '7. How long we keep it',
    bullets: [
      'Account and backed-up content: until you delete your account.',
      'Group posts and comments: until you or a leader remove them, the group is deleted, or your account is deleted.',
      'Prayer alert taps: kept with the alert; deleted with your account.',
      'Subscription records: for as long as needed for billing, tax and legal reasons.',
      'Reports about content: for as long as needed to keep the community safe.',
    ],
  },
  {
    title: '8. Passwords and security',
    body: 'Passwords are hashed with bcrypt and never stored in plain text. Sign-in uses signed tokens in secure cookies. Access to member data inside prayer groups is enforced by the database itself. No system is perfectly secure; if there is a breach that puts your data at risk we will act on it and notify the people and authorities the law requires.',
  },
  {
    title: '9. Your rights',
    body: `Under the NDPA (and, where they apply to you, other data-protection laws) you have the right to access your data, correct it, delete it, receive a copy in a portable form, restrict or object to some uses, and withdraw consent at any time. You can export or delete your data in the app (Settings, Privacy & Data) or on the web at prayer-fire.vercel.app${DELETE_ACCOUNT_PATH}. For anything else write to ${CONTACT_EMAIL}; we will answer within 30 days. You may also complain to the Nigeria Data Protection Commission (NDPC) or your local data-protection authority.`,
  },
  {
    title: '10. Deleting your account and data',
    body: `Delete your account in the app (Settings, Privacy & Data, Delete my account) or at prayer-fire.vercel.app${DELETE_ACCOUNT_PATH}. We then delete your profile and the data linked to it: server backups of your notes and prayers, your group memberships, posts, comments and prayer marks, groups you lead (with their content), your app-activity record and the link between your account and any feedback you sent (the message itself may stay, anonymously). Data on your own phone is cleared on this device. Cancel any Google Play subscription yourself in Google Play. If you cannot sign in, email ${CONTACT_EMAIL} from the address on your account.`,
  },
  {
    title: '11. Children',
    body: 'Prayer Fire is not directed at children under 13, and we do not knowingly collect data from children under 13. If you believe a child has given us personal data, contact us and we will delete it. Ads are never personalised for people who have not consented, and the strictest ad content rating (G) is requested.',
  },
  {
    title: '12. Changes to this policy',
    body: 'We may update this policy. We post the new version here with a new "Last updated" date and, for important changes, tell you in the app.',
  },
  {
    title: '13. Contact',
    body: `For privacy questions or to use your rights, contact us at ${CONTACT_EMAIL}.`,
  },
];

export const COMMUNITY_SECTIONS: LegalSection[] = [
  {
    title: 'Why these guidelines exist',
    body: 'Prayer groups, prayer requests and testimonies work only when people feel safe and respected. Please read them before you post.',
  },
  {
    title: 'Be kind and be safe',
    bullets: [
      'Treat everyone with respect. No harassment, bullying, threats, hate or insults, including about race, tribe, gender, disability or denomination.',
      'No sexual or violent content, and nothing illegal.',
      'Never share another person’s private details (phone, address, medical or family information) without their permission. Ask before you share someone else’s prayer need.',
      'No spam, selling, fundraising scams or advertising unrelated to prayer.',
      'Do not pretend to be someone else, a pastor, or Prayer Fire.',
      'If someone is in danger or thinking of harming themselves, contact local emergency services or a crisis line. Prayer groups are not an emergency service.',
    ],
  },
  {
    title: 'How to report something',
    body: 'In any prayer group, open the post or comment and tap Report, then choose a reason. Group leaders see reports for their group (never who reported) and can hide or delete the content. You can also write to us at the contact below. We review reports as quickly as we reasonably can.',
  },
  {
    title: 'How to stop someone contacting you',
    body: 'You can leave a group at any time. Group leaders can remove or block a member from their group. If someone breaks these guidelines and a leader has not dealt with it, report it and email us: we can remove content and suspend accounts.',
  },
  {
    title: 'What happens when guidelines are broken',
    bullets: [
      'Content can be hidden or deleted by a group leader or by Prayer Fire.',
      'A member can be removed or blocked from a group.',
      'Repeat or serious breaches can lead to account suspension or deletion.',
      'Groups that break the guidelines can be removed.',
    ],
  },
  {
    title: 'Group leaders',
    body: 'Leaders are asked to look after their group: read reports promptly, remove harmful posts, and welcome people kindly. A new public group is checked by Prayer Fire before it goes live.',
  },
  {
    title: 'Contact',
    body: `Questions or urgent reports: ${CONTACT_EMAIL}.`,
  },
];
