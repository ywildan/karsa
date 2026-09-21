export default function LeaderboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-8">
      <div className="animate-pulse" role="status" aria-label="Memuat leaderboard">
        <header className="border-b border-border pb-6"><div className="h-8 w-48 rounded bg-muted" /><div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" /></header>
        <section className="mt-6"><div className="h-5 w-28 rounded bg-muted" /><div className="mt-3 flex gap-2"><div className="h-10 w-36 rounded-full bg-muted" /><div className="h-10 w-44 rounded-full bg-muted" /></div></section>
        <section className="mt-8"><div className="h-6 w-24 rounded bg-muted" /><div className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="h-10 rounded bg-muted" />{[0, 1, 2, 3].map((item) => <div key={item} className="mt-3 grid grid-cols-[4rem_1fr_7rem_6rem] gap-3"><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /></div>)}</div></section>
      </div>
    </main>
  );
}
