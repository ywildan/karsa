import { AdminNav } from "@/components/admin-nav";

export default function KelasLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat kelas">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-[34rem] max-w-full rounded bg-muted" />
        <div className="mt-6 rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:justify-between"><div className="h-10 w-full rounded bg-muted sm:w-64" /><div className="h-11 w-36 rounded bg-muted" /></div>
          <div className="space-y-4 p-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="grid grid-cols-[1fr_1fr_1fr_6rem] gap-4"><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /></div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
