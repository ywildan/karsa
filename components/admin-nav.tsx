"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  Landmark,
  Layers,
  LayoutDashboard,
  ScrollText,
  TableProperties,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Ruang kerja",
    items: [{ href: "/admin/dashboard", label: "Beranda", icon: LayoutDashboard }],
  },
  {
    label: "Operasional",
    items: [
      { href: "/admin/karsalib", label: "Karsa Lib", icon: BookOpenText },
      { href: "/admin/rekap", label: "Rekap poin", icon: TableProperties },
    ],
  },
  {
    label: "Data akademik",
    items: [
      { href: "/admin/semester", label: "Semester", icon: CalendarDays },
      { href: "/admin/fakultas", label: "Fakultas", icon: Landmark },
      { href: "/admin/prodi", label: "Program studi", icon: GraduationCap },
      { href: "/admin/kelas", label: "Kelas", icon: Layers },
      { href: "/admin/matkul", label: "Mata kuliah", icon: BookOpen },
    ],
  },
  {
    label: "Pengawasan",
    items: [{ href: "/admin/audit", label: "Audit log", icon: ScrollText }],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const currentPage = ALL_ITEMS.find((item) => isActive(pathname, item.href));
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto border-r border-border/70 bg-card/70 px-3 pb-5 pt-7 lg:flex">
        <div className="px-3 pb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Karsa Admin</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">Ruang Admin</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Kelola kegiatan kampus dari satu tempat.</p>
        </div>

        <nav aria-label="Navigasi admin" className="flex flex-1 flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-8 rounded-2xl border border-border/70 bg-background p-3">
          <p className="text-xs font-semibold">Butuh ringkasan?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Kembali ke beranda untuk melihat pekerjaan yang menunggu.</p>
          <Link href="/admin/dashboard" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">
            Buka beranda
          </Link>
        </div>
      </aside>

      <div className="border-b border-border bg-card/80 px-4 lg:hidden">
        <details ref={mobileMenuRef} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold">Ruang Admin</span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {currentPage?.label || "Menu admin"}
              <ChevronDown className="h-4 w-4 transition-transform duration-150 group-open:rotate-180" aria-hidden />
            </span>
          </summary>
          <nav aria-label="Navigasi admin" className="grid gap-4 border-t border-border/70 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          if (mobileMenuRef.current) mobileMenuRef.current.open = false;
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </details>
      </div>
    </>
  );
}
