/**
 * SiKarsa — components/landing/site-header.tsx
 * ----------------------------------------------------------------------------
 * Header publik yang menempel di atas (`sticky`). Aturan yang dijaga:
 *  · tombol "Masuk" SELALU terlihat — mayoritas pengunjung datang untuk
 *    langsung masuk, bukan membaca;
 *  · anonim tidak dipaksa login; tidak ada redirect dari halaman ini;
 *  · tap target ≥ 44px (`h-11`), tema mengikuti cookie yang sama dengan app.
 */
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_COOKIE, themeFromCookieValue } from "@/lib/theme";

const ANCHORS = [
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/materi", label: "Materi" },
  { href: "/#tanya", label: "Tanya jawab" },
] as const;

export async function SiteHeader() {
  const isDark =
    themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value) === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            className="rounded-lg"
            unoptimized
          />
          <span className="text-base font-bold tracking-tight">SiKarsa</span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {ANCHORS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle initialDark={isDark} />
          <Button asChild size="sm" className="h-11 px-4">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
