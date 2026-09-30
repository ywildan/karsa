import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
