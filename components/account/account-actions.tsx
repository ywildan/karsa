"use client";

/**
 * Karsa — components/account/account-actions.tsx
 * ----------------------------------------------------------------------------
 * Aksi halaman akun web: segarkan klaim sesi (router.refresh) dan keluar
 * dengan dialog konfirmasi sebelum memanggil `signOutAction`.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, TriangleAlert, X } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";

export function AccountActions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="sm:flex-1"
        >
          <RefreshCw className={refreshing ? "animate-spin" : undefined} aria-hidden />
          {refreshing ? "Menyegarkan..." : "Segarkan profil"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          className="sm:flex-1"
        >
          <LogOut aria-hidden />
          Keluar dari SiKarsa
        </Button>
      </div>

      {confirmOpen ? <LogoutDialog onClose={() => setConfirmOpen(false)} /> : null}
    </>
  );
}

function LogoutDialog({ onClose }: { onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 bg-espresso/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-soft"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="logout-title" className="mt-4 text-lg font-semibold tracking-tight">
          Keluar dari SiKarsa?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Kamu perlu masuk lagi dengan akun Google kampus untuk melanjutkan.
          Perubahan yang belum tersimpan akan hilang.
        </p>
        <form action={signOutAction} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="destructive" className="flex-1">
            <LogOut aria-hidden />
            Keluar
          </Button>
          <Button
            ref={closeRef}
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <X aria-hidden />
            Batal
          </Button>
        </form>
      </div>
    </div>
  );
}
