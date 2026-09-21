import { AdminNav } from "@/components/admin-nav";

export default function AdminDashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <div className="animate-pulse" role="status" aria-label="Memuat dashboard admin">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-lg border border-border bg-card p-5">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="mt-4 h-9 w-16 rounded bg-muted" />
              <div className="mt-3 h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
