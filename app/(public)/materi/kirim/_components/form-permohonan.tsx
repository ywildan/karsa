"use client";

/**
 * Karsa — app/(public)/materi/kirim/_components/form-permohonan.tsx
 * ----------------------------------------------------------------------------
 * Formulir permohonan materi. Client component karena memakai `useActionState`
 * (pesan sukses/gagal + status pending) dan dropdown prodi yang mengikuti
 * fakultas di sisi browser.
 *
 * Kolom `situs` adalah honeypot: tidak terlihat, tidak bisa dijangkau Tab, dan
 * harus tetap kosong. Server yang memutuskan (lihat actions/permohonan.ts).
 */
import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import { kirimPermohonan } from "@/actions/permohonan";
import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FakultasOpsi = {
  id: string;
  nama: string;
  prodi: { id: string; nama: string }[];
};

export function FormPermohonan({ fakultas }: { fakultas: FakultasOpsi[] }) {
  const [state, formAction, pending] = useActionState(kirimPermohonan, null);
  const [fakultasId, setFakultasId] = React.useState<string>("");

  const prodiTersedia =
    fakultas.find((item) => item.id === fakultasId)?.prodi ?? [];

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-primary/30 bg-primary/5 p-6"
      >
        <h2 className="text-lg font-bold tracking-tight">Permohonan terkirim</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {state.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/materi">Lihat materi yang sudah terbit</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="nama">Nama</Label>
          <Input
            id="nama"
            name="nama"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Nama lengkap"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            placeholder="nama@students.untidar.ac.id"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="fakultas">Fakultas</Label>
          <Select
            id="fakultas"
            value={fakultasId}
            onValueChange={(nilai) => setFakultasId(nilai)}
          >
            <option value="">— Pilih fakultas (opsional) —</option>
            {fakultas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}
              </option>
            ))}
          </Select>
          {/* Yang dikirim ke server adalah NAMA fakultas, bukan id: permohonan
              tetap terbaca walau data fakultas diubah di kemudian hari. */}
          <input
            type="hidden"
            name="fakultas"
            value={fakultas.find((item) => item.id === fakultasId)?.nama ?? ""}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="prodi">Program studi</Label>
          <Select id="prodi" name="prodi" disabled={prodiTersedia.length === 0}>
            <option value="">
              {prodiTersedia.length === 0
                ? "— Pilih fakultas dulu —"
                : "— Pilih program studi (opsional) —"}
            </option>
            {prodiTersedia.map((item) => (
              <option key={item.id} value={item.nama}>
                {item.nama}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="matkul">Mata kuliah</Label>
          <Input
            id="matkul"
            name="matkul"
            required
            maxLength={160}
            placeholder="Mata kuliah yang materinya kamu kirim"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="jenis">Jenis ujian</Label>
          <Select id="jenis" name="jenis" defaultValue="UTS">
            <option value="UTS">UTS</option>
            <option value="UAS">UAS</option>
            <option value="KUIS">Kuis</option>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pertemuan">Pertemuan (opsional)</Label>
          <Input
            id="pertemuan"
            name="pertemuan"
            maxLength={60}
            placeholder="mis. 1–7"
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="ringkasan">Ringkasan isi materi</Label>
          <Textarea
            id="ringkasan"
            name="ringkasan"
            required
            maxLength={1200}
            rows={4}
            placeholder="Cakupan apa saja yang dibahas, format berkasnya apa, dan siapa penyusunnya."
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Minimal 20 karakter. Ini yang dibaca pengelola lebih dulu.
          </p>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="tautan">Tautan berkas (opsional)</Label>
          <Input
            id="tautan"
            name="tautan"
            type="url"
            maxLength={400}
            placeholder="https://drive.google.com/…"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Karsa tidak menerima unggahan berkas. Taruh berkasnya di Drive atau
            GitHub, lalu tempel tautannya di sini — pastikan aksesnya bisa
            dibuka pengelola.
          </p>
        </div>
      </div>

      {/* Honeypot — jangan diisi manusia; disembunyikan dari tampilan & Tab. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="situs">Situs</label>
        <input id="situs" name="situs" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-5 flex items-start gap-2.5">
        <input
          id="izin"
          name="izin"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <Label htmlFor="izin" className="text-sm font-normal leading-6">
          Saya menyusun materi ini sendiri atau punya izin dari pemiliknya untuk
          membagikannya, dan bersedia disebut sebagai sumbernya.
        </Label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Mengirim…" : "Kirim permohonan"}
        </Button>
        <Link
          href="/materi"
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Batal
        </Link>
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {state?.error ? (
          <span className="text-destructive">{state.error}</span>
        ) : null}
      </p>
    </form>
  );
}
