# Arsitektur Karsa

Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR — *"Setiap karsa, satu poin."*

Dokumen ini adalah peta terkini monorepo `ywildan/karsa`. Detail kolom/relasi
ada di `docs/archive/erd.md`.

## Peta repo

| Direktori | Isi |
|---|---|
| `app/` | Next.js 15 (App Router): landing, web app, admin panel (`/admin`), API routes `/api/mobile/v1/*`, auth |
| `karsa-mobile/` | Aplikasi Flutter Android (label launcher "SiKarsa") |
| `karsa-lib/` | Materi & demo Karsa Lib (artikel); API artikel/AI hidup di `app/api/mobile/v1/lib/` |
| `prisma/` | `schema.prisma` + SQL: `init.sql`, `karsa-lib-ai.sql`, `mobile-groups.sql`, `mobile-native.sql` |
| `scripts/` | `mobile_release.py` (versioning & release guard), skrip CI lain |
| `tests/` | Tes backend (`test_mobile_release*.py`, dsb.) |
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
- Guard: `middleware.ts` (Edge) + `requireAdmin` / `requirePj` / `requireUser` di server actions.
- Mobile memakai `MobileAuthRequest` → `MobileSession` (kode otorisasi, bukan cookie).
- Jika refresh snapshot user gagal, klaim akses di-fail-closed-kan (`is_admin`/`is_pj` = false) — lihat `docs/KEAMANAN.md`.

## Database

- Supabase PostgreSQL 17, schema `public`.
- Runtime aplikasi memakai role **`karsa_runtime`** (least-privilege + RLS); role `postgres` sudah dikeluarkan dari runtime.
- Backup memakai role **`karsa_backup`** (read-only, `BYPASSRLS`).
- Entitas inti: `User`, `Account`, `PoinLog`, `Kelas`, `KelasMatkul`, `Matkul`, `Prodi`, `Semester`, `KategoriPoin`, `AuditLog`, `Session`, `VerificationToken`, `MobileAuthRequest`, `MobileSession`, tabel grup (`GroupMessage`, `GroupReport`, `GroupBlock`), tabel AI Karsa Lib.

## Deploy & CI

- Web: Vercel (otomatis dari `main`).
- APK Android: GitHub Actions `.github/workflows/karsa-mobile-build.yml` — lihat `docs/RILIS-MOBILE.md`.
- Backup DB: `.github/workflows/database-backup.yml` — lihat `docs/OPERASIONAL.md`.

## Dokumen terkait

- `docs/TEMAN-BACA.md` — fitur AI "Teman baca"
- `docs/RILIS-MOBILE.md` — rilis APK
- `docs/PANDUAN-KONTRIBUSI.md` — alur kerja
- `docs/OPERASIONAL.md` — insiden, backup, SOP
- `docs/KEAMANAN.md` — status keamanan
- `docs/archive/` — dokumen historis (PRD, spec lama, ERD detail)
