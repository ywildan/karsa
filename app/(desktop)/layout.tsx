/**
 * Karsa — app/(desktop)/layout.tsx
 * ----------------------------------------------------------------------------
 * Shell desktop (PRD §10.2–§10.3): header dengan logo → /dashboard,
 * nama user, logout, tombol "Mode HP". Route group tidak menambah URL.
 */

import Image from "next/image";
import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { ChannelToggle } from "@/components/channel-toggle";
import { getSession } from "@/lib/auth-helpers";
import { DESKTOP_HOME } from "@/lib/channel";

export default async function DesktopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const displayName =
    session?.user?.name?.trim() || session?.user?.email || "Pengguna Karsa";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link
            href={DESKTOP_HOME}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
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
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
              {displayName}
            </span>
            <ChannelToggle to="mobile" />
            {session?.user?.id ? (
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Keluar
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
