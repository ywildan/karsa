import { AdminNav } from "@/components/admin-nav";

export default function MatkulLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat mata kuliah">
        <div className="h-8 w-44 rounded bg-muted" />
        <div className="mt-2 h-4 w-[32rem] max-w-full rounded bg-muted" />
        <div className="mt-6 rounded-lg border border-border bg-card">
          <div className="flex justify-end border-b border-border p-4"><div className="h-11 w-40 rounded bg-muted" /></div>
          <div className="space-y-4 p-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="grid grid-cols-[1fr_8rem_6rem] gap-4"><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /><div className="h-5 rounded bg-muted" /></div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
