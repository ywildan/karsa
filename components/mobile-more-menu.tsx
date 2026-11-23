"use client";

/**
 * Karsa — components/mobile-more-menu.tsx
 * ----------------------------------------------------------------------------
 * Menu tambahan shell PJ: Karsa Lib, Grup, dan Akun. Dipakai sebagai dropdown
 * agar bottom nav tetap empat tab.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  MessagesSquare,
  MoreVertical,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function MobileMoreMenu({ hasClass }: { hasClass: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items: MenuItem[] = [
    { href: "/karsa-lib", label: "Karsa Lib", icon: BookOpenText },
    ...(hasClass
      ? [{ href: "/grup", label: "Grup kelas", icon: MessagesSquare }]
      : []),
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Menu lainnya"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <X className="h-4 w-4" aria-hidden />
        ) : (
          <MoreVertical className="h-4 w-4" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Menu lainnya"
          className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-soft"
        >
          {items.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onNavigate={() => setOpen(false)}
            />
          ))}
          <div className="my-1 h-px bg-border" aria-hidden />
          <MenuLink
            item={{ href: "/akun", label: "Akun", icon: UserRound }}
            active={pathname === "/akun"}
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  item,
  active,
  onNavigate,
}: {
  item: MenuItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {item.label}
    </Link>
  );
}
