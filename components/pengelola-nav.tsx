"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, TableProperties, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/pengelola", label: "Kelas saya", icon: Layers },
  { href: "/pengelola/rekap", label: "Rekap poin", icon: TableProperties },
];

function isActive(pathname: string, href: string) {
  if (href === "/pengelola") return pathname === "/pengelola" || pathname.startsWith("/pengelola/kelas");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PengelolaNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto border-r border-border/70 bg-card/70 px-3 pb-5 pt-7 lg:flex">
        <div className="px-3 pb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Karsa Pengelola</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">Ruang Pengelola</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kelola kelas &amp; prodi sesuai lingkup penunjukanmu.
          </p>
        </div>

        <nav aria-label="Navigasi pengelola" className="flex flex-1 flex-col gap-6">
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Ruang kerja
            </p>
            <div className="space-y-0.5">
              {ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex gap-2 overflow-x-auto border-b border-border/70 bg-card/70 px-4 py-3 lg:hidden">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
