/**
 * Karsa — components/dev-login-buttons.tsx
 * ----------------------------------------------------------------------------
 * 4 tombol Dev Quick Login (Fase 1). Client Component karena butuh
 * `useActionState` (pesan error + status pending).
 *
 * Komponen ini TIDAK memutuskan boleh-tidaknya dev login: keputusan itu ada di
 * server (`isDevAuthEnabled()` di `actions/auth.ts` dan `auth.ts`). Halaman
 * /login hanya merender komponen ini saat mode development.
 */
"use client";

import { useActionState } from "react";

import { devLoginAction } from "@/actions/auth";
import { Button } from "@/components/button";
import type { DevUser } from "@/lib/dev-users";

export function DevLoginButtons({ users }: { users: readonly DevUser[] }) {
  const [state, formAction, pending] = useActionState(devLoginAction, null);

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <form key={user.key} action={formAction}>
          <input type="hidden" name="dev_user" value={user.key} />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full justify-between font-normal"
            disabled={pending}
            aria-busy={pending}
          >
            <span>{user.label}</span>
            <span className="text-xs text-muted-foreground">
              {user.description}
            </span>
          </Button>
        </form>
      ))}

      <p aria-live="polite" className="min-h-4 text-center text-xs">
        {pending ? (
          <span className="text-muted-foreground">Memproses…</span>
        ) : state?.error ? (
          <span className="text-destructive">{state.error}</span>
        ) : null}
      </p>
    </div>
  );
}
