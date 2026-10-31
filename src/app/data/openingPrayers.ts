/**
 * "Today's opening prayer" on the home screen: a short prayer to begin the Start-Up Prayer with.
 * One is shown per day (the list repeats every PRAYERS.length days). They follow the first steps of the
 * Start-Up Prayer: mercy and cleansing, thanksgiving, and inviting the Holy Spirit. Edit or add prayers freely:
 * keep each to a few short lines so it reads well on a small screen and aloud.
 */
export const OPENING_PRAYERS: string[] = [
  "Father, I come to You in the name of Jesus. Thank You for waking me up and letting me stand before You today. I confess my sins and receive Your cleansing through the blood of Jesus. Create in me a clean heart, and let this time of prayer set my spirit on fire.",
  "Lord God, You are faithful and just to forgive. I lay down everything that weighs on my heart and ask for Your mercy. Wash me, renew me, and fill me again. Teach me to pray the way Daniel prayed, with faith, with thanks and without giving up.",
  "Heavenly Father, I give You thanks for this new day and for every breath. I praise You for Your goodness and Your mercy that are new every morning. Draw me close as I pray. Let nothing distract me from standing before You.",
  "Father, in the name of Jesus I come boldly to Your throne of grace. Forgive me where I have fallen short. Cleanse my thoughts, my words and my heart. Holy Spirit, lead me in this prayer and help me pray according to Your will.",
  "Lord, I enter Your gates with thanksgiving and Your courts with praise. Thank You for salvation, for my family and for Your protection. Open my eyes to see You, and let this time of prayer change me from the inside.",
  "Almighty God, You hear when Your children call. I come in humility and in faith. Have mercy on me, a sinner, and make me whole. Fill me with Your Holy Spirit so that I can pray with power and love today.",
  "Father, I surrender this day to You: my plans, my work, my relationships and my worries. Forgive me and cleanse me. Holy Spirit, teach me what to pray, and remind me of everything Jesus has said.",
  "Lord Jesus, thank You for dying for me and for rising again. I receive Your forgiveness and walk in Your freedom. Be glorified in my life today. Stir the fire of prayer in me and keep me faithful three times a day.",
  "Gracious Father, I am grateful for Your patience with me. I turn away from everything that grieves You and turn toward You with all my heart. Restore the joy of Your salvation and make my prayers a sweet offering before You.",
  "God of mercy, search me and know my heart. Show me anything that stands between us, and cleanse it by Your grace. Thank You for answering before I call. Let Your Spirit lead me into deep, honest prayer.",
  "Father, thank You for Your Word that is a lamp to my feet. I ask for mercy where I have failed, and for strength where I am weak. Holy Spirit, come and help me in my weakness, and pray through me today.",
  "Lord, You are great and greatly to be praised. I bow before You with thanksgiving. Forgive my sins, heal my heart and fill me with Your peace. Let this prayer be the foundation of my whole day.",
  "Heavenly Father, I stop and I wait on You. Quiet my mind and gather my heart. Wash me clean in the blood of Jesus, and fill me afresh with Your Spirit, so that I can pray for my family, my church and my nation.",
  "Father, I praise You because You never change. Thank You for carrying me through yesterday and for the strength to start today. Have mercy on me, lead me by Your Spirit, and set my heart ablaze for You.",
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function openingPrayerFor(date: Date = new Date()): string {
  return OPENING_PRAYERS[dayOfYear(date) % OPENING_PRAYERS.length];
}
