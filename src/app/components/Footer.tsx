import Link from 'next/link';
import { Flame } from 'lucide-react';

const FOOTER_LINKS = [
  { href: '/workshop', label: 'Write Prayer' },
  { href: '/startup', label: 'Start-Up Prayer' },
  { href: '/groups', label: 'Prayer Groups' },
  { href: '/worship', label: 'Worship' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/scripture', label: 'Scripture' },
  { href: '/bible', label: 'Bible' },
  { href: '/fasting', label: 'Fasting' },
  { href: '/network', label: 'Network' },
  { href: '/partner', label: 'Partner' },
];

export default function Footer() {
  return (
    <footer className="border-t border-edge mt-8 bg-card">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Brand */}
          <div className="md:max-w-xs">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-danger-soft ring-1 ring-red-200 overflow-hidden">
                <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
              </span>
              <span className="text-ink font-serif font-bold">Prayer Fire Movement</span>
            </div>
            <p className="text-ink-muted text-xs mt-2">Ignite. Intercede. Overcome.</p>
            <p className="text-ink-faint text-[11px] mt-1">
              Write it. Speak it. Pray it. Trust God — Praying like Daniel.
            </p>
            <p className="text-ink-soft text-[11px] font-semibold mt-3">
              A ministry of Pst Jerry Chijioke
            </p>
          </div>

          {/* Quick links */}
          <nav className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-ink-muted hover:text-acc-strong text-sm transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-ink-faint text-[11px] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-danger" />
            © {new Date().getFullYear()} Pst Jerry Chijioke Ministry. All rights reserved.
          </p>
          <p className="text-ink-faint text-[11px]">A cure for prayerlessness.</p>
        </div>
      </div>
    </footer>
  );
}
