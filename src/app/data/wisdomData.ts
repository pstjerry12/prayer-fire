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
    title: 'The Daniel Pattern',
    subtitle: 'Pray three times a day, like Daniel',
    icon: '🕯️',
    color: 'emerald',
    verses: [
      'Daniel 6:10 — Now when Daniel knew that the writing was signed, he went into his house; and his windows being open in his chamber toward Jerusalem, he kneeled upon his knees three times a day, and prayed, and gave thanks before his God, as he did aforetime.',
    ],
    paragraphs: [
      'Daniel was a man of unshakable consistency. Even when the law forbade prayer under penalty of death, he did not panic or change his habit — he simply went home, opened his windows, and prayed three times a day, exactly as he always had.',
      'The secret to beating prayerlessness is not a burst of emotion but a pattern. Three fixed meetings with God every day: morning, noon, and midnight. When prayer becomes a rhythm, it becomes unstoppable.',
    ],
    highlight: 'Write it. Speak it. Pray it. Trust God — three times a day.',
  },
  {
    id: 2,
    title: 'Why Three Times a Day?',
    subtitle: 'Structure beats willpower',
    icon: '⚙️',
    color: 'indigo',
    verses: [
      'Psalm 55:17 — Evening, and morning, and at noon, will I pray, and cry aloud: and he shall hear my voice.',
    ],
    paragraphs: [
      'A day has three battlefronts: the morning, the middle of the day, and the night. Each one brings its own distractions and battles, and each one needs its own covering of prayer.',
      'You conquer prayerlessness not by willpower alone, but by structure. Set your times, set your alarms, and show up — even when you do not feel like it. Consistency builds the fire that feelings cannot sustain.',
    ],
    highlight: 'Do not wait until you feel like praying. Pray until you feel like praying.',
  },
  {
    id: 3,
    title: 'The Morning Watch',
    subtitle: 'Begin your day in God\'s presence',
    icon: '🌅',
    color: 'amber',
    verses: [
      'Mark 1:35 — And in the morning, rising up a great while before day, he went out, and departed into a solitary place, and there prayed.',
    ],
    paragraphs: [
      'Jesus began His greatest days on His knees before sunrise. The morning watch sets the tone for everything that follows — before the world speaks, let God speak.',
      'Give God the firstfruits of your day. A morning prayer is like a compass: it points your whole day in the right direction before the noise begins.',
    ],
    highlight: 'Win the morning, and you win the day.',
  },
  {
    id: 4,
    title: 'The Noon Prayer',
    subtitle: 'Pause and refocus',
    icon: '☀️',
    color: 'orange',
    verses: [
      'Acts 10:9 — On the morrow, as they went on their journey, and drew nigh unto the city, Peter went up upon the housetop to pray about the sixth hour.',
    ],
    paragraphs: [
      'By midday, the pressures of life have piled up and your focus has scattered. The noon prayer is your divine reset — a holy pause to realign your heart with God.',
      'A short, honest prayer in the middle of the day breaks the downward pull and lifts your eyes back to heaven. It turns a stressful afternoon into a sanctified one.',
    ],
    highlight: 'In the middle of the battle, stop and look up.',
  },
  {
    id: 5,
    title: 'The Midnight Hour',
    subtitle: 'Pray through the night watches',
    icon: '🌙',
    color: 'violet',
    verses: [
      'Acts 16:25 — And at midnight Paul and Silas prayed, and sang praises unto God: and the prisoners heard them.',
    ],
    paragraphs: [
      'Midnight is the hour when the house is quiet, distractions are gone, and the enemy least expects you to be awake. It is the hidden watch where breakthroughs are birthed.',
      'Paul and Silas prayed and praised at midnight in a prison — and God shook the foundations. The midnight prayer turns locked doors into open ones.',
    ],
    highlight: 'The midnight watch is where chains break.',
  },
  {
    id: 6,
    title: 'Begin with Mercy',
    subtitle: 'Cleanse and confess each session',
    icon: '💧',
    color: 'cyan',
    verses: [
      '1 John 1:9 — If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.',
    ],
    paragraphs: [
      'Every powerful prayer session begins with mercy. Do not rush to ask for blessings with unclean hands. Confession clears the channel between your heart and heaven.',
      'The mercy prayer is short but mighty: confess honestly, receive His forgiveness by faith, and let go of every guilt. A forgiven heart prays with boldness.',
    ],
    highlight: 'Confession is not condemnation; it is the doorway to confidence.',
  },
  {
    id: 7,
    title: 'Thanksgiving & Praise',
    subtitle: 'Enter His gates with a grateful heart',
    icon: '🎁',
    color: 'pink',
    verses: [
      'Psalm 100:4 — Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.',
    ],
    paragraphs: [
      'Thanksgiving is the key that unlocks the gate of God\'s presence. Before you present a single request, thank Him for what He has already done.',
      'A heart full of thanks cannot be full of fear. Make gratitude a daily habit, not just an occasional response.',
    ],
    highlight: 'What you thank God for today, you will not lose tomorrow.',
  },
  {
    id: 8,
    title: 'Your Prayer List',
    subtitle: 'Write it, speak it, pray it',
    icon: '📝',
    color: 'rose',
    verses: [
      'Philippians 4:6 — Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    ],
    paragraphs: [
      'Specific prayer is answered prayer. Instead of vague, general petitions, write down the exact people, situations and breakthroughs you are believing God for.',
      'A written prayer list keeps you focused and gives you a record of God\'s faithfulness. When you mark a prayer as answered, your faith grows for the next one.',
    ],
    highlight: 'Write it. Speak it. Pray it. Trust God.',
  },
  {
    id: 9,
    title: 'Intercession',
    subtitle: 'Stand in the gap for others',
    icon: '🛡️',
    color: 'blue',
    verses: [
      'Ezekiel 22:30 — And I sought for a man among them, that should make up the hedge, and stand in the gap before me for the land.',
    ],
    paragraphs: [
      'Intercession is love in action. When you stand in the gap for another person, you become their spiritual bridge to heaven.',
      'God is searching for intercessors — people who will pray for families, churches, leaders and nations. Every great move of God begins with someone who refuses to pray only for themselves.',
    ],
    highlight: 'Praying for others is standing in the gap for them.',
  },
  {
    id: 10,
    title: 'Persevere to the Harvest',
    subtitle: 'Don\'t stop until you see it',
    icon: '⛰️',
    color: 'teal',
    verses: [
      'Galatians 6:9 — And let us not be weary in well doing: for in due season we shall reap, if we faint not.',
    ],
    paragraphs: [
      'Answered prayer rarely looks instant. Like a farmer, you sow in prayer and wait for the harvest in faith. The waiting season is not wasted; it is where your roots grow deep.',
      'Do not give up at the eleventh hour. Keep praying, keep trusting, keep thanking — your due season is coming.',
    ],
    highlight: 'The answer is already on the way. Hold on a little longer.',
  },
  {
    id: 11,
    title: 'Nurturing Your Relationship with God',
    subtitle: "Daniel's Prayer Power — devotion, not just discipline",
    icon: '🤝',
    color: 'rose',
    verses: [
      'James 4:8 — Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded.',
    ],
    paragraphs: [
      "Daniel's secret wasn't simply discipline; it was devotion. Before the decree was ever signed, Daniel had established a profound rhythm of intimacy with his Creator. He didn't start praying because he was in trouble; he survived trouble because he was already praying. True prayer power stems from a nurtured relationship, not an emergency hotline.",
      "When we approach prayer as a relationship rather than a ritual, the burden of 'having to pray' transforms into the joy of 'getting to pray.' Like any relationship, consistency builds trust and deepens connection.",
      'Make your prayer time a sacred appointment. Let the quiet moments you spend with God be the anchor for the rest of your day, providing the strength to stand firm when the lions roar.',
    ],
    highlight: 'Prayer is a relationship, not an emergency hotline.',
  },
  {
    id: 12,
    title: 'Short vs Long Prayers',
    subtitle: 'Consistency over duration',
    icon: '⏱️',
    color: 'cyan',
    verses: [
      "Matthew 14:30 — But when he saw the wind boisterous, he was afraid; and beginning to sink, he cried, saying, Lord, save me.",
    ],
    paragraphs: [
      "God measures prayers by their weight, not their length. A single, sincere 'Lord, help me' carries more spiritual authority than an hour of eloquent but empty words. In the Scriptures, some of the most powerful prayers were astonishingly brief — like Peter's cry on the water.",
      'Long prayers have their place, especially when our hearts are heavy and we need time to unpack our burdens. Jesus Himself spent entire nights in prayer. But the length of a prayer should be dictated by the leading of the Spirit and the needs of the moment.',
      'Do not feel guilty if your daily prayers are short. Consistency matters more than duration. Three focused, intentional moments with God each day will transform your spiritual life more effectively than one long, exhausting session a week.',
    ],
    highlight: 'God measures prayers by their weight, not their length.',
  },
  {
    id: 13,
    title: 'Written vs Spoken Prayers',
    subtitle: 'Both are necessary',
    icon: '✍️',
    color: 'amber',
    verses: [
      'Habakkuk 2:2 — And the LORD answered me, and said, Write the vision, and make it plain upon tables, that he may run that readeth it.',
    ],
    paragraphs: [
      'There is incredible power in writing down your prayers. The Psalms are essentially a collection of written prayers that have guided the church for millennia. Writing forces us to slow down, to be intentional with our thoughts, and to articulate exactly what is in our hearts.',
      'Spoken prayers allow for spontaneity and the immediate expression of emotion. They let us cry out, praise, and intercede in real-time. Both methods are valid, and both are necessary for a well-rounded prayer life.',
      "Consider using a prayer journal alongside your spoken prayers. Write down the major burdens of your heart, and record God's answers. Over time, your journal will become a tangible testimony of God's faithfulness.",
    ],
    highlight: "Write down your burdens; record God's answers.",
  },
  {
    id: 14,
    title: 'Faith vs Feeling',
    subtitle: 'Trust His Word over your senses',
    icon: '⚓',
    color: 'blue',
    verses: [
      'Hebrews 11:6 — But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.',
    ],
    paragraphs: [
      "True prayer operates on the currency of faith, not the fluctuating economy of feelings. There will be days when the heavens seem like brass and your prayers feel like they hit the ceiling. On those days, pray anyway. Daniel prayed even when it was illegal; we must pray even when it feels dry.",
      'Faith is the conviction that God hears us because He promised He would, regardless of our emotional state. When we pray without feeling it, we are demonstrating a deeper level of trust — we are trusting His Word over our senses.',
      'Do not let emotional exhaustion steal your prayer time. Stand on the promises of God. Let your faith dictate your actions, and often, the feelings will eventually follow.',
    ],
    highlight: 'Pray anyway — even when heaven seems silent.',
  },
  {
    id: 15,
    title: 'Loud vs Quiet Prayers',
    subtitle: 'A dynamic range of worship',
    icon: '🌊',
    color: 'violet',
    verses: [
      'Psalm 46:10 — Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.',
    ],
    paragraphs: [
      'God is not deaf, nor is He intimidated by volume. The Bible speaks of crying out to God with a loud voice, praising Him with shouts of joy. There are times when spiritual warfare or desperate intercession demands a loud, vocal expression of faith.',
      "Conversely, there is immense power in stillness. 'Be still, and know that I am God.' Quiet, contemplative prayer allows us to listen. It is in the whisper that God often speaks the clearest.",
      'Your prayer life should have a dynamic range. Learn to shout your praise when victory comes, and learn to sit in absolute silence when your soul needs rest. Both are beautiful to the Father.',
    ],
    highlight: 'Shout your praise; sit in stillness. Both are beautiful to the Father.',
  },
  {
    id: 16,
    title: 'The Bliss of Organized Prayer',
    subtitle: 'Intentionality that protects devotion',
    icon: '🗂️',
    color: 'emerald',
    verses: [
      '1 Corinthians 14:40 — Let all things be done decently and in order.',
    ],
    paragraphs: [
      "Spontaneity is wonderful, but organization sustains. Daniel's prayer life was organized: three times a day, facing Jerusalem. This structure didn't limit his devotion; it protected it. When we organize our prayer life, we ensure that the important is not crowded out by the urgent.",
      'Using categories, prayer lists, or guided steps (like Confession, Praise, Requests, Thanksgiving) gives us a track to run on. It prevents our minds from wandering and ensures we are covering the necessary ground in our spiritual walk.',
      'Embrace the bliss of an organized prayer life. Let structure be the trellis upon which the vine of your relationship with God can grow and flourish. It is not legalism; it is intentionality.',
    ],
    highlight: 'Structure is not legalism; it is intentionality.',
  },
];
