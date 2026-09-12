/** Shown for the moment between first paint and reading local storage. */
export function Skeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-40 rounded-panel bg-surface/70" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-card bg-surface/70" />
        ))}
      </div>
      <div className="h-72 rounded-panel bg-surface/70" />
      <span className="sr-only">Loading your goals…</span>
    </div>
  );
}
