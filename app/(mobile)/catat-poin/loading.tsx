export default function CatatPoinLoading() {
  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <div className="animate-pulse" role="status" aria-label="Memuat daftar mata kuliah">
        <div className="h-7 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-52 rounded bg-muted" />
        <div className="mt-5 h-4 w-72 max-w-full rounded bg-muted" />
        <div className="mt-4 grid gap-3">{[0, 1, 2].map((item) => <div key={item} className="rounded-xl border border-border bg-card p-4"><div className="flex justify-between gap-4"><div className="flex-1"><div className="h-5 w-2/3 rounded bg-muted" /><div className="mt-2 h-4 w-full rounded bg-muted" /><div className="mt-2 h-3 w-3/4 rounded bg-muted" /></div><div className="h-7 w-12 rounded-full bg-muted" /></div></div>)}</div>
      </div>
    </main>
  );
}
