export interface LegalSection {
  title: string;
  body: string;
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using Prayer Fire Movement ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.',
  },
  {
    title: '2. Nature of the Service',
    body: 'Prayer Fire Movement is a faith-based spiritual wellness application. The Service provides prayer planning tools, scripture content, fasting trackers, and community features. The Service does not provide medical, psychological, financial, legal, or other professional advice. Always consult a qualified professional for such matters.',
  },
  {
    title: '3. Your Account',
    body: 'You are responsible for maintaining the confidentiality of your password and for all activity under your account. You agree to provide accurate information and to notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '4. Privacy of Your Prayer Content',
    body: 'Your prayer points and personal notes are stored locally on your own device and are not publicly shared. We treat your private prayer content as confidential. Public features (such as prayer requests you choose to submit to the Partner Network) are visible to other users as described in our Privacy Policy.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You agree not to misuse the Service, including: posting unlawful, harassing, defamatory, or obscene content; attempting to access other users\u2019 accounts or data; or using the Service to spam or harm others. We reserve the right to suspend or terminate accounts that violate these terms.',
  },
  {
    title: '6. Intellectual Property',
    body: 'The Prayer Fire Movement name, logo, scripture compilations, teachings, and design are the property of the Service. You may not copy, reproduce, or redistribute our content without permission. Scripture text from the King James Version is in the public domain.',
  },
  {
    title: '7. Donations & Purchases',
    body: 'Donations made through the Service are voluntary gifts. Payment processing is handled by third-party providers (such as Paystack or Stripe). Donations are generally non-refundable, except where required by law. Subscription fees are billed as described at the time of purchase and may be cancelled at any time.',
  },
  {
    title: '8. Disclaimer of Warranties',
    body: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'To the fullest extent permitted by law, Prayer Fire Movement and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.',
  },
  {
    title: '10. Changes to These Terms',
    body: 'We may update these Terms from time to time. We will post any changes on this page. Your continued use of the Service after changes are posted constitutes acceptance of the updated Terms.',
  },
  {
    title: '11. Contact',
    body: 'For questions about these Terms, please contact us at prayerfiremovemnt@gmail.com.',
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your name, email address, and/or phone number (including your country dial code) together with a securely hashed password. Your prayer points, fasting plans, scripture favorites, and preferences are stored locally on your device by default.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your account details to authenticate you, personalise your experience, and keep your session secure. We do not sell your personal information to third parties.',
  },
  {
    title: '3. Passwords & Security',
    body: 'Passwords are hashed using bcrypt before being stored and are never kept in plain text. Authentication uses signed JSON Web Tokens (JWT) stored in secure, HTTP-only cookies, with a local backup for convenience.',
  },
  {
    title: '4. Privacy of Prayer Content',
    body: 'Your private prayer points and notes are stored locally on your own device. We do not read, share, or display your private prayer content. Only content you intentionally publish (such as partner prayer requests) is shared with the community.',
  },
  {
    title: '5. Local Data',
    body: 'Your prayers, schedules, and preferences are stored in your browser\u2019s local storage. Clearing your browser data will remove them. You can export or delete this data at any time from Account Settings.',
  },
  {
    title: '6. Third-Party Services',
    body: 'We use third-party services for authentication (Google), payments (Paystack/Stripe), and hosting (Vercel/Supabase). These providers have their own privacy policies governing the data they process.',
  },
  {
    title: '7. Your Rights',
    body: 'You may request to review, export, or delete your data at any time. Deleting your account removes your profile from our database and clears the data stored on your device.',
  },
  {
    title: '8. Contact',
    body: 'For privacy questions, please contact us at prayerfiremovemnt@gmail.com.',
  },
];
