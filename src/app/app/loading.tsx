/** Console page skeleton while a section loads (the sidebar stays in place). */
export default function ConsoleLoading() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="border-b border-line pb-6">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton mt-3 h-4 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-sm">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-sm">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton mt-2 h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
