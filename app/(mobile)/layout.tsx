/**
 * Karsa — app/(mobile)/layout.tsx
 * ----------------------------------------------------------------------------
 * Shell mobile PJ (PRD §10.1): header tipis + banner desktop-UA + bottom nav.
 * Banner memakai UA fisik, bukan cookie (hint "buka di HP" hanya relevan
 * kalau request ini datang dari desktop).
 */

import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requirePj } from "@/lib/auth-helpers";
import { detectChannelFromUserAgent, MOBILE_HOME } from "@/lib/channel";

export default async function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requirePj();
  const ua = (await headers()).get("user-agent");
  const showDesktopHint = detectChannelFromUserAgent(ua) === "desktop";
  const displayName = user.name?.trim() || user.email || "Pengguna Karsa";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-lg items-center justify-between gap-2 px-4">
          <Link
            href={MOBILE_HOME}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Image
              src="/icon.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="rounded-md"
            />
            <span>Karsa</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[8rem] truncate text-xs text-muted-foreground sm:inline">
              {displayName}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>

      {showDesktopHint ? (
        <div
          role="status"
          className="border-b border-border bg-accent px-4 py-2 text-center text-xs text-accent-foreground"
        >
          Buka di HP untuk pengalaman terbaik.
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</div>
      <MobileBottomNav />
    </div>
  );
}
