# Runbook Backup dan Restore Database Karsa

Dokumen ini adalah prosedur operasional backup database Karsa. Jangan menulis
password, token, connection string lengkap, atau isi data pengguna di dokumen,
issue, log, maupun percakapan.

## Ringkasan

- Sumber: database Supabase production, schema `public`.
- Format: PostgreSQL 17 custom-format dump.
- Enkripsi: AES-256-CBC dengan PBKDF2-SHA256, salt, dan 600.000 iterasi.
- Penyimpanan: GitHub Actions Artifact terenkripsi.
- Jadwal: setiap hari pukul 01.00 WIB (`18:00 UTC`).
- Retensi artifact: 30 hari.
- Pemulihan teruji: project Supabase terpisah `karsa-restore-test`.
- RPO praktis: sampai 24 jam pada jadwal harian.
- RTO: manual; bergantung pada penyediaan target, restore, validasi, dan cutover.

Workflow:

- `.github/workflows/database-backup.yml`
- `.github/workflows/database-restore-test.yml`

## Cakupan

Backup mencakup seluruh objek dan data aplikasi di schema `public`, termasuk:

- 14 tabel aplikasi;
- primary key, foreign key, indeks, dan constraint;
- konfigurasi RLS;
- 17 policy `karsa_runtime`.

Backup tidak mencakup schema internal Supabase seperti `auth`, `storage`, dan
`realtime`. Karsa saat ini memakai tabel autentikasi aplikasinya sendiri di
`public`. Jika aplikasi kelak memakai Supabase Auth atau Storage, strategi
backup harus dievaluasi ulang sebelum fitur tersebut digunakan di production.

Password custom role tidak tersimpan di logical dump. Role login dan
credential harus dibuat atau dirotasi secara terpisah saat disaster recovery.

## Role dan Secret

### `karsa_backup`

- Login khusus backup production.
- `BYPASSRLS` agar seluruh baris dapat dibaca.
- Hanya memiliki `SELECT` pada tabel/sequence aplikasi.
- Tidak memiliki `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, atau schema `CREATE`.
- Connection limit: 2.
- Tidak boleh digunakan oleh Vercel.

### GitHub repository secrets

| Secret | Kegunaan |
| --- | --- |
| `BACKUP_DATABASE_URL` | Session Pooler production untuk `karsa_backup` |
| `BACKUP_ENCRYPTION_PASSWORD` | Mengenkripsi dan mendekripsi artifact |
| `RESTORE_TEST_DATABASE_URL` | Session Pooler project `karsa-restore-test` |

Connection string backup/restore memakai Session Pooler port 5432 dan
`sslmode=require`. Password URL dibatasi menjadi 48–64 karakter alfanumerik
agar tidak memerlukan URI encoding. Secret tidak boleh disimpan di Vercel.

Password enkripsi harus turut disimpan di password manager. Tanpanya, artifact
tidak dapat dipulihkan.

## Proses Backup Otomatis

Setiap eksekusi:

1. Memvalidasi keberadaan secret dan bentuk dasar nilainya.
2. Menjalankan `pg_dump` PostgreSQL 17 melalui container resmi.
3. Membatasi dump ke schema `public`.
4. Memvalidasi struktur dump memakai `pg_restore --list`.
5. Mengenkripsi dump.
6. Mendekripsi salinan sementara dan memvalidasinya kembali.
7. Mengunggah hanya ciphertext dan checksum SHA-256.
8. Menghapus plaintext dan file sementara dari runner pada semua kondisi.

Workflow memiliki concurrency lock agar dua backup tidak berjalan bersamaan.

## Menjalankan Backup Manual

Gunakan backup manual sebelum migrasi besar atau perubahan schema:

1. Buka GitHub repository Karsa.
2. Pilih **Actions → Encrypted Database Backup**.
3. Pilih **Run workflow** pada branch `main`.
4. Tunggu seluruh langkah berstatus hijau.
5. Catat run ID dan tanggal artifact tanpa mengunduhnya jika tidak diperlukan.

Backup dianggap berhasil hanya jika langkah pembuatan dump, validasi, enkripsi,
verifikasi dekripsi, upload, dan cleanup semuanya sukses.

## Uji Restore Terisolasi

Restore tidak boleh diarahkan langsung ke production. Target wajib merupakan
project terpisah dan memiliki interlock berikut di luar schema `public`:

```sql
create schema if not exists restore_guard authorization postgres;

revoke all on schema restore_guard
from public, anon, authenticated;

create table if not exists restore_guard.target (
  id boolean primary key default true check (id),
  marker text not null check (marker = 'KARSA_RESTORE_TEST_ONLY')
);

alter table restore_guard.target enable row level security;

revoke all on table restore_guard.target
from public, anon, authenticated;

insert into restore_guard.target (id, marker)
values (true, 'KARSA_RESTORE_TEST_ONLY')
on conflict (id) do update
set marker = excluded.marker;
```

Untuk menjalankan uji:

1. Pastikan `RESTORE_TEST_DATABASE_URL` mengarah ke project uji.
2. Buka **Actions → Verify Database Restore**.
3. Isi `backup_run_id` dari backup yang akan diuji.
4. Isi konfirmasi tepat `karsa-restore-test`.
5. Jalankan workflow.

Workflow akan memverifikasi checksum, mendekripsi dump, menguji struktur,
menjalankan interlock di PostgreSQL, dan baru kemudian mengganti schema `public`
target dalam satu transaksi. Jika ada satu error, perubahan restore di-rollback.

Hasil akhir wajib menunjukkan:

- 14 tabel aplikasi;
- RLS aktif pada 14 tabel;
- 17 policy;
- seluruh langkah cleanup berhasil.

Uji restore harus diulang setidaknya setelah perubahan schema besar, perubahan
workflow, rotasi metode enkripsi, dan secara berkala selama operasional.

## Prosedur Saat Insiden Production

1. Hentikan perubahan data aplikasi atau aktifkan maintenance mode.
2. Tentukan backup terakhir yang berhasil dan hitung potensi kehilangan data.
3. Pulihkan artifact terlebih dahulu ke project/database terisolasi.
4. Validasi schema, row count, alur login, dashboard admin, PJ, pencarian
   mahasiswa, pencatatan poin, serta audit log.
5. Buat ulang role login dan password secara terpisah; jangan menyalin password
   lama dari lingkungan yang mungkin terkompromi.
6. Putuskan antara memulihkan production lama atau melakukan cutover ke target
   baru berdasarkan jenis insiden.
7. Perbarui Vercel hanya setelah target baru lulus smoke test.
8. Rotasi seluruh credential terkait dan dokumentasikan timeline insiden.

Workflow restore-test tidak boleh dimodifikasi menjadi target production tanpa
review tersendiri, maintenance window, backup terbaru, dan rencana rollback.

## Rotasi dan Perawatan

- Rotasi password `karsa_backup` jika ada dugaan kebocoran atau pergantian
  pengelola; setelah itu perbarui `BACKUP_DATABASE_URL` dan jalankan backup
  manual.
- Rotasi password enkripsi dengan hati-hati. Artifact lama tetap memerlukan
  password lama selama masa retensinya.
- Rotasi password project uji setelah kebocoran log atau bila project dibagikan.
- Tinjau GitHub Actions setiap ada email/notifikasi kegagalan dan sekurangnya
  sekali per minggu.
- Pastikan artifact sukses terbaru tidak lebih tua dari 24 jam.
- Uji restore berkala tetap diperlukan; keberadaan artifact saja bukan bukti
  bahwa pemulihan akan berhasil.

## Free dan Pro

Pada paket Free, backup logis terenkripsi ini menjadi salinan off-site utama dan
harus tetap berjalan. Dokumentasi Supabase merekomendasikan project Free untuk
mengekspor data secara rutin.

Jika Karsa naik ke Pro:

- Supabase menyediakan akses ke tujuh hari daily backup;
- pertahankan backup GitHub terenkripsi sebagai lapisan independen;
- pertimbangkan PITR bila kehilangan data sampai 24 jam tidak dapat diterima;
- PITR merupakan add-on untuk Pro/Team/Enterprise dan memerlukan compute add-on
  minimum yang berlaku menurut kebijakan Supabase saat itu;
- cek kembali harga dan retensi resmi sebelum pengadaan universitas.

Referensi resmi:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/pricing

## Riwayat Validasi Awal

- Backup terenkripsi pertama berhasil: run `35959626013`.
- Restore terisolasi lengkap berhasil: run `35963049994`.
- Backup dengan verifikasi dekripsi otomatis berhasil: run `35963282880`.
- Detail investigasi dan keputusan terdapat pada
  `docs/SECURITY-HARDENING-LOG.md`.
