import {
  BookHeart, BookOpen, Crown, Globe, Headphones, Music, NotebookPen, Pencil, Play, Podcast, PlayCircle, ScrollText, Siren, Sparkles,
  Timer, Users, Clock, Network, type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '@/lib/i18n/messages';

export type AppFeature = { id: string; icon: LucideIcon; name: MessageKey; desc: MessageKey; href?: string; action?: 'language' };

/**
 * Every app feature, in the order the Features page shows them: the daily prayer tools first, then the Bible and study, then
 * community, then learning and support. Names and descriptions come from locales/*.json (`feat.*`, `featDesc.*`).
 * An entry with `href` opens that page; the Language entry opens Settings (where the language is chosen).
 */
export const APP_FEATURES: AppFeature[] = [
  { id: 'workshop', icon: Pencil, name: 'feat.workshop', desc: 'featDesc.workshop', href: '/workshop' },
  { id: 'startup', icon: Play, name: 'feat.startUp', desc: 'featDesc.startUp', href: '/startup' },
  { id: 'schedule', icon: Clock, name: 'feat.schedule', desc: 'featDesc.schedule', href: '/schedule' },
  { id: 'journal', icon: BookHeart, name: 'feat.journal', desc: 'featDesc.journal', href: '/journal' },
  { id: 'fasting', icon: Timer, name: 'feat.fasting', desc: 'featDesc.fasting', href: '/fasting' },
  { id: 'bible', icon: BookOpen, name: 'feat.bible', desc: 'featDesc.bible', href: '/bible' },
  { id: 'audio', icon: Headphones, name: 'feat.audioBible', desc: 'featDesc.audioBible', href: '/bible' },
  { id: 'verses', icon: ScrollText, name: 'feat.verses', desc: 'featDesc.verses', href: '/prayer-verses' },
  { id: 'study', icon: NotebookPen, name: 'feat.study', desc: 'featDesc.study', href: '/study' },
  { id: 'scripture', icon: Sparkles, name: 'feat.scripture', desc: 'featDesc.scripture', href: '/scripture' },
  { id: 'worship', icon: Music, name: 'feat.worship', desc: 'featDesc.worship', href: '/worship' },
  { id: 'groups', icon: Users, name: 'feat.groups', desc: 'featDesc.groups', href: '/groups' },
  { id: 'alerts', icon: Siren, name: 'feat.alerts', desc: 'featDesc.alerts', href: '/alerts' },
  { id: 'network', icon: Network, name: 'feat.network', desc: 'featDesc.network', href: '/network' },
  { id: 'howto', icon: PlayCircle, name: 'feat.howto', desc: 'featDesc.howto', href: '/how-to' },
  { id: 'podcast', icon: Podcast, name: 'feat.podcast', desc: 'featDesc.podcast', href: '/podcast' },
  { id: 'language', icon: Globe, name: 'feat.language', desc: 'featDesc.language', action: 'language' },
  { id: 'partner', icon: Crown, name: 'feat.partner', desc: 'featDesc.partner', href: '/partner' },
  { id: 'manual', icon: BookOpen, name: 'feat.manual', desc: 'featDesc.manual', href: '/manual' },
];
