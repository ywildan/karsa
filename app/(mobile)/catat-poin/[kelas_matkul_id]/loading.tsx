export default function CatatPoinDetailLoading() {
  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <div className="animate-pulse" role="status" aria-label="Memuat mahasiswa">
        <div className="h-11 w-28 rounded bg-muted" />
        <div className="mt-4 h-7 w-56 rounded bg-muted" />
        <div className="mt-2 h-4 w-full rounded bg-muted" />
        <div className="mt-2 h-11 w-28 rounded bg-muted" />
        <div className="mt-5 h-11 w-full rounded-lg bg-muted" />
        <div className="mt-3 grid gap-3">{[0, 1, 2, 3].map((item) => <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><div className="flex-1"><div className="h-5 w-1/2 rounded bg-muted" /><div className="mt-2 h-4 w-28 rounded bg-muted" /></div><div className="h-11 w-20 rounded bg-muted" /></div>)}</div>
      </div>
    </main>
  );
}
