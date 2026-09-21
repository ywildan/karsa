import { AdminNav } from "@/components/admin-nav";

export default function AuditLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat audit log">
        <div className="h-8 w-56 rounded bg-muted" />
        <div className="mt-2 h-4 w-[38rem] max-w-full rounded bg-muted" />
        <div className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item}><div className="h-4 w-20 rounded bg-muted" /><div className="mt-2 h-10 rounded bg-muted" /></div>)}</div>
        <div className="mt-5 h-4 w-32 rounded bg-muted" />
        <div className="mt-4 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="rounded-lg border border-border bg-card p-4"><div className="h-5 w-1/3 rounded bg-muted" /><div className="mt-3 h-4 w-2/3 rounded bg-muted" /><div className="mt-2 h-4 w-1/2 rounded bg-muted" /></div>)}</div>
      </div>
    </main>
  );
}
