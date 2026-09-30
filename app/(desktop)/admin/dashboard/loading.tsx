
export default function AdminDashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="animate-pulse space-y-8" role="status" aria-label="Memuat dashboard admin">
        <div>
          <div className="h-3 w-36 rounded bg-muted" />
          <div className="mt-3 h-8 w-72 max-w-full rounded bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted" />
        </div>
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="mt-5 h-7 w-80 max-w-full rounded bg-muted" />
          <div className="mt-4 h-4 w-96 max-w-full rounded bg-muted" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-2xl bg-muted" />
            <div className="h-20 rounded-2xl bg-muted" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </main>
  );
}
