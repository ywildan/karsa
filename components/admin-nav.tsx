/**
 * Karsa — components/admin-nav.tsx
 * ----------------------------------------------------------------------------
 * Navigasi tipis antar halaman admin (Fase 2A). Item "Kelas" menyusul di
 * Sub-Fase 2B. Link aktif ditandai aksen — butuh `usePathname`, jadi client
 * component; halaman induknya tetap server component dengan `requireAdmin()`.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/semester", label: "Semester" },
  { href: "/admin/prodi", label: "Prodi" },
  { href: "/admin/matkul", label: "Matkul" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi admin"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
