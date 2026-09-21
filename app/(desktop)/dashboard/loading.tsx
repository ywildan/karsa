export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="animate-pulse" role="status" aria-label="Memuat rapor">
        <header className="flex justify-between gap-4 border-b border-border pb-6">
          <div className="flex-1"><div className="h-4 w-28 rounded bg-muted" /><div className="mt-3 h-8 w-56 max-w-full rounded bg-muted" /><div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" /></div>
          <div className="h-11 w-36 rounded bg-muted" />
        </header>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8"><div className="h-4 w-40 rounded bg-muted" /><div className="mt-4 h-14 w-28 rounded bg-muted" /><div className="mt-3 h-4 w-64 max-w-full rounded bg-muted" /></section>
        <section className="mt-8"><div className="h-6 w-32 rounded bg-muted" /><div className="mt-4 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="rounded-2xl border border-border bg-card p-5"><div className="flex justify-between gap-4"><div className="h-5 w-1/2 rounded bg-muted" /><div className="h-5 w-20 rounded bg-muted" /></div><div className="mt-4 h-2 rounded-full bg-muted" /></div>)}</div></section>
      </div>
    </main>
  );
}
