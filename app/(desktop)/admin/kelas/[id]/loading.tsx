import { AdminNav } from "@/components/admin-nav";

export default function KelasDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat detail kelas">
        <div className="h-9 w-28 rounded bg-muted" />
        <div className="mt-4 h-8 w-44 rounded bg-muted" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" />
        <div className="mt-6 flex w-fit gap-2 rounded-lg border border-border p-1"><div className="h-8 w-32 rounded bg-muted" /><div className="h-8 w-32 rounded bg-muted" /></div>
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-5 flex justify-end"><div className="h-11 w-44 rounded bg-muted" /></div>
          <div className="space-y-4">{[0, 1, 2, 3].map((item) => <div key={item} className="grid grid-cols-[1fr_8rem_8rem_5rem] gap-4"><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /></div>)}</div>
        </div>
      </div>
    </main>
  );
}
