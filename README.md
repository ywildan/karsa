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

# 4. Seed: 4 KategoriPoin + 1 Semester aktif
npm run db:seed

# 5. Verifikasi
npx tsc --noEmit
npm run lint
npm run build
```

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
