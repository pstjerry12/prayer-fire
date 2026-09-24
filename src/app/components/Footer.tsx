import SocialLinks from './SocialLinks';

export default function Footer() {
  return (
    <footer className="border-t border-edge mt-8 bg-card pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-danger-soft ring-1 ring-red-200 overflow-hidden">
            <img src="/logo.png" alt="Prayer Fire" className="w-full h-full object-cover" />
          </span>
          <span className="text-ink font-serif font-bold text-sm">Prayer Fire</span>
        </div>

        <p className="text-ink-muted text-[0.6875rem] mt-2">
          Write it. Speak it. Pray it. Trust God — Praying like Daniel.
        </p>
        <p className="text-ink-faint text-[0.625rem] mt-1">Pastor Jerry C.</p>

        <SocialLinks />
      </div>
    </footer>
  );
}
