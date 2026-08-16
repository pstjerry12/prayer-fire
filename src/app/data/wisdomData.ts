export interface WisdomChapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  verses: string[];
  paragraphs: string[];
  highlight: string;
}

export interface ColorClasses {
  bg: string;
  border: string;
  gradient: string;
  text: string;
  badge: string;
}

export const COLOR_CLASSES: Record<string, ColorClasses> = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    gradient: 'from-amber-50 to-white',
    text: 'text-amber-700',
    badge: 'bg-amber-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    gradient: 'from-indigo-50 to-white',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100',
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    gradient: 'from-teal-50 to-white',
    text: 'text-teal-700',
    badge: 'bg-teal-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    gradient: 'from-emerald-50 to-white',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    gradient: 'from-blue-50 to-white',
    text: 'text-blue-700',
    badge: 'bg-blue-100',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    gradient: 'from-pink-50 to-white',
    text: 'text-pink-700',
    badge: 'bg-pink-100',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    gradient: 'from-rose-50 to-white',
    text: 'text-rose-700',
    badge: 'bg-rose-100',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    gradient: 'from-violet-50 to-white',
    text: 'text-violet-700',
    badge: 'bg-violet-100',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    gradient: 'from-orange-50 to-white',
    text: 'text-orange-700',
    badge: 'bg-orange-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    gradient: 'from-cyan-50 to-white',
    text: 'text-cyan-700',
    badge: 'bg-cyan-100',
  },
};

export const WISDOM_CHAPTERS: WisdomChapter[] = [
  {
    id: 1,
    title: 'The Call to Prayer',
    subtitle: 'Why every believer must pray',
    icon: '🕯️',
    color: 'amber',
    verses: [
      'Luke 18:1 — And he spake a parable unto them to this end, that men ought always to pray, and not to faint.',
    ],
    paragraphs: [
      'Prayer is not a religious routine; it is the lifeline of your relationship with God. When the disciples saw the power and peace in the life of Jesus, they did not ask Him for a new teaching technique or a better strategy. They asked, "Lord, teach us to pray."',
      'Prayerlessness is not a small weakness. It is a quiet thief that steals vision, courage and intimacy with God. The first step toward a consistent prayer life is to understand that you were created for communion with your Maker.',
    ],
    highlight: 'A prayerless life is a powerless life. You cannot know God deeply without talking to Him daily.',
  },
  {
    id: 2,
    title: 'Conquering Prayerlessness',
    subtitle: 'Winning the first battle',
    icon: '⚔️',
    color: 'indigo',
    verses: [
      'Matthew 26:41 — Watch and pray, that ye enter not into temptation: the spirit indeed is willing, but the flesh is weak.',
    ],
    paragraphs: [
      'Prayerlessness is a battle fought in the mind long before it shows in your schedule. Distraction, discouragement and delay are the three weapons the enemy uses to keep you off your knees.',
      'You conquer prayerlessness not by willpower alone, but by structure and sincerity. Write your prayer points, set a time, and show up — even when you do not feel like it. Consistency builds the fire that feelings cannot sustain.',
    ],
    highlight: 'Do not wait until you feel like praying. Pray until you feel like praying.',
  },
  {
    id: 3,
    title: 'The Mercy Prayer',
    subtitle: 'Cleansing and confession',
    icon: '💧',
    color: 'teal',
    verses: [
      '1 John 1:9 — If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.',
    ],
    paragraphs: [
      'Every powerful prayer session begins with mercy. When you come before God, do not rush to ask for blessings with unclean hands. Confession clears the channel between your heart and heaven.',
      'The mercy prayer is short but mighty: confess your sins honestly, receive His forgiveness by faith, and let go of every guilt. A forgiven heart prays with boldness.',
    ],
    highlight: 'Confession is not condemnation; it is the doorway to confidence before the throne of grace.',
  },
  {
    id: 4,
    title: 'Thanksgiving That Opens Doors',
    subtitle: 'The power of a grateful heart',
    icon: '🎁',
    color: 'emerald',
    verses: [
      'Psalm 100:4 — Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.',
    ],
    paragraphs: [
      'Thanksgiving is the key that unlocks the gate of the presence of God. Before you present a single request, thank Him for what He has already done. Gratitude shifts your focus from your problem to His power.',
      'A heart full of thanks cannot be full of fear. Make thanksgiving a daily habit, not just an occasional response.',
    ],
    highlight: 'What you thank God for today, you will not lose tomorrow.',
  },
  {
    id: 5,
    title: 'Inviting the Holy Spirit',
    subtitle: 'Our helper in prayer',
    icon: '🕊️',
    color: 'blue',
    verses: [
      'Romans 8:26 — Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us.',
    ],
    paragraphs: [
      'You are never alone in the prayer closet. The Holy Spirit is your helper, your teacher and your intercessor. He knows the perfect will of God and helps you pray it with precision.',
      'Before you pray, pause and invite the Holy Spirit. Ask Him to guide your words, search your heart, and align your desires with heaven.',
    ],
    highlight: 'The Holy Spirit turns ordinary words into supernatural prayers.',
  },
  {
    id: 6,
    title: 'Praise and Worship as Warfare',
    subtitle: 'Singing through the battle',
    icon: '🎶',
    color: 'pink',
    verses: [
      'Psalm 149:6 — Let the high praises of God be in their mouth, and a twoedged sword in their hand;',
    ],
    paragraphs: [
      'Praise is not a warm-up; it is a weapon. When you lift your voice in worship, you magnify God above your mountain and shrink the giants in your path.',
      'Paul and Silas praised God in the prison at midnight, and the chains fell off. Your praise may not change your circumstances immediately, but it will change you — and a changed heart changes everything.',
    ],
    highlight: 'Worship is declaring in the dark what you believe in the light.',
  },
  {
    id: 7,
    title: 'Praying Your Prayer List',
    subtitle: 'Bringing specific requests to God',
    icon: '📝',
    color: 'rose',
    verses: [
      'Philippians 4:6 — Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    ],
    paragraphs: [
      'Specific prayer is answered prayer. Instead of vague, general petitions, write down the exact people, situations and breakthroughs you are believing God for.',
      'A written prayer list keeps you focused and gives you a record of the faithfulness of God. When you mark a prayer as answered, your faith grows for the next one.',
    ],
    highlight: 'Write it. Speak it. Pray it. Trust God.',
  },
  {
    id: 8,
    title: 'Intercession: Standing in the Gap',
    subtitle: 'Praying for others',
    icon: '🛡️',
    color: 'violet',
    verses: [
      'Ezekiel 22:30 — And I sought for a man among them, that should make up the hedge, and stand in the gap before me for the land, that I should not destroy it: but I found none.',
    ],
    paragraphs: [
      'Intercession is love in action. When you stand in the gap for another person, you become their spiritual bridge to heaven.',
      'God is searching for intercessors — people who will pray for families, churches, leaders and nations. Every great move of God begins with someone who refuses to pray only for themselves.',
    ],
    highlight: 'Praying for others is standing in the gap for them.',
  },
  {
    id: 9,
    title: 'Fasting and Prayer',
    subtitle: 'Adding fire to your faith',
    icon: '🔥',
    color: 'orange',
    verses: [
      'Matthew 17:21 — Howbeit this kind goeth not out but by prayer and fasting.',
    ],
    paragraphs: [
      'Fasting sharpens your spiritual senses. When you deny the flesh, you feed the spirit, and your prayers gain unusual authority.',
      'There are mountains that will not move by prayer alone. When you combine prayer with fasting, you break yokes and unlock doors that seemed permanently shut.',
    ],
    highlight: 'Fasting is not about what you give up; it is about what you gain — more of God.',
  },
  {
    id: 10,
    title: 'Perseverance: Holding On in Faith',
    subtitle: "Don't stop until you see it",
    icon: '⛰️',
    color: 'cyan',
    verses: [
      'Galatians 6:9 — And let us not be weary in well doing: for in due season we shall reap, if we faint not.',
    ],
    paragraphs: [
      'Answered prayer rarely looks instant. Like a farmer, you sow in prayer and wait for the harvest in faith. The waiting season is not wasted; it is where your roots grow deep.',
      'Do not give up at the eleventh hour. Keep praying, keep trusting, keep thanking — your due season is coming.',
    ],
    highlight: 'The answer is already on the way. Hold on a little longer.',
  },
];
