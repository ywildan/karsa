/**
 * Karsa — components/marketing/site-nav.tsx
 * ----------------------------------------------------------------------------
 * Navigasi marketing: sticky di atas halaman hub brand dan halaman
 * produk. Wordmark kiri, tautan langsung ke section produk di tengah,
 * menu dropdown + toggle tema + pasangan CTA (ghost "Masuk" dan solid
 * "Buka SiKarsa") di kanan. Tautan langsung dilipat ke dropdown pada
 * layar kecil.
 */
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/button";
import { LandingMenu } from "@/components/landing-menu";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "Produk", href: "/product/sikarsa" },
  { label: "Cara Kerja", href: "/product/sikarsa#cara-kerja" },
  { label: "Fitur", href: "/product/sikarsa#fitur" },
  { label: "Keamanan", href: "/product/sikarsa#keamanan" },
  { label: "FAQ", href: "/product/sikarsa#faq" },
] as const;

export function SiteNav({ initialDark }: { initialDark: boolean }) {
  return (
    <div className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="rounded-md"
          />
          <span>Karsa</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LandingMenu />
          <ThemeToggle initialDark={initialDark} />
          <Button asChild variant="ghost" className="ml-1 hidden md:inline-flex">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/login">Buka SiKarsa</Link>
          </Button>
        </div>
      </header>
    </div>
  );
}
