import { HeartHandshake } from 'lucide-react';

/**
 * Shown above the plans: most of Prayer Fire is free, and Partner / Leader are optional extras. Written so a visitor (and
 * anyone thinking of supporting the work) knows they do not need to pay to pray.
 */
export default function FreeNotice() {
  return (
    <div className="rounded-2xl border border-acc-edge bg-acc-soft p-4 flex items-start gap-3" data-testid="free-notice">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acc-soft-2 text-acc-strong">
        <HeartHandshake className="w-5 h-5" />
      </span>
      <div>
        <p className="text-heading font-bold text-sm">Most of Prayer Fire is free</p>
        <p className="text-ink-soft text-xs leading-relaxed mt-0.5">
          Writing prayers, guided prayer, the audio Bible, reminders, study notes and more cost nothing. Partner and Leader are
          optional: they add the community, backup and leading features below, and help support the work of Prayer Fire.
        </p>
      </div>
    </div>
  );
}
