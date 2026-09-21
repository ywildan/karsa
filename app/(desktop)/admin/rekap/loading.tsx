import { AdminNav } from "@/components/admin-nav";

export default function RekapLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat rekap poin">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="mt-2 h-4 w-[36rem] max-w-full rounded bg-muted" />
        <div className="mt-6 h-10 w-full max-w-md rounded bg-muted" />
        <div className="mt-5 rounded-lg border border-border bg-card p-4">
          <div className="h-11 w-48 rounded bg-muted" />
          <div className="mt-6 space-y-3">{[0, 1, 2, 3].map((item) => <div key={item} className="grid grid-cols-4 gap-3"><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /></div>)}</div>
        </div>
      </div>
    </main>
  );
}
