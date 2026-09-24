'use client';

import { useEffect, useState } from 'react';
import { Play, Camera, MessageCircle, Music2 } from 'lucide-react';

interface Links {
  youtube: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
  tiktok: string;
}

export default function SocialLinks() {
  const [links, setLinks] = useState<Links | null>(null);

  useEffect(() => {
    fetch('/api/social-links')
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => setLinks(null));
  }, []);

  if (!links) return null;

  const items = [
    { key: 'youtube', href: links.youtube, label: 'YouTube', icon: Play, className: 'bg-red-600' },
    { key: 'facebook', href: links.facebook, label: 'Facebook', icon: null, className: 'bg-blue-600' },
    { key: 'instagram', href: links.instagram, label: 'Instagram', icon: Camera, className: 'bg-gradient-to-br from-amber-500 via-pink-600 to-purple-600' },
    { key: 'whatsapp', href: links.whatsapp, label: 'WhatsApp', icon: MessageCircle, className: 'bg-emerald-600' },
    { key: 'tiktok', href: links.tiktok, label: 'TikTok', icon: Music2, className: 'bg-black' },
  ].filter((item) => item.href.trim());

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <p className="text-ink-faint text-[0.625rem] uppercase tracking-wider font-bold">Follow Us</p>
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
