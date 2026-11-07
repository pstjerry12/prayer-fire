'use client';

import { useCachedJson } from '@/lib/cachedJson';
import { Play, Camera, MessageCircle, Music2 } from 'lucide-react';
import { useI18n } from '@/app/i18n';

interface Links {
  youtube: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
  tiktok: string;
}

export default function SocialLinks() {
  const { t } = useI18n();
  const links = useCachedJson<Links>('/api/social-links', 10 * 60 * 1000);

  if (!links) return null;

  const items = [
    { key: 'youtube', href: links.youtube, label: 'YouTube', icon: Play, className: 'bg-danger' },
    { key: 'facebook', href: links.facebook, label: 'Facebook', icon: null, className: 'bg-acc' },
    { key: 'instagram', href: links.instagram, label: 'Instagram', icon: Camera, className: 'bg-gradient-to-br from-acc via-acc to-acc' },
    { key: 'whatsapp', href: links.whatsapp, label: 'WhatsApp', icon: MessageCircle, className: 'bg-acc' },
    { key: 'tiktok', href: links.tiktok, label: 'TikTok', icon: Music2, className: 'bg-black' },
  ].filter((item) => (item.href ?? '').trim());

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <p className="text-ink-faint text-[0.625rem] uppercase tracking-wider font-bold">{t('socialLinks.followUs')}</p>
      <div className="flex items-center justify-center gap-3">
        {items.map(({ key, href, label, icon: Icon, className }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`grid h-9 w-9 place-items-center rounded-full text-white shadow-sm hover:opacity-90 transition ${className}`}
          >
            {Icon ? <Icon className="w-4 h-4" /> : <span className="font-serif font-bold text-sm">f</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
