export default function Footer() {
  return (
    <footer className="border-t border-edge mt-8 bg-card">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-danger-soft ring-1 ring-red-200 overflow-hidden">
            <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
          </span>
          <span className="text-ink font-serif font-bold">Prayer Fire Movement</span>
        </div>

        <p className="text-ink-muted text-xs mt-3">Ignite. Intercede. Overcome.</p>
        <p className="text-ink-faint text-[11px] mt-1">
          Write it. Speak it. Pray it. Trust God — Praying like Daniel.
        </p>
        <p className="text-ink-soft text-[11px] font-semibold mt-3">
          A ministry of Pst Jerry Chijioke
        </p>
      </div>
    </footer>
  );
}
