# Karsa

**Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**
*Setiap karsa, satu poin.*

> Dokumen sumber kebenaran: [`docs/PRD-Karsa-v2.md`](docs/PRD-Karsa-v2.md)

---

## Status

**Fase 0 — code complete.** Seluruh file Fase 0 sudah ditulis. `prisma generate`,
`prisma db push`, `prisma db seed`, dan `next build` **belum dijalankan** di
sandbox (sandbox tidak bisa mengunduh engine Prisma dan tidak punya akses ke
Supabase). Verifikasi build & Prisma dilakukan di lokal.

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
npx tsc --noEmit
npm run lint
npm run build
```

### Test user (Dev Quick Login Fase 1)

Blok SEED di `prisma/init.sql` **dan** `npm run db:seed` sama-sama membuat data
uji ini — jadi kamu bisa ganti role tanpa akun Google asli:

| Email | NIM | Peran |
|---|---|---|
| `admin@students.untidar.ac.id` | — | admin (`is_admin = true`, tanpa kelas) |
| `pj.budi@students.untidar.ac.id` | 2310501001 | PJ (TI-01, pegang 2 KelasMatkul) |
| `siti.aminah@students.untidar.ac.id` | 2310501002 | mahasiswa TI-01 |
| `agus.santoso@students.untidar.ac.id` | 2310501003 | mahasiswa TI-01 |
| `user.baru@students.untidar.ac.id` | 2310501099 | tanpa kelas (`kelas_id = null`) |

Plus 1 Prodi (Teknik Informatika), 2 Matkul (Algoritma dan Pemrograman,
Pemrograman Web), 1 Kelas (TI-01), 2 KelasMatkul, dan 2 sample PoinLog.

Semua baris pakai id eksplisit (`usr_admin`, `prodi_ti`, `kelas_ti01`, dst.)
supaya mudah direferensikan di Fase 1. Data uji bisa dimatikan dengan
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
`prisma db push` tidak bisa dijalankan (mis. dari sandbox tanpa akses jaringan
ke Supabase atau tanpa engine Prisma). **Kalau salah satu diubah, update
keduanya.**

---

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Sinkronkan schema ke database |
| `npm run db:seed` | Seed kategori + semester |
| `npm run db:studio` | Prisma Studio |

---

## Arsitektur singkat

```
Framework : Next.js (App Router) + TypeScript strict
Styling   : Tailwind CSS + shadcn/ui
Database  : PostgreSQL (Supabase)
ORM       : Prisma 6
Auth      : NextAuth v5 (Google OAuth, JWT)   ← belum dipasang (fase berikutnya)
```

Dua channel (PRD §4.1): **mobile** (PJ input poin) dan **desktop** (rapor
mahasiswa + panel admin). Route group `(mobile)` & `(desktop)` beserta middleware
deteksi device dipasang di Fase 1.5.
