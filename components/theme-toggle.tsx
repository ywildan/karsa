"use client";

/**
 * Karsa — components/theme-toggle.tsx
 * ----------------------------------------------------------------------------
 * Tombol bundar matahari/bulan untuk mode gelap web (satu-satunya bentuk
 * toggle yang dipakai — sesuai desain yang disetujui pemilik).
 *
 * Klik: balik class `dark` di <html> + simpan pilihan ke cookie `karsa_theme`
 * agar render server berikutnya langsung benar.
 *
 * Bila browser mendukung View Transitions API dan user tidak mematikan
 * animasi, pergantian tema dianimasikan sebagai lingkaran yang membesar
 * dari titik tengah tombol ini (circular reveal, lihat `globals.css` untuk
 * keyframes-nya). Di luar kondisi itu, tema berganti instan dengan transisi
 * warna lembut seperti biasa — tidak ada yang rusak.
 */
import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

import { THEME_COOKIE, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Bentuk minimal API yang dipakai (tipe bawaan TS DOM belum tentu ada). */
type ViewTransitionLike = { finished: Promise<unknown> };
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

export function ThemeToggle({
  initialDark,
  className,
}: {
  initialDark: boolean;
  className?: string;
}) {
  const [mode, setMode] = React.useState<ThemeMode>(initialDark ? "dark" : "light");
  const isDark = mode === "dark";

  function applyTheme(next: ThemeMode) {
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setMode(next);
  }

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: ThemeMode = isDark ? "light" : "dark";
    const doc = document as DocumentWithViewTransition;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof doc.startViewTransition !== "function" || reduceMotion) {
      applyTheme(next);
      return;
    }

    // Titik pusat tombol yang diklik = pusat lingkaran reveal.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${endRadius}px`);
    // Selama reveal berjalan, matikan transisi warna global supaya tidak
    // ada dua animasi yang bertabrakan (lihat globals.css).
    root.dataset.themeAnim = "circle";

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        applyTheme(next);
      });
    });

    const cleanup = () => {
      delete root.dataset.themeAnim;
    };
    transition.finished.then(cleanup, cleanup);
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
