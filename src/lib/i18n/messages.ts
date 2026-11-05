import type { Lang } from './languages';

/**
 * Screen text. English is the source: every key lives here first. A key that a language does not have yet shows in
 * English, so the app never shows a blank. Covers the main screens (menus, Home, Bible, Settings); the rest of the app
 * is still English. The non-English wording was written without a native speaker's review: have each language
 * checked (see docs/LANGUAGES.md).
 */
export const EN = {
  'nav.home': 'Home',
  'nav.write': 'Write',
  'nav.startUp': 'Start-Up',
  'nav.bible': 'Bible',
  'nav.scripture': 'Scripture',
  'nav.partners': 'Partners',
  'nav.fasting': 'Fasting',
  'home.badge': 'Pray 3x a Day',
  'home.tagline': 'Write it. Speak it. Pray it. Trust God.',
  'home.daniel': 'Praying like Daniel — a cure for prayerlessness',
  'home.writePoints': 'Write Prayer Points',
  'home.workshop': 'Prayer Workshop',
  'home.startUpPrayer': 'Start-Up Prayer',
  'home.sevenStep': '7-step guided',
  'home.schedule': 'Set Daily Schedule',
  'home.tileBible': 'Bible',
  'home.readOrSearch': 'Read or search',
  'home.tileVerses': 'Prayer Verses',
  'home.byTopic': 'Pray by topic',
  'home.tileStudy': 'My Study',
  'home.notes': 'Notes & bookmarks',
  'home.groups': 'Prayer Groups',
  'home.groupsHint': 'Pray together in teams',
  'home.network': 'Prayer Network',
  'home.networkHint': 'Stand in the gap for others worldwide',
  'home.audioBible': 'Audio Bible',
  'bible.title': 'Holy Bible',
  'bible.subtitle': 'Read or listen',
  'bible.translation': 'Bible translation',
  'bible.fallbackNote': 'There is no {language} Bible in the app yet, so the Bible stays in English.',
  'bible.credit': 'Bible text: {credit}',
  'settings.title': 'Account Settings',
  'settings.language': 'Language',
  'settings.languageHint': 'Choose the language of the app. The Bible follows it when a translation is available.',
  'common.home': 'Home',
} as const;

export type MessageKey = keyof typeof EN;
type Table = Partial<Record<MessageKey, string>>;

const FR: Table = {
  'nav.home': 'Accueil', 'nav.write': 'Écrire', 'nav.startUp': 'Départ', 'nav.bible': 'Bible', 'nav.scripture': 'Écriture', 'nav.partners': 'Partenaires', 'nav.fasting': 'Jeûne',
  'home.badge': 'Priez 3 fois par jour',
  'home.tagline': 'Écrivez-le. Dites-le. Priez-le. Faites confiance à Dieu.',
  'home.daniel': 'Prier comme Daniel — un remède contre l\'absence de prière',
  'home.writePoints': 'Écrire des sujets de prière', 'home.workshop': 'Atelier de prière',
  'home.startUpPrayer': 'Prière du matin', 'home.sevenStep': 'Guidée en 7 étapes',
  'home.schedule': 'Régler l\'horaire quotidien',
  'home.tileBible': 'Bible', 'home.readOrSearch': 'Lire ou chercher',
  'home.tileVerses': 'Versets de prière', 'home.byTopic': 'Prier par thème',
  'home.tileStudy': 'Mon étude', 'home.notes': 'Notes et favoris',
  'home.groups': 'Groupes de prière', 'home.groupsHint': 'Priez ensemble en équipe',
  'home.network': 'Réseau de prière', 'home.networkHint': 'Intercédez pour les autres dans le monde',
  'home.audioBible': 'Bible audio',
  'bible.title': 'Sainte Bible', 'bible.subtitle': 'Lire ou écouter', 'bible.translation': 'Traduction de la Bible',
  'bible.fallbackNote': 'Il n\'y a pas encore de Bible en {language} dans l\'application : la Bible reste en anglais.',
  'bible.credit': 'Texte biblique : {credit}',
  'settings.title': 'Paramètres du compte', 'settings.language': 'Langue',
  'settings.languageHint': 'Choisissez la langue de l\'application. La Bible la suit lorsqu\'une traduction existe.',
  'common.home': 'Accueil',
};

const ES: Table = {
  'nav.home': 'Inicio', 'nav.write': 'Escribir', 'nav.startUp': 'Empezar', 'nav.bible': 'Biblia', 'nav.scripture': 'Escritura', 'nav.partners': 'Socios', 'nav.fasting': 'Ayuno',
  'home.badge': 'Ora 3 veces al día',
  'home.tagline': 'Escríbelo. Dilo. Ora. Confía en Dios.',
  'home.daniel': 'Orar como Daniel — una cura para la falta de oración',
  'home.writePoints': 'Escribir peticiones', 'home.workshop': 'Taller de oración',
  'home.startUpPrayer': 'Oración de inicio', 'home.sevenStep': 'Guía de 7 pasos',
  'home.schedule': 'Configurar horario diario',
  'home.tileBible': 'Biblia', 'home.readOrSearch': 'Leer o buscar',
  'home.tileVerses': 'Versículos de oración', 'home.byTopic': 'Ora por tema',
  'home.tileStudy': 'Mi estudio', 'home.notes': 'Notas y marcadores',
  'home.groups': 'Grupos de oración', 'home.groupsHint': 'Oren juntos en equipo',
  'home.network': 'Red de oración', 'home.networkHint': 'Intercede por otros en todo el mundo',
  'home.audioBible': 'Biblia en audio',
  'bible.title': 'Santa Biblia', 'bible.subtitle': 'Leer o escuchar', 'bible.translation': 'Versión de la Biblia',
  'bible.fallbackNote': 'Todavía no hay una Biblia en {language} en la aplicación, así que la Biblia sigue en inglés.',
  'bible.credit': 'Texto bíblico: {credit}',
  'settings.title': 'Ajustes de la cuenta', 'settings.language': 'Idioma',
  'settings.languageHint': 'Elige el idioma de la aplicación. La Biblia lo sigue cuando hay una versión disponible.',
  'common.home': 'Inicio',
};

const PT: Table = {
  'nav.home': 'Início', 'nav.write': 'Escrever', 'nav.startUp': 'Partida', 'nav.bible': 'Bíblia', 'nav.scripture': 'Escritura', 'nav.partners': 'Parceiros', 'nav.fasting': 'Jejum',
  'home.badge': 'Ore 3 vezes ao dia',
  'home.tagline': 'Escreva. Fale. Ore. Confie em Deus.',
  'home.daniel': 'Orando como Daniel — a cura para a falta de oração',
  'home.writePoints': 'Escrever pedidos de oração', 'home.workshop': 'Oficina de oração',
  'home.startUpPrayer': 'Oração de partida', 'home.sevenStep': 'Guiada em 7 passos',
  'home.schedule': 'Definir horário diário',
  'home.tileBible': 'Bíblia', 'home.readOrSearch': 'Ler ou buscar',
  'home.tileVerses': 'Versículos de oração', 'home.byTopic': 'Ore por tema',
  'home.tileStudy': 'Meu estudo', 'home.notes': 'Notas e favoritos',
  'home.groups': 'Grupos de oração', 'home.groupsHint': 'Orem juntos em equipe',
  'home.network': 'Rede de oração', 'home.networkHint': 'Interceda por outros no mundo todo',
  'home.audioBible': 'Bíblia em áudio',
  'bible.title': 'Bíblia Sagrada', 'bible.subtitle': 'Ler ou ouvir', 'bible.translation': 'Tradução da Bíblia',
  'bible.fallbackNote': 'Ainda não há uma Bíblia em {language} no aplicativo, então a Bíblia continua em inglês.',
  'bible.credit': 'Texto bíblico: {credit}',
  'settings.title': 'Configurações da conta', 'settings.language': 'Idioma',
  'settings.languageHint': 'Escolha o idioma do aplicativo. A Bíblia acompanha quando há uma tradução disponível.',
  'common.home': 'Início',
};

const SW: Table = {
  'nav.home': 'Nyumbani', 'nav.write': 'Andika', 'nav.startUp': 'Anza', 'nav.bible': 'Biblia', 'nav.scripture': 'Maandiko', 'nav.partners': 'Washirika', 'nav.fasting': 'Kufunga',
  'home.badge': 'Omba mara 3 kwa siku',
  'home.tagline': 'Iandike. Ieleze. Iombe. Mtegemee Mungu.',
  'home.daniel': 'Kuomba kama Danieli — tiba ya kutoomba',
  'home.writePoints': 'Andika hoja za maombi', 'home.workshop': 'Warsha ya maombi',
  'home.startUpPrayer': 'Maombi ya kuanza siku', 'home.sevenStep': 'Hatua 7 za mwongozo',
  'home.schedule': 'Weka ratiba ya kila siku',
  'home.tileBible': 'Biblia', 'home.readOrSearch': 'Soma au tafuta',
  'home.tileVerses': 'Aya za maombi', 'home.byTopic': 'Omba kwa mada',
  'home.tileStudy': 'Funzo langu', 'home.notes': 'Maelezo na alama',
  'home.groups': 'Vikundi vya maombi', 'home.groupsHint': 'Ombeni pamoja kwa timu',
  'home.network': 'Mtandao wa maombi', 'home.networkHint': 'Simama pengoni kwa wengine duniani kote',
  'home.audioBible': 'Biblia ya sauti',
  'bible.title': 'Biblia Takatifu', 'bible.subtitle': 'Soma au sikiliza', 'bible.translation': 'Tafsiri ya Biblia',
  'bible.fallbackNote': 'Bado hakuna Biblia ya {language} kwenye programu, kwa hiyo Biblia inabaki kwa Kiingereza.',
  'bible.credit': 'Maandishi ya Biblia: {credit}',
  'settings.title': 'Mipangilio ya akaunti', 'settings.language': 'Lugha',
  'settings.languageHint': 'Chagua lugha ya programu. Biblia inaifuata pale tafsiri inapopatikana.',
  'common.home': 'Nyumbani',
};

const KO: Table = {
  'nav.home': '홈', 'nav.write': '쓰기', 'nav.startUp': '시작', 'nav.bible': '성경', 'nav.scripture': '말씀', 'nav.partners': '동역자', 'nav.fasting': '금식',
  'home.badge': '하루 3번 기도하세요',
  'home.tagline': '쓰고, 말하고, 기도하고, 하나님을 신뢰하세요.',
  'home.daniel': '다니엘처럼 기도하기 — 기도 부족의 치료제',
  'home.writePoints': '기도 제목 쓰기', 'home.workshop': '기도 워크숍',
  'home.startUpPrayer': '아침 시작 기도', 'home.sevenStep': '7단계 안내',
  'home.schedule': '매일 기도 시간 설정',
  'home.tileBible': '성경', 'home.readOrSearch': '읽기 또는 검색',
  'home.tileVerses': '기도 구절', 'home.byTopic': '주제별 기도',
  'home.tileStudy': '나의 공부', 'home.notes': '노트와 북마크',
  'home.groups': '기도 모임', 'home.groupsHint': '팀으로 함께 기도하세요',
  'home.network': '기도 네트워크', 'home.networkHint': '전 세계 사람들을 위해 중보하세요',
  'home.audioBible': '오디오 성경',
  'bible.title': '성경', 'bible.subtitle': '읽기 또는 듣기', 'bible.translation': '성경 번역본',
  'bible.fallbackNote': '앱에 아직 {language} 성경이 없어서 성경은 영어로 표시됩니다.',
  'bible.credit': '성경 본문: {credit}',
  'settings.title': '계정 설정', 'settings.language': '언어',
  'settings.languageHint': '앱 언어를 선택하세요. 번역본이 있으면 성경도 따라갑니다.',
  'common.home': '홈',
};

const TL: Table = {
  'nav.home': 'Home', 'nav.write': 'Isulat', 'nav.startUp': 'Simula', 'nav.bible': 'Bibliya', 'nav.scripture': 'Kasulatan', 'nav.partners': 'Kasama', 'nav.fasting': 'Pag-aayuno',
  'home.badge': 'Manalangin ng 3 beses sa isang araw',
  'home.tagline': 'Isulat. Sabihin. Ipanalangin. Magtiwala sa Diyos.',
  'home.daniel': 'Pananalangin tulad ni Daniel — lunas sa kakulangan ng panalangin',
  'home.writePoints': 'Isulat ang mga Panalangin', 'home.workshop': 'Workshop ng Panalangin',
  'home.startUpPrayer': 'Panimulang Panalangin', 'home.sevenStep': '7 hakbang na gabay',
  'home.schedule': 'Itakda ang Araw-araw na Iskedyul',
  'home.tileBible': 'Bibliya', 'home.readOrSearch': 'Basahin o hanapin',
  'home.tileVerses': 'Mga Talata ng Panalangin', 'home.byTopic': 'Manalangin ayon sa paksa',
  'home.tileStudy': 'Aking Pag-aaral', 'home.notes': 'Mga tala at bookmark',
  'home.groups': 'Mga Grupo ng Panalangin', 'home.groupsHint': 'Magdasal nang sama-sama bilang isang koponan',
  'home.network': 'Network ng Panalangin', 'home.networkHint': 'Manindigan para sa iba sa buong mundo',
  'home.audioBible': 'Audio Bibliya',
  'bible.title': 'Banal na Bibliya', 'bible.subtitle': 'Basahin o pakinggan', 'bible.translation': 'Salin ng Bibliya',
  'bible.fallbackNote': 'Wala pang {language} na Bibliya sa app, kaya nananatiling Ingles ang Bibliya.',
  'bible.credit': 'Teksto ng Bibliya: {credit}',
  'settings.title': 'Mga Setting ng Account', 'settings.language': 'Wika',
  'settings.languageHint': 'Piliin ang wika ng app. Sumusunod ang Bibliya kapag may magagamit na salin.',
  'common.home': 'Home',
};

export const MESSAGES: Record<Lang, Table> = { en: EN, fr: FR, es: ES, pt: PT, sw: SW, ko: KO, tl: TL };

/** The text for `key` in `lang`, in English if that language has no wording for it yet. `{name}` slots are filled from `vars`. */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string>): string {
  const raw = MESSAGES[lang]?.[key] ?? EN[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, name: string) => vars[name] ?? `{${name}}`);
}
