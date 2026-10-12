# Karsa

**Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**
*Setiap karsa, satu poin.*

> Dokumen sumber kebenaran: [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md) · [Teman baca](docs/TEMAN-BACA.md) · [Rilis mobile](docs/RILIS-MOBILE.md) · [Kontribusi](docs/PANDUAN-KONTRIBUSI.md) · [Operasional](docs/OPERASIONAL.md) · [Keamanan](docs/KEAMANAN.md)

---

## Status

**Berjalan di produksi.** Web Next.js melayani aplikasi desktop + API mobile, dan
aplikasi Android **SiKarsa** (Flutter) sudah rilis hingga `2.0.19+21`.
Autentikasi Google (Auth.js v5) terpasang penuh, termasuk jalur login khusus
mobile (`/api/mobile/v1/auth/*`).

Build dan rilis tidak dilakukan dari mesin pengembang: web dibangun otomatis
oleh Vercel dari `main`, APK Android dibangun oleh GitHub Actions
([`docs/RILIS-MOBILE.md`](docs/RILIS-MOBILE.md)). Karena itu clone repo ini tidak
berisi `node_modules` dan verifikasi pertama kali memang perlu `npm install`
di lokal.

Perkembangan proyek pernah dicatat sebagai fase (Fase 0 → Fase 3A). Label fase
itu kini hanya sejarah — rekamannya ada di [`docs/archive/`](docs/archive/),
bukan sebagai acuan status.

---

## Komponen repo

| Direktori | Isi |
|---|---|
| `app/` | Next.js 15 (App Router): web desktop, halaman mobile, panel admin, API `/api/mobile/v1/*` |
| `karsa-mobile/` | Aplikasi Flutter Android (label launcher "SiKarsa") |
| `karsa-lib/` | Materi & demo Karsa Lib; implementasi hidup di `app/api/mobile/v1/lib/` dan `lib/karsa-lib/` |
| `prisma/` | `schema.prisma` (sumber kebenaran struktur data) + `init.sql` dan SQL additif |
| `docs/` | Dokumen aktif + [`docs/archive/`](docs/archive/) untuk snapshot historis |
| `actions/`, `lib/`, `components/` | Server actions, kode bersama, UI |

---

## Verifikasi di lokal

```bash
# 1. Dependency
npm install

# 2. Environment
cp .env.example .env      # lalu isi DATABASE_URL, DIRECT_URL, AUTH_*, dsb.

# 3. Struktur database — pilih SALAH SATU:
#    a) Jalankan langsung di Supabase SQL Editor (tanpa butuh engine Prisma)
#       → tempel isi prisma/init.sql
#    b) Atau lewat Prisma (butuh koneksi langsung / DIRECT_URL)
npx prisma generate
npx prisma db push

# 4. Seed: 4 KategoriPoin + 1 Semester aktif + data uji
npm run db:seed

# 5. Verifikasi
npm run typecheck
npm run lint
npm run build
```

### Test user (Dev Quick Login)

Blok SEED di `prisma/init.sql` **dan** `npm run db:seed` sama-sama membuat data
uji ini — jadi kamu bisa ganti role tanpa akun Google asli:

| Email | NIM | Peran |
|---|---|---|
| `admin@students.untidar.ac.id` | — | admin (`is_admin = true`, tanpa kelas) |
| `pj.budi@students.untidar.ac.id` | 2310501001 | PJ TI-01 (pemegang KelasMatkul Algoritma dan Pemrograman) |
| `siti.aminah@students.untidar.ac.id` | 2310501002 | mahasiswa TI-01 + PJ Pemrograman Web |
| `agus.santoso@students.untidar.ac.id` | 2310501003 | mahasiswa TI-01 |
| `user.baru@students.untidar.ac.id` | 2310501099 | tanpa kelas (`kelas_id = null`) |

Plus 1 Prodi (Teknik Informatika), 2 Matkul (Algoritma dan Pemrograman,
Pemrograman Web), 1 Kelas (TI-01), 2 KelasMatkul, dan 2 sample PoinLog.

Semua baris pakai id eksplisit (`usr_admin`, `prodi_ti`, `kelas_ti01`, dst.)
supaya mudah direferensikan. Data uji bisa dimatikan dengan
`SEED_TEST_DATA="false"` — **wajib** kalau seed dijalankan ke database produksi.

**Idempoten — aman dijalankan berulang.** `prisma/init.sql` dan `npm run db:seed`
sama-sama bisa dijalankan dua kali atau lebih tanpa error, tanpa duplikat user /
kelas / matkul, dan sample PoinLog tetap 2 baris (bukan menumpuk).

Dua hal yang perlu diperhatikan:

1. **Jalankan seed sebelum login Google pertama** untuk email test. Kalau user
   sudah terlanjur dibuat NextAuth (id cuid acak, email sama), seed akan
   melewatinya supaya tidak menimpa role — hapus baris user itu (beserta
   `Account`/`Session`-nya) lalu jalankan seed lagi.
2. **Sample PoinLog akan dibuat ulang** kalau kamu menghapusnya lewat app lalu
   menjalankan seed lagi (id-nya tetap, jadi dianggap baris yang sama).

Seed juga sengaja tidak pernah menimpa baris yang sudah ada (`DO NOTHING` /
`update` idempoten), jadi perubahan role manual di panel admin tidak akan
tertimpa — kecuali tanggal & status aktif semester seed itu sendiri.

### `prisma/init.sql` vs `prisma/schema.prisma`

`schema.prisma` adalah sumber kebenaran struktur data. `init.sql` adalah
**cermin**-nya dalam bentuk SQL siap-tempel untuk Supabase — dipakai kalau
`prisma db push` tidak bisa dijalankan (mis. tanpa akses jaringan ke Supabase
atau tanpa engine Prisma). Selain `init.sql`, `prisma/` memuat SQL additif yang
sudah diterapkan bertahap: `mobile-native.sql`, `mobile-groups.sql`,
`mobile-groups-retention.sql`, `pengelola-scope.sql`, `karsa-lib-ai.sql`,
`karsa-lib-author-social.sql`, `user-growth.sql`.
**Kalau salah satu diubah, update keduanya.**

---

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build produksi (`prisma generate && next build`) |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:groups` | Kebijakan grup (policy murni) |
| `npm run test:groups:integration` | Integrasi API grup |
| `npm run test:pengelola` | Kebijakan lingkup pengelola |
| `npm run test:lib-ai` | Kebijakan AI Karsa Lib |
| `npm run test:lib-ai:integration` | Integrasi AI Karsa Lib |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Sinkronkan schema ke database |
| `npm run db:seed` | Seed kategori + semester (+ data uji) |
| `npm run db:studio` | Prisma Studio |

---

## Arsitektur singkat

```
Framework : Next.js 15 (App Router) + TypeScript strict
Styling   : Tailwind CSS + shadcn/ui
Database  : PostgreSQL 17 (Supabase), role runtime least-privilege + RLS
ORM       : Prisma 6
Auth      : Auth.js / NextAuth v5 — Google OAuth, JWT, PrismaAdapter
Mobile    : Flutter (karsa-mobile), login via kode otorisasi + session token
```

Autentikasi memakai **dua instance**: `auth.config.ts` (Edge-safe, tanpa Prisma,
dipakai `middleware.ts`) dan `auth.ts` (menambah PrismaAdapter). Klaim akses
di-refresh dari database setiap pembacaan session dan **fail-closed** jika
database error — lihat `docs/KEAMANAN.md`.

Dua channel (PRD §4.1): **mobile** (PJ input poin) dan **desktop** (rapor
mahasiswa + panel admin). Keduanya sudah terpasang sebagai route group
`app/(mobile)`, `app/(desktop)`, `app/(auth)`, `app/(public)`; `middleware.ts`
mendeteksi device dan menulis cookie channel untuk gating `/admin`,
`/pengelola`, dan jalur mobile.

Permukaan API mobile (`/api/mobile/v1/*`, 38 endpoint): auth PKCE (5), grup &
chat (10), Karsa Lib termasuk AI dan web search (14), plus poin, PJ assignment,
leaderboard, laporan, dan profil. Rinciannya di `docs/ARSITEKTUR.md`.
