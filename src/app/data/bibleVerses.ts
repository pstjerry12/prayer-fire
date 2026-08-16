import type { IntercessoryCategory } from '../types';

// ---------------------------------------------------------------------------
// KJV Bible Library
// ---------------------------------------------------------------------------

export interface BibleCategory {
  id: string;
  name: string;
  icon: string;
}

export interface BibleVerse {
  id: string;
  category: string;
  reference: string;
  text: string;
}

export const KJV_BIBLE_CATEGORIES: BibleCategory[] = [
  { id: 'faith', name: 'Faith', icon: '🙏' },
  { id: 'protection', name: 'Protection', icon: '🛡️' },
  { id: 'healing', name: 'Healing', icon: '💚' },
  { id: 'strength', name: 'Strength', icon: '💪' },
  { id: 'peace', name: 'Peace', icon: '🕊️' },
  { id: 'provision', name: 'Provision', icon: '🌾' },
  { id: 'wisdom', name: 'Wisdom', icon: '📖' },
  { id: 'prayer', name: 'Prayer', icon: '🔥' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧' },
  { id: 'thanksgiving', name: 'Thanksgiving', icon: '🎉' },
];

export const KJV_BIBLE_VERSES: BibleVerse[] = [
  // Faith
  {
    id: 'faith-1',
    category: 'faith',
    reference: 'Hebrews 11:1',
    text: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
  },
  {
    id: 'faith-2',
    category: 'faith',
    reference: 'Hebrews 11:6',
    text: 'But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.',
  },
  {
    id: 'faith-3',
    category: 'faith',
    reference: 'Mark 11:24',
    text: 'Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.',
  },
  {
    id: 'faith-4',
    category: 'faith',
    reference: 'Romans 10:17',
    text: 'So then faith cometh by hearing, and hearing by the word of God.',
  },

  // Protection
  {
    id: 'protection-1',
    category: 'protection',
    reference: 'Psalm 91:1',
    text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.',
  },
  {
    id: 'protection-2',
    category: 'protection',
    reference: 'Psalm 91:11',
    text: 'For he shall give his angels charge over thee, to keep thee in all thy ways.',
  },
  {
    id: 'protection-3',
    category: 'protection',
    reference: 'Psalm 121:7-8',
    text: 'The LORD shall preserve thee from all evil: he shall preserve thy soul. The LORD shall preserve thy going out and thy coming in from this time forth, and even for evermore.',
  },
  {
    id: 'protection-4',
    category: 'protection',
    reference: '2 Thessalonians 3:3',
    text: 'But the Lord is faithful, who shall stablish you, and keep you from evil.',
  },
  {
    id: 'protection-5',
    category: 'protection',
    reference: 'Proverbs 18:10',
    text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.',
  },

  // Healing
  {
    id: 'healing-1',
    category: 'healing',
    reference: 'Exodus 15:26',
    text: 'For I am the LORD that healeth thee.',
  },
  {
    id: 'healing-2',
    category: 'healing',
    reference: 'Psalm 103:2-3',
    text: 'Bless the LORD, O my soul, and forget not all his benefits: who forgiveth all thine iniquities; who healeth all thy diseases.',
  },
  {
    id: 'healing-3',
    category: 'healing',
    reference: 'Isaiah 53:5',
    text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.',
  },
  {
    id: 'healing-4',
    category: 'healing',
    reference: 'Jeremiah 17:14',
    text: 'Heal me, O LORD, and I shall be healed; save me, and I shall be saved: for thou art my praise.',
  },
  {
    id: 'healing-5',
    category: 'healing',
    reference: 'James 5:15',
    text: 'And the prayer of faith shall save the sick, and the Lord shall raise him up; and if he have committed sins, they shall be forgiven him.',
  },

  // Strength
  {
    id: 'strength-1',
    category: 'strength',
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ which strengtheneth me.',
  },
  {
    id: 'strength-2',
    category: 'strength',
    reference: 'Isaiah 40:31',
    text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
  },
  {
    id: 'strength-3',
    category: 'strength',
    reference: 'Psalm 28:7',
    text: 'The LORD is my strength and my shield; my heart trusted in him, and I am helped: therefore my heart greatly rejoiceth; and with my song will I praise him.',
  },
  {
    id: 'strength-4',
    category: 'strength',
    reference: 'Isaiah 41:10',
    text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
  },

  // Peace
  {
    id: 'peace-1',
    category: 'peace',
    reference: 'John 14:27',
    text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.',
  },
  {
    id: 'peace-2',
    category: 'peace',
    reference: 'Philippians 4:6-7',
    text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
  },
  {
    id: 'peace-3',
    category: 'peace',
    reference: 'John 16:33',
    text: 'These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.',
  },
  {
    id: 'peace-4',
    category: 'peace',
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, a very present help in trouble.',
  },
  {
    id: 'peace-5',
    category: 'peace',
    reference: 'Isaiah 26:3',
    text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.',
  },

  // Provision
  {
    id: 'provision-1',
    category: 'provision',
    reference: 'Philippians 4:19',
    text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.',
  },
  {
    id: 'provision-2',
    category: 'provision',
    reference: 'Psalm 23:1',
    text: 'The LORD is my shepherd; I shall not want.',
  },
  {
    id: 'provision-3',
    category: 'provision',
    reference: 'Matthew 6:33',
    text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
  },
  {
    id: 'provision-4',
    category: 'provision',
    reference: 'Malachi 3:10',
    text: 'Bring ye all the tithes into the storehouse... and prove me now herewith, saith the LORD of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall not be room enough to receive it.',
  },

  // Wisdom
  {
    id: 'wisdom-1',
    category: 'wisdom',
    reference: 'James 1:5',
    text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.',
  },
  {
    id: 'wisdom-2',
    category: 'wisdom',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
  },
  {
    id: 'wisdom-3',
    category: 'wisdom',
    reference: 'Psalm 119:105',
    text: 'Thy word is a lamp unto my feet, and a light unto my path.',
  },
  {
    id: 'wisdom-4',
    category: 'wisdom',
    reference: 'Proverbs 2:6',
    text: 'For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.',
  },

  // Prayer
  {
    id: 'prayer-1',
    category: 'prayer',
    reference: 'Matthew 7:7',
    text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.',
  },
  {
    id: 'prayer-2',
    category: 'prayer',
    reference: '1 Thessalonians 5:17',
    text: 'Pray without ceasing.',
  },
  {
    id: 'prayer-3',
    category: 'prayer',
    reference: 'Jeremiah 33:3',
    text: 'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.',
  },
  {
    id: 'prayer-4',
    category: 'prayer',
    reference: 'Matthew 18:19-20',
    text: 'Again I say unto you, That if two of you shall agree on earth as touching any thing that they shall ask, it shall be done for them of my Father which is in heaven. For where two or three are gathered together in my name, there am I in the midst of them.',
  },
  {
    id: 'prayer-5',
    category: 'prayer',
    reference: '1 John 5:14',
    text: 'And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us.',
  },

  // Family
  {
    id: 'family-1',
    category: 'family',
    reference: 'Joshua 24:15',
    text: 'But as for me and my house, we will serve the LORD.',
  },
  {
    id: 'family-2',
    category: 'family',
    reference: 'Psalm 127:3',
    text: 'Lo, children are an heritage of the LORD: and the fruit of the womb is his reward.',
  },
  {
    id: 'family-3',
    category: 'family',
    reference: 'Proverbs 22:6',
    text: 'Train up a child in the way he should go: and when he is old, he will not depart from it.',
  },
  {
    id: 'family-4',
    category: 'family',
    reference: 'Acts 16:31',
    text: 'Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.',
  },

  // Thanksgiving
  {
    id: 'thanksgiving-1',
    category: 'thanksgiving',
    reference: 'Psalm 100:4',
    text: 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.',
  },
  {
    id: 'thanksgiving-2',
    category: 'thanksgiving',
    reference: '1 Thessalonians 5:18',
    text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.',
  },
  {
    id: 'thanksgiving-3',
    category: 'thanksgiving',
    reference: 'Psalm 107:1',
    text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.',
  },
  {
    id: 'thanksgiving-4',
    category: 'thanksgiving',
    reference: 'Colossians 3:17',
    text: 'And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.',
  },
];

// ---------------------------------------------------------------------------
// Scripture Vault (multilingual)
// ---------------------------------------------------------------------------

export interface ScriptureCard {
  id: string;
  language: string;
  reference: string;
  text: string;
}

export const SCRIPTURE_CARDS: ScriptureCard[] = [
  // English (KJV)
  {
    id: 'en-1',
    language: 'en',
    reference: 'John 3:16',
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  },
  {
    id: 'en-2',
    language: 'en',
    reference: 'Psalm 23:1',
    text: 'The LORD is my shepherd; I shall not want.',
  },
  {
    id: 'en-3',
    language: 'en',
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ which strengtheneth me.',
  },
  {
    id: 'en-4',
    language: 'en',
    reference: 'Jeremiah 29:11',
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
  },
  {
    id: 'en-5',
    language: 'en',
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, a very present help in trouble.',
  },

  // Español (Reina-Valera 1960)
  {
    id: 'es-1',
    language: 'es',
    reference: 'Juan 3:16',
    text: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
  },
  {
    id: 'es-2',
    language: 'es',
    reference: 'Salmos 23:1',
    text: 'Jehová es mi pastor; nada me faltará.',
  },
  {
    id: 'es-3',
    language: 'es',
    reference: 'Filipenses 4:13',
    text: 'Todo lo puedo en Cristo que me fortalece.',
  },
  {
    id: 'es-4',
    language: 'es',
    reference: 'Jeremías 29:11',
    text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
  },
  {
    id: 'es-5',
    language: 'es',
    reference: 'Salmos 46:1',
    text: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.',
  },

  // Français (Louis Segond)
  {
    id: 'fr-1',
    language: 'fr',
    reference: 'Jean 3:16',
    text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.",
  },
  {
    id: 'fr-2',
    language: 'fr',
    reference: 'Psaumes 23:1',
    text: "L'Éternel est mon berger: je ne manquerai de rien.",
  },
  {
    id: 'fr-3',
    language: 'fr',
    reference: 'Philippiens 4:13',
    text: 'Je puis tout par celui qui me fortifie.',
  },
  {
    id: 'fr-4',
    language: 'fr',
    reference: 'Jérémie 29:11',
    text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",
  },
  {
    id: 'fr-5',
    language: 'fr',
    reference: 'Psaumes 46:1',
    text: 'Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.',
  },

  // Português (João Ferreira de Almeida)
  {
    id: 'pt-1',
    language: 'pt',
    reference: 'João 3:16',
    text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
  },
  {
    id: 'pt-2',
    language: 'pt',
    reference: 'Salmos 23:1',
    text: 'O Senhor é o meu pastor; nada me faltará.',
  },
  {
    id: 'pt-3',
    language: 'pt',
    reference: 'Filipenses 4:13',
    text: 'Posso todas as coisas naquele que me fortalece.',
  },
  {
    id: 'pt-4',
    language: 'pt',
    reference: 'Jeremias 29:11',
    text: 'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.',
  },
  {
    id: 'pt-5',
    language: 'pt',
    reference: 'Salmos 46:1',
    text: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
  },

  // Kiswahili (Union Version)
  {
    id: 'sw-1',
    language: 'sw',
    reference: 'Yohana 3:16',
    text: 'Kwa maana jinsi hii Mungu aliupenda ulimwengu, hata akamtoa Mwanawe pekee, ili kila mtu amwaminiye asipotee, bali awe na uzima wa milele.',
  },
  {
    id: 'sw-2',
    language: 'sw',
    reference: 'Zaburi 23:1',
    text: 'Bwana ndiye mchungaji wangu, sitapungukiwa na kitu.',
  },
  {
    id: 'sw-3',
    language: 'sw',
    reference: 'Wafilipi 4:13',
    text: 'Naweza kufanya mambo yote katika yeye anitiaye nguvu.',
  },
  {
    id: 'sw-4',
    language: 'sw',
    reference: 'Yeremia 29:11',
    text: 'Maana nayajua mawazo niliyonayo juu yenu, asema Bwana, mawazo ya amani wala si ya mabaya, kuwapa utumaini katika siku zenu za mwisho.',
  },
  {
    id: 'sw-5',
    language: 'sw',
    reference: 'Zaburi 46:1',
    text: 'Mungu ndiye kimbilio letu na nguvu zetu, msaada ulio karibu sana katika shida.',
  },
];

// ---------------------------------------------------------------------------
// Default intercessory (family prayer) categories
// ---------------------------------------------------------------------------

export const DEFAULT_INTERCESSORY_CATEGORIES: IntercessoryCategory[] = [
  {
    id: 'family',
    name: 'Family',
    subCategories: [
      { id: 'family-spouse', name: 'Spouse & Marriage', entries: [] },
      { id: 'family-children', name: 'Children', entries: [] },
      { id: 'family-parents', name: 'Parents & In-Laws', entries: [] },
      { id: 'family-siblings', name: 'Siblings & Extended Family', entries: [] },
      { id: 'family-home', name: 'Home & Household', entries: [] },
    ],
  },
  {
    id: 'personal',
    name: 'Personal Needs',
    subCategories: [
      { id: 'personal-growth', name: 'Spiritual Growth', entries: [] },
      { id: 'personal-career', name: 'Career & Finances', entries: [] },
      { id: 'personal-health', name: 'Health & Strength', entries: [] },
      { id: 'personal-wisdom', name: 'Wisdom & Direction', entries: [] },
    ],
  },
  {
    id: 'protection',
    name: 'Divine Protection',
    subCategories: [
      { id: 'protection-safety', name: 'Physical Safety', entries: [] },
      { id: 'protection-travel', name: 'Traveling Mercies', entries: [] },
      { id: 'protection-evil', name: 'Protection from Evil', entries: [] },
    ],
  },
  {
    id: 'healing',
    name: 'Divine Healing',
    subCategories: [
      { id: 'healing-self', name: 'Healing for Self', entries: [] },
      { id: 'healing-loved', name: 'Healing for Loved Ones', entries: [] },
      { id: 'healing-emotional', name: 'Emotional & Mental Healing', entries: [] },
    ],
  },
  {
    id: 'intervention',
    name: 'Divine Intervention',
    subCategories: [
      { id: 'intervention-breakthrough', name: 'Breakthrough', entries: [] },
      { id: 'intervention-deliverance', name: 'Deliverance', entries: [] },
      { id: 'intervention-favor', name: 'Favor & Open Doors', entries: [] },
    ],
  },
  {
    id: 'church',
    name: 'Church & Ministry',
    subCategories: [
      { id: 'church-leaders', name: 'Pastors & Leaders', entries: [] },
      { id: 'church-growth', name: 'Church Growth', entries: [] },
      { id: 'church-revival', name: 'Revival & Outpouring', entries: [] },
    ],
  },
  {
    id: 'nation',
    name: 'Nation & Leaders',
    subCategories: [
      { id: 'nation-government', name: 'Government Leaders', entries: [] },
      { id: 'nation-peace', name: 'Peace & Security', entries: [] },
      { id: 'nation-economy', name: 'Economy & Prosperity', entries: [] },
    ],
  },
];
