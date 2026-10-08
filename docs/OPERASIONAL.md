# Operasional Karsa

Gabungan runbook insiden, backup/restore database, dan SOP koreksi & retensi.
Detail historis ada di `docs/archive/`.

> Jangan menulis password, token, connection string lengkap, atau data pengguna
> di dokumen, issue, log, maupun percakapan.

## 1. Klasifikasi insiden

| Prioritas | Definisi | Target respons |
|---|---|---|
| **P0** | Aplikasi down total | ≤ 15 menit |
| **P1** | Fitur kritis rusak (input poin, login, data) | ≤ 30 menit |
| **P2** | Fitur non-kritis rusak/terdegradasi | Hari kerja yang sama |
| **P3** | Bug minor/UX tanpa risiko data | Backlog |

Kalau dampak belum jelas, pakai klasifikasi yang lebih tinggi dulu.

## 2. Penanganan

1. **Catat**: waktu mulai, URL, pesan error, deployment aktif.
2. **Diagnosa**: Vercel Logs → Supabase Logs → status Vercel/Supabase/Google.
   Bandingkan dengan deployment/perubahan DB terakhir.
3. **Mitigasi**: rollback deployment pemicu (Vercel → Deployments → redeploy
   yang stabil); hentikan tulis ke DB kalau berisiko merusak data.
4. **Resolusi**: perbaiki di branch terpisah, verifikasi, deploy.
5. **Post-mortem**: kronologi, akar masalah, durasi, tindakan pencegahan + PIC.

Status layanan: [vercel-status.com](https://www.vercel-status.com),
[status.supabase.com](https://status.supabase.com).

**Kontak eskalasi**: Yusuf Wildan Affandi — `yuwiaffa@gmail.com`.

## 3. Rollback database

1. Hentikan perubahan data.
2. Supabase → Database → Backups → pilih backup (retensi otomatis 7 hari).
3. Validasi tabel utama (`User`, `PoinLog`, `AuditLog`, `Kelas`, `KelasMatkul`)
   sebelum buka layanan.
4. Restore menghilangkan perubahan setelah waktu backup — harus disetujui admin
   dan dicatat di post-mortem.

## 4. Backup otomatis

- Setiap hari **01.00 WIB** via `.github/workflows/database-backup.yml`.
- Format: PostgreSQL 17 custom-format dump schema `public`, terenkripsi
  AES-256-CBC (PBKDF2-SHA256, 600.000 iterasi).
- Artifact terenkripsi di GitHub Actions, retensi **30 hari**. RPO ±24 jam.
- Role backup: `karsa_backup` (read-only, `BYPASSRLS`, connection limit 2).
- Secrets: `BACKUP_DATABASE_URL`, `BACKUP_ENCRYPTION_PASSWORD`,
  `RESTORE_TEST_DATABASE_URL`. Password enkripsi wajib tersimpan di password
  manager — tanpanya artifact tidak bisa dipulihkan.

**Backup manual** (sebelum migrasi besar): Actions → Encrypted Database Backup →
Run workflow di `main` → pastikan semua langkah hijau.

**Uji restore** (wajib berkala & setelah perubahan schema besar): Actions →
Verify Database Restore → isi `backup_run_id` + konfirmasi
`karsa-restore-test`. Target harus project terpisah `karsa-restore-test`
(interlock `restore_guard`). **Jangan pernah** restore langsung ke production.

## 5. Koreksi poin

| Aktor | Mengajukan | Mengeksekusi |
|---|---|---|
| Mahasiswa | ✅ | ❌ |
| PJ | ✅ | ✅ (poin yang ia input) |
| Dosen | ✅ | ❌ (via admin) |
| Admin | ✅ | ✅ (semua) |

- PJ salah input: hapus di Riwayat → input ulang (selama semester aktif).
- Komplain mahasiswa: email `[Karsa] Permohonan Koreksi Poin` ke
  `yuwiaffa@gmail.com` → admin cek `/admin/audit` → eskalasi ke PJ →
  konfirmasi ≤ 7 hari kerja.
- Anomali dari dosen: keputusan dosen final, admin eksekusi.
- Setiap koreksi tercatat di `/admin/audit`. Setelah semester berganti, data
  terkunci (kecuali bug sistem, perlu persetujuan dosen + admin).

## 6. Retensi data

| Data | Retensi |
|---|---|
| `PoinLog` (akademik) | Arsip permanen (histori semester) |
| `User` | Selama terdaftar di UNTIDAR |
| `AuditLog` | 5 tahun sejak `created_at` |
| `Session` | Sampai expired (±30 hari) |
| Email permohonan erasure | 1 tahun setelah diproses |

**Erasure (UU PDP No. 27/2022)**: mahasiswa email
`[Karsa] Permohonan Penghapusan Data Pribadi` → admin verifikasi identitas →
hapus via SQL dengan urutan `PoinLog` → `Account`/`Session` → `User`
(FK `RESTRICT` — urutan wajib). Audit log di-anonymize (`DELETED_USER`),
tidak dihapus. Batas proses 7 hari kerja.
