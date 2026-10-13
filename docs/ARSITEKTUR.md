# Arsitektur Karsa

Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR — *"Setiap karsa, satu poin."*

Dokumen ini adalah peta terkini monorepo `ywildan/karsa`. Sumber kebenaran
struktur data adalah `prisma/schema.prisma` — lengkap 29 model.
`docs/archive/erd.md` hanya diagram pada masa ia ditulis dan **tidak** memuat
model-model tambahan (Karsa Lib, AI, grup, pengelola, mobile session), jadi
jangan menjadikannya acuan kolom/relasi.

## Peta repo

| Direktori | Isi |
|---|---|
| `app/` | Next.js 15 (App Router): landing, web app, admin panel (`/admin`), API routes `/api/mobile/v1/*`, auth |
| `karsa-mobile/` | Aplikasi Flutter Android (label launcher "SiKarsa") |
| `karsa-lib/` | Materi & demo Karsa Lib (artikel); API artikel/AI hidup di `app/api/mobile/v1/lib/` |
| `prisma/` | `schema.prisma` + `init.sql` (cermin SQL siap-tempel) + SQL additif: `mobile-native.sql`, `mobile-groups.sql`, `mobile-groups-retention.sql`, `pengelola-scope.sql`, `karsa-lib-ai.sql`, `karsa-lib-author-social.sql`, `user-growth.sql` |
| `scripts/` | `mobile_release.py` (versioning & release guard), `vercel-ignore-build.sh`, skrip CI lain |
| `tests/` | Mayoritas tes backend TypeScript dijalankan lewat `tsx --test` / `node --test` (`group-policy.test.ts`, `pengelola-policy.test.ts`, `lib-ai.test.ts`, `lib-ai.integration.ts`, `group-api.integration.ts`); guard rilis Python lewat `test_mobile_release.py`. `user-growth.test.ts` ada di folder ini tetapi belum punya script npm maupun job CI — jalankan manual kalau dibutuhkan |
| `lib/`, `components/`, `actions/` | Kode bersama Next.js (server actions, UI) |
| `auth.ts`, `middleware.ts` | Auth.js + guard route Edge |

## Alur data

```
Flutter (Android) ──HTTPS──▶ Next.js API (/api/mobile/v1/*) ──Prisma──▶ PostgreSQL (Supabase)
Web / Admin       ──HTTPS──▶ Server Actions + Route Handlers ──Prisma──▶ PostgreSQL (Supabase)
```

## Autentikasi & otorisasi

- Login Google via Auth.js (NextAuth v5 beta); domain diizinkan `@students.untidar.ac.id` / `@untidar.ac.id`.
- Role: **admin** (akses penuh), **PJ** (catat/hapus poin sendiri), **mahasiswa** (rapor, leaderboard).
- Role delegasi: **pengelola** — wewenang admin yang dibatasi lingkup prodi/kelas, diturunkan dari tabel penunjukan `PengelolaAssignment` (meniru pola PJ; BUKAN flag di `User`). Hanya admin penuh yang menunjuk/mencabut (berbasis email, boleh sebelum orangnya login pertama; masa berlaku terikat semester penunjukan). Klaim `is_pengelola` + `pengelola_scopes` dibangun di `lib/user-snapshot.ts`; kebijakan lingkup murni ada di `lib/pengelola.ts`; area web-nya di route `/pengelola` (mobile API tidak berubah). Pengelola tidak bisa mengangkat pengelola lain, menghapus kelas, atau menyentuh master global (semester/fakultas/prodi/matkul/Karsa Lib).
- Guard: `middleware.ts` (Edge) + `requireAdmin` / `requirePj` / `requireUser` di server actions.
- Mobile memakai `MobileAuthRequest` → `MobileSession` (kode otorisasi, bukan cookie).
- Jika refresh snapshot user gagal, klaim akses di-fail-closed-kan (`is_admin`/`is_pj` = false) — lihat `docs/KEAMANAN.md`.

## Database

- Supabase PostgreSQL 17, schema `public`.
- Runtime aplikasi memakai role **`karsa_runtime`** (least-privilege + RLS); role `postgres` sudah dikeluarkan dari runtime.
- Backup memakai role **`karsa_backup`** (read-only, `BYPASSRLS`).
- 30 model `schema.prisma`, dikelompokkan:
  - **Master akademik**: `Prodi`, `Faculty`, `Matkul`, `Kelas`, `KelasMatkul`, `Semester`, `KategoriPoin`.
  - **Poin**: `PoinLog` (terikat `kelas_matkul_id`, nilai 1–4 divalidasi Zod + CHECK database, `idempotency_key` unik).
  - **Identitas & auth**: `User`, `Account`, `Session`, `VerificationToken`, `MobileAuthRequest`, `MobileSession`.
  - **Peran delegasi**: `PengelolaAssignment` (lingkup prodi/kelas, terikat semester).
  - **Grup kelas (mobile)**: `GroupMessage`, `GroupReport`, `GroupBlock`.
  - **Karsa Lib — konten (7)**: `LibProfile`, `LibAuthorRequest`, `LibAuthorAccess`, `LibArticle`, `LibArticleView`, `LibComment`, `LibReport`.
  - **Karsa Lib — AI (4)**: `LibAiSummary`, `LibAiTurn`, `LibAiUsageBucket` (bucket kuota pemakaian), `LibAiSummaryGeneration` (event pembuatan ringkasan untuk analitik usage per pengguna di `/admin/ai-usage`; migrasinya `prisma/ai-usage-analytics.sql`).
  - **Audit**: `AuditLog`.
- Kolom analitik pertumbuhan pengguna (`first_login_at` di `User` + index) ditambahkan lewat `prisma/user-growth.sql`; bukan model terpisah.
- Aturan drift: `init.sql` adalah cermin `schema.prisma`; mengubah salah satu wajib mengubah keduanya.

## Permukaan API mobile — `/api/mobile/v1/*`

38 route handler, dipakai aplikasi Flutter SiKarsa. Semua prefix di bawah `/api/mobile/v1/`.

| Kelompok | Route | Jumlah |
|---|---|---|
| Auth mobile (PKCE) | `auth/start`, `auth/exchange`, `auth/complete`, `auth/refresh`, `auth/logout` | 5 |
| Poin | `points`, `points/[id]`, `point-categories`, `report` | 4 |
| PJ & profil | `pj/assignments`, `pj/assignments/[assignmentId]/students`, `me` | 3 |
| Leaderboard | `leaderboard/[assignmentId]`, `leaderboard/options` | 2 |
| Grup & chat | `groups`, `groups/[assignmentId]/lock`, `groups/[assignmentId]/messages`, `.../messages/[messageId]`, `.../[messageId]/hide`, `.../[messageId]/pin`, `.../[messageId]/reports`, `groups/[assignmentId]/reports`, `.../reports/[reportId]/resolve`, `groups/blocks/[userId]` | 10 |
| Karsa Lib | `lib/bootstrap`, `lib/feed`, `lib/articles`, `lib/articles/[articleId]`, `lib/articles/[articleId]/ai`, `.../ai/messages`, `.../ai/summary`, `lib/articles/[articleId]/comments`, `lib/comments/[commentId]`, `lib/authors/[authorId]`, `lib/author-requests`, `lib/profile`, `lib/vault`, `lib/reports` | 14 |

Catatan:

- `lib/author-requests` + `lib/authors/[authorId]` adalah permukaan akun sosial penulis (pengajuan penulis, akses, profil publik) — migrasinya `prisma/karsa-lib-author-social.sql`.
- AI Karsa Lib (`.../ai*`) dan web search diatur kebijakan kuotanya; lihat `docs/TEMAN-BACA.md` dan `lib/karsa-lib/ai-policy.ts`.
- Analitik pertumbuhan pengguna (`app/(desktop)/admin` + `prisma/user-growth.sql`) dibaca dari kolom `User.first_login_at`; tidak punya route sendiri.

## Deploy & CI

- Web: Vercel (otomatis dari `main`).
- APK Android: GitHub Actions `.github/workflows/karsa-mobile-build.yml` — lihat `docs/RILIS-MOBILE.md`.
- Backup DB: `.github/workflows/database-backup.yml` — lihat `docs/OPERASIONAL.md`.

## Karsa Lib — perilaku UI artikel (mobile)

- **Kartu artikel full-tap**: seluruh `Card` dibungkus `InkWell` — ketuk di
  mana saja membuka artikel. Pengecualian: baris penulis membuka profil
  penulis, tombol `⋯` membuka menu Laporkan artikel.
- **Meta kartu**: nama penulis + waktu relatif, `N pembaca`, `N komentar`,
  cuplikan isi 3 baris.
- **Komentar ala Instagram**: list flat tanpa card putih; avatar 32px;
  username bold sebaris dengan isi; meta kecil (waktu relatif, `Balas` hanya
  untuk komentar induk, ikon `⋯` untuk Laporkan / Hapus komentar sendiri).
- **Balasan dilipat**: balasan disembunyikan secara default, dibuka via
  `— Lihat N balasan`.
- Komentar yang dihapus tampil miring: *Komentar dihapus*.

## Dokumen terkait

- `docs/TEMAN-BACA.md` — fitur AI "Teman baca"
- `docs/RILIS-MOBILE.md` — rilis APK
- `docs/PANDUAN-KONTRIBUSI.md` — alur kerja
- `docs/OPERASIONAL.md` — insiden, backup, SOP
- `docs/KEAMANAN.md` — status keamanan
- `docs/archive/` — dokumen historis (PRD, spec lama, ERD detail)
