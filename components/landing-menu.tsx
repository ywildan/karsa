"use client";

/**
 * Karsa — components/landing-menu.tsx
 * ----------------------------------------------------------------------------
 * Menu navigasi dropdown di pojok kanan atas landing tamu, di samping
 * toggle tema. Bukan sidebar: panel melayang di bawah tombol dan menutup
 * saat klik di luar, tombol Escape, atau setelah item dipilih.
 *
 * Item eksternal hanya dirender bila URL-nya sudah diisi, supaya tidak
 * pernah ada tautan mati yang terbit. Isi kedua konstanta di bawah ini
 * setelah alamat publiknya tersedia:
 *  · ANDROID_DOWNLOAD_URL — halaman publik SiKarsa di Uptodown.
 *  · LANDING_PAGE_URL — alamat publik karsa-landing.
 */
import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Globe,
  Menu,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ANDROID_DOWNLOAD_URL = "";
const LANDING_PAGE_URL = "";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

const EXTERNAL_ITEMS: MenuItem[] = [
  { label: "Unduh Android", href: ANDROID_DOWNLOAD_URL, icon: Smartphone, external: true },
  { label: "Landing Page", href: LANDING_PAGE_URL, icon: Globe, external: true },
];

const INTERNAL_ITEMS: MenuItem[] = [
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi", icon: ShieldCheck },
  { label: "Syarat Penggunaan", href: "/syarat-penggunaan", icon: FileText },
];

export function LandingMenu() {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const items = [
    ...EXTERNAL_ITEMS.filter((item) => item.href.trim().length > 0),
    ...INTERNAL_ITEMS,
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-4 w-4" aria-hidden />
        Menu
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Menu navigasi"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 animate-slide-up rounded-2xl border border-border bg-card p-1.5 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const className =
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
            const content = (
              <>
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="flex-1 text-left">{item.label}</span>
                {item.external ? (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
              </>
            );
            return item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                className={className}
                onClick={() => setOpen(false)}
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                className={className}
                onClick={() => setOpen(false)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
