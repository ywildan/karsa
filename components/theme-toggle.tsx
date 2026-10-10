"use client";

/**
 * Karsa — components/theme-toggle.tsx
 * ----------------------------------------------------------------------------
 * Tombol bundar matahari/bulan untuk mode gelap web (satu-satunya bentuk
 * toggle yang dipakai — sesuai desain yang disetujui pemilik).
 *
 * Klik: balik class `dark` di <html> seketika (transisi warna dari
 * `globals.css`), lalu simpan pilihan ke cookie `karsa_theme` agar render
 * server berikutnya langsung benar. State ikon mengikuti `initialDark` dari
 * server, lalu dikelola lokal setelah klik.
 */
import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_COOKIE, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  initialDark,
  className,
}: {
  initialDark: boolean;
  className?: string;
}) {
  const [mode, setMode] = React.useState<ThemeMode>(initialDark ? "dark" : "light");
  const isDark = mode === "dark";

  function toggle() {
    const next: ThemeMode = isDark ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setMode(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      aria-pressed={isDark}
      title={isDark ? "Mode terang" : "Mode gelap"}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
