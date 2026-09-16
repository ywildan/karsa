"use client";

/**
 * Karsa — components/mobile-bottom-nav.tsx
 * ----------------------------------------------------------------------------
 * Bottom nav 3 tab channel mobile (PRD §7.2, §10.1). Tap target ≥ 44px.
 */

import { ClipboardList, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/catat-poin", label: "Input", icon: Plus },
  { href: "/riwayat-poin", label: "Riwayat", icon: ClipboardList },
  { href: "/poin-saya", label: "Poin Saya", icon: User },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-safe backdrop-blur"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active
                    ? "font-medium text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
