// Shown at once, in place of a screen, while that screen's code and data are still on their way. Without this the
// old screen simply stayed put after a tap, which looked like the app had frozen.
export default function Loading() {
  const bar = 'rounded-lg bg-card-3 animate-pulse';
  return (
    <div role="status" aria-live="polite" aria-label="Loading">
      <div className="sticky top-0 z-40 safe-top bg-bar border-b border-bar-edge">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-card-3 animate-pulse" />
          <div className={`${bar} h-4 w-28`} />
        </div>
      </div>
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 space-y-4">
        <div className={`${bar} h-4 w-16`} />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-card-3 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className={`${bar} h-5 w-2/3`} />
            <div className={`${bar} h-3 w-1/3`} />
          </div>
        </div>
        <div className="rounded-2xl border border-edge bg-card p-4 space-y-3">
          <div className={`${bar} h-4 w-1/2`} />
          <div className={`${bar} h-3 w-full`} />
          <div className={`${bar} h-3 w-5/6`} />
        </div>
        <div className="rounded-2xl border border-edge bg-card p-4 space-y-3">
          <div className={`${bar} h-4 w-2/5`} />
          <div className={`${bar} h-3 w-full`} />
          <div className={`${bar} h-3 w-4/6`} />
        </div>
        <div className="rounded-2xl border border-edge bg-card p-4 space-y-3">
          <div className={`${bar} h-4 w-1/3`} />
          <div className={`${bar} h-3 w-full`} />
        </div>
      </main>
    </div>
  );
}
