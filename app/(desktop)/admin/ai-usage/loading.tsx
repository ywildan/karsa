export default function AiUsageLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" role="status" aria-label="Memuat penggunaan AI">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-2xl rounded bg-muted" />
      </div>
      <div className="animate-pulse space-y-5">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-muted" />
        <div className="h-72 rounded-2xl bg-muted" />
      </div>
    </main>
  );
}
