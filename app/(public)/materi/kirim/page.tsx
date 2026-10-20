/**
 * Karsa — app/(public)/materi/kirim/page.tsx
 * ----------------------------------------------------------------------------
 * Formulir permohonan materi untuk publik (tanpa login), pintu masuk antrean
 * tinjauan admin di /admin/materi/permohonan.
 *
 * Server component: yang diambil dari server hanya daftar fakultas + prodi
 * untuk dropdown. Tidak ada data internal lain yang dikirim ke browser.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { prisma } from "@/lib/prisma";

import { FormPermohonan } from "./_components/form-permohonan";

export const metadata: Metadata = {
  title: "Kirim materi",
  description:
    "Kirim ringkasan atau kisi-kisi ujian untuk ditinjau pengelola SiKarsa. Terbuka untuk semua mahasiswa, tanpa akun.",
};

export const dynamic = "force-dynamic";

export default async function KirimMateriPage() {
  let fakultas: {
    id: string;
    name: string;
    prodis: { id: string; name: string }[];
  }[] = [];

  try {
    fakultas = await prisma.faculty.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        prodis: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    });
  } catch (error) {
    console.error("[materi/kirim] gagal memuat fakultas", error);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:pt-14">
        <Link
          href="/materi"
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Semua materi
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Materi
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Kirim materi untuk ditinjau.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Kalau kamu punya ringkasan, kisi-kisi, atau catatan ujian yang sudah
          rapi dan boleh dibagikan, kirim lewat formulir ini. Pengelola meninjau
          dulu sebelum menerbitkannya — tidak ada yang langsung tayang.
        </p>

        <div className="mt-8">
          <FormPermohonan
            fakultas={fakultas.map((item) => ({
              id: item.id,
              nama: item.name,
              prodi: item.prodis.map((prodi) => ({
                id: prodi.id,
                nama: prodi.name,
              })),
            }))}
          />
        </div>

        <div className="mt-10 rounded-xl border border-border bg-secondary/40 p-5">
          <h2 className="text-sm font-bold tracking-tight">Apa yang terjadi setelah dikirim</h2>
          <ol className="mt-3 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1.</span> Permohonan
              masuk ke antrean pengelola dengan status <em>menunggu</em>.
            </li>
            <li>
              <span className="font-semibold text-foreground">2.</span> Pengelola
              memeriksa isi dan izin berbaginya, lalu menghubungi emailmu kalau
              ada yang perlu dilengkapi.
            </li>
            <li>
              <span className="font-semibold text-foreground">3.</span> Kalau
              disetujui, materinya disusun ulang jadi deck mandiri dan terbit di{" "}
              <Link href="/materi" className="font-semibold text-primary underline-offset-4 hover:underline">
                /materi
              </Link>
              .
            </li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Jangan kirim materi yang tidak boleh dibagikan. Deck hasil modul dosen
            hanya bisa diterbitkan kalau ada izin dari pemiliknya, dan sumbernya
            akan dicantumkan.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
