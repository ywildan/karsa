/**
 * Karsa — app/(mobile)/catat-poin/page.tsx
 * ----------------------------------------------------------------------------
 * Tab "Input" channel mobile (Fase 3A, PRD §7.2 langkah 2): daftar
 * `KelasMatkul` yang dipegang PJ → tap kartu → list mahasiswa.
 *
 * Server component: guard `requireUser()` (layout `(mobile)` sudah menjalankan
 * `requirePj()`), lalu data diambil lewat `actions/poin.ts` yang memfilter
 * `pj_id = session.user.id` — jadi PJ tidak pernah melihat matkul orang lain.
 * Admin yang merangkap PJ (PRD §6) memakai halaman yang sama.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Info, Users } from "lucide-react";

import { getMatkulsAsPj } from "@/actions/poin";
import { requireUser } from "@/lib/auth-helpers";
import { tanggalHariIniWib } from "@/lib/poin";

export const metadata: Metadata = {
  title: "Catat poin",
};

export default async function CatatPoinPage() {
  const user = await requireUser();
  const matkuls = await getMatkulsAsPj();

  const namaPanggilan = user.name?.trim()?.split(/\s+/)[0] ?? "PJ";

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Catat poin</h1>
        <p className="text-sm text-muted-foreground">
          Halo {namaPanggilan} · {tanggalHariIniWib()} WIB
        </p>
      </header>

      {matkuls.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card p-5">
          <div className="flex items-start gap-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-medium">
                Kamu belum jadi PJ di matkul manapun
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Minta admin menugaskan kamu sebagai PJ lewat{" "}
                <span className="font-medium">
                  Admin → Kelas → (pilih kelas) → tab Matkul &amp; PJ
                </span>
                . Setelah ditugaskan, matkulnya muncul di sini.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {matkuls.length} matkul yang kamu pegang. Pilih untuk mencatat poin
            mahasiswa.
          </p>

          <ul className="grid gap-3">
            {matkuls.map((matkul) => (
              <li key={matkul.id}>
                <Link
                  href={`/catat-poin/${matkul.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{matkul.matkulName}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      Kelas {matkul.kelasName} · {matkul.prodiName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Semester {matkul.semesterName}
                      {matkul.matkulCode ? ` · ${matkul.matkulCode}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      <Users aria-hidden className="size-3.5" />
                      {matkul.jumlahMahasiswa}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
