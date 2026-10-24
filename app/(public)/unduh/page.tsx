import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getLatestRelease } from "@/lib/unduh";

import { UnduhInstallButton } from "./_components/unduh-install-button";

/**
 * SiKarsa — app/(public)/unduh/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman unduh aplikasi Android, disusun seperti halaman listing toko
 * aplikasi: header dengan ikon dan tombol instal, lalu Yang baru,
 * Tentang, Keamanan data, dan Informasi aplikasi. Bedanya dari listing
 * toko aplikasi, halaman ini tidak menampilkan screenshot dan tidak
 * menampilkan metrik apa pun (rating, jumlah unduhan, ulasan) karena
 * angka itu belum ada buktinya.
 *
 * Versi, tanggal, dan isi "Yang baru" diambil dari rilis GitHub terbaru
 * repo ywildan/karsa (lihat lib/unduh.ts): begitu workflow
 * karsa-mobile-build.yml menerbitkan APK baru, halaman ini menampilkan
 * fitur-fiturnya tanpa perlu deploy. Bila API GitHub gagal dijangkau,
 * halaman tetap tampil dengan keadaan fallback dan tombol instal
 * mencoba mengambil info rilis dari sisi klien.
 */

export const metadata: Metadata = {
  title: "Unduh Aplikasi: SiKarsa",
  description:
    "Unduh SiKarsa versi terbaru untuk Android (arm64-v8a, Android 7+): pencatatan poin keaktifan mahasiswa Universitas Tidar, langsung dari HP. File APK resmi dari GitHub Releases ywildan/karsa.",
  alternates: { canonical: "/unduh" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Unduh Aplikasi: SiKarsa",
    description:
      "Pencatatan poin keaktifan mahasiswa Universitas Tidar, langsung dari HP.",
    locale: "id_ID",
    type: "website",
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export default async function UnduhPage() {
  const release = await getLatestRelease();
  const versionLabel = release ? `versi ${release.version}` : "versi terbaru";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <header className="flex items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt="Ikon aplikasi SiKarsa"
            className="h-20 w-20 shrink-0 rounded-2xl border border-border sm:h-24 sm:w-24"
          />
          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              SiKarsa
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Universitas Tidar</p>
            <p className="text-sm text-muted-foreground">
              Poin keaktifan mahasiswa
            </p>
          </div>
        </header>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-border py-4 text-center sm:max-w-md">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Versi
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {release?.version ?? "Terbaru"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arsitektur
            </dt>
            <dd className="mt-1 text-sm font-semibold">arm64-v8a</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bahasa
            </dt>
            <dd className="mt-1 text-sm font-semibold">Indonesia</dd>
          </div>
        </dl>

        <div className="mt-8">
          <UnduhInstallButton
            apkUrl={release?.apkUrl ?? null}
            releaseUrl={
              release?.releaseUrl ??
              "https://github.com/ywildan/karsa/releases/latest"
            }
          />
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            File APK resmi dari GitHub Releases ywildan/karsa. Android
            mungkin meminta izin memasang aplikasi dari browser, izinkan
            untuk melanjutkan.
          </p>
        </div>

        <Section title={`Yang baru di ${versionLabel}`}>
          {release && release.notes.length > 0 ? (
            release.notes.map((block, i) =>
              block.type === "list" ? (
                <ul key={i} className="list-disc space-y-1.5 pl-5">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{block.text}</p>
              ),
            )
          ) : (
            <p>
              Catatan rilis belum bisa dimuat saat ini. Daftar perubahan{" "}
              {versionLabel} ada di{" "}
              <a
                href={
                  release?.releaseUrl ??
                  "https://github.com/ywildan/karsa/releases/latest"
                }
                className="font-semibold text-primary underline underline-offset-4"
              >
                halaman rilis GitHub
              </a>
              .
            </p>
          )}
        </Section>

        <Section title="Tentang aplikasi ini">
          <p>
            SiKarsa adalah sistem pencatatan poin keaktifan mahasiswa
            Universitas Tidar. Mahasiswa melihat rapor poinnya, PJ mencatat
            poin saat kelas berjalan, dan pengelola serta admin mengatur
            kelas, mata kuliah, dan penugasan — semuanya dari HP, tanpa
            buku tulis atau spreadsheet terpisah.
          </p>
          <p>
            Di dalam aplikasi ada juga grup kelas untuk tiap mata kuliah
            dan Karsa Lib, tempat artikel mahasiswa dibaca sesuai fakultas
            dan program studi. Masuk memakai akun Google kampus, jadi
            setiap pengguna hanya melihat data yang sesuai peran dan
            kelasnya.
          </p>
        </Section>

        <Section title="Keamanan data">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Masuk dengan akun Google kampus.</strong> Akses
              dibatasi untuk domain kampus (@students.untidar.ac.id dan
              @untidar.ac.id) dan diperiksa lagi di server untuk setiap
              peran.
            </li>
            <li>
              <strong>Akses sesuai peran.</strong> Mahasiswa, PJ,
              pengelola, dan admin masing-masing hanya mendapat data yang
              menjadi wewenangnya.
            </li>
          </ul>
          <p>
            Rincian lengkap ada di{" "}
            <Link
              href="/kebijakan-privasi"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Kebijakan Privasi
            </Link>{" "}
            dan{" "}
            <Link
              href="/syarat-penggunaan"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Syarat Penggunaan
            </Link>
            .
          </p>
        </Section>

        <Section title="Informasi aplikasi">
          <dl className="divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Versi</dt>
              <dd className="font-medium">{release?.version ?? "Terbaru"}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Diperbarui</dt>
              <dd className="font-medium">{release?.publishedLabel || "—"}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Arsitektur</dt>
              <dd className="font-medium">arm64-v8a (Android 64-bit)</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Android minimum</dt>
              <dd className="font-medium">Android 7</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Bahasa</dt>
              <dd className="font-medium">Indonesia</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Pengembang</dt>
              <dd className="font-medium">SiKarsa · Universitas Tidar</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Kebijakan Privasi</dt>
              <dd className="font-medium">
                <Link
                  href="/kebijakan-privasi"
                  className="text-primary underline underline-offset-4"
                >
                  Baca Kebijakan Privasi
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted-foreground">Syarat Penggunaan</dt>
              <dd className="font-medium">
                <Link
                  href="/syarat-penggunaan"
                  className="text-primary underline underline-offset-4"
                >
                  Baca Syarat Penggunaan
                </Link>
              </dd>
            </div>
          </dl>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
