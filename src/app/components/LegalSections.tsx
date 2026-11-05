import type { LegalSection } from '@/app/data/legal';

/**
 * The sections of a legal document (paragraph and/or bullet points). Used by the Terms, Privacy and Community Guidelines
 * pages and by the pop-ups in sign-in and Settings, so every place shows exactly the same text.
 * `variant="card"` is the full-page look; `variant="compact"` is the small pop-up look.
 */
export default function LegalSections({ sections, variant = 'card' }: { sections: LegalSection[]; variant?: 'card' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <>
        {sections.map((s) => (
          <div key={s.title} className="space-y-1.5">
            <h3 className="text-acc-strong text-sm font-bold">{s.title}</h3>
            {s.body && <p className="text-ink-soft text-xs leading-relaxed">{s.body}</p>}
            {s.bullets && (
              <ul className="list-disc pl-4 space-y-1">
                {s.bullets.map((b) => (
                  <li key={b} className="text-ink-soft text-xs leading-relaxed">{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </>
    );
  }
  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.title} className="bg-card rounded-2xl border border-edge p-5">
          <h2 className="font-serif-heading text-base font-bold text-ink">{s.title}</h2>
          {s.body && <p className="text-ink-soft text-sm leading-relaxed mt-2">{s.body}</p>}
          {s.bullets && (
            <ul className="mt-2 space-y-1.5 list-disc pl-5">
              {s.bullets.map((b) => (
                <li key={b} className="text-ink-soft text-sm leading-relaxed">{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
