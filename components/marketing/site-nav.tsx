/**
 * Karsa — components/marketing/site-nav.tsx
 * ----------------------------------------------------------------------------
 * Navigasi atas untuk halaman marketing (hub brand di `/` dan halaman
 * produk `/product/*`): wordmark Karsa, menu dropdown, toggle tema, dan
 * tombol masuk. Memakai komponen yang sama dengan aplikasi (Button,
 * ThemeToggle) agar bahasanya satu keluarga.
 */
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/button";
import { LandingMenu } from "@/components/landing-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav({ initialDark }: { initialDark: boolean }) {
  return (
    <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
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

      <div className="flex items-center gap-2">
        <LandingMenu />
        <ThemeToggle initialDark={initialDark} />
        <Button asChild className="ml-1 hidden sm:inline-flex">
          <Link href="/login">Masuk dengan Google</Link>
        </Button>
      </div>
    </header>
  );
}
