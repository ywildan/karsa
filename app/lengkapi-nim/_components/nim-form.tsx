"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { completeNim } from "@/actions/profil";
import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NIM_MESSAGE, NIM_REGEX } from "@/lib/mahasiswa";

export function NimForm() {
  const router = useRouter();
  const [nim, setNim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = nim.trim();
    if (!NIM_REGEX.test(value)) {
      setError(NIM_MESSAGE);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await completeNim({ nim: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message ?? "NIM tersimpan.");
      // Ke `/`: middleware + root mengarahkan ke home channel yang benar,
      // dan klaim sesi terbaca segar dari DB di request berikutnya.
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="nim">NIM (Nomor Induk Mahasiswa)</Label>
        <Input
          id="nim"
          name="nim"
          value={nim}
          onChange={(event) => setNim(event.target.value.replace(/[^\d]/g, ""))}
          placeholder="Tulis NIM kamu"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={15}
          aria-invalid={error ? true : undefined}
          aria-describedby="nim-hint nim-error"
          disabled={pending}
        />
        <p id="nim-hint" className="text-xs text-muted-foreground">
          {NIM_MESSAGE} NIM tidak bisa diganti setelah disimpan, jadi pastikan
          tidak salah ketik.
        </p>
        {error ? (
          <p id="nim-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending || nim.trim().length === 0}>
        {pending ? "Menyimpan…" : "Simpan NIM dan lanjutkan"}
      </Button>
    </form>
  );
}
