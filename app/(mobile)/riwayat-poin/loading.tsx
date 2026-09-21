export default function RiwayatPoinLoading() {
  return (
    <main className="flex flex-col gap-5 px-4 py-5">
      <div className="animate-pulse" role="status" aria-label="Memuat riwayat poin">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="mt-2 h-4 w-64 rounded bg-muted" />
        <div className="mt-5 h-10 w-full rounded bg-muted" />
        <div className="mt-4 grid gap-3">{[0, 1, 2, 3].map((item) => <div key={item} className="rounded-xl border border-border bg-card p-4"><div className="flex justify-between gap-4"><div className="h-5 w-1/2 rounded bg-muted" /><div className="h-7 w-12 rounded-full bg-muted" /></div><div className="mt-3 h-4 w-3/4 rounded bg-muted" /><div className="mt-2 h-3 w-1/2 rounded bg-muted" /></div>)}</div>
      </div>
    </main>
  );
}
