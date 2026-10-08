# Keamanan Karsa

Status keamanan terkini (hasil hardening September 2026). Jurnal langkah per
langkah diarsipkan di `docs/archive/SECURITY-HARDENING-LOG.md`.

> Jangan pernah menulis password, token, API key, atau secret di dokumen ini.

## Database

- Runtime aplikasi (Vercel Production & Preview) memakai role
  **`karsa_runtime`** — least privilege, tanpa bypass RLS, tanpa hak
  administratif. Role `postgres` sudah dikeluarkan dari runtime dan
  password-nya dirotasi (24 Sep 2026).
- RLS aktif di seluruh tabel aplikasi; grant `anon`/`authenticated` dicabut.
- Backup memakai role **`karsa_backup`** (hanya `SELECT`, `BYPASSRLS`,
  connection limit 2).
- Koneksi pooled: `DATABASE_URL` via Supavisor Transaction Pooler (port 6543)
  **wajib** dengan `?pgbouncer=true` agar Prisma tidak memakai prepared
  statement.

## Aplikasi

- **Security headers** aktif: `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
  `X-Permitted-Cross-Domain-Policies` (+ HSTS dari Vercel). CSP penuh belum
  dipasang (butuh desain nonce/hash).
- **WAF rate limit** (Vercel): `Karsa Mobile Auth Rate Limit` —
  `/api/mobile/v1/auth/*`, 200 request/menit/IP, mode **Log** (naikkan ke 429
  setelah observasi).
- **Fail-closed authorization**: kalau snapshot user gagal diverifikasi,
  `is_admin`/`is_pj` = false dan guard menolak klaim tak terverifikasi.
- **Safe DB errors**: kegagalan database di `/api/mobile/v1/*` → `503
  DATABASE_UNAVAILABLE` (tanpa detail exception ke client).
- Dependensi: `next-auth` sudah di-upgrade ke `5.0.0-beta.32` (advisory kritis
  tertangani).

## Aturan

- Secret hanya di GitHub Actions Secrets / Vercel env — tidak di repo, log,
  screenshot, atau chat.
- Restore tidak pernah diuji ke production (lihat `docs/OPERASIONAL.md`).
- MFA aktif di akun pengelola Supabase.
