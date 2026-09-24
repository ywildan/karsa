# Security Hardening Log — Karsa

Dokumen ini adalah jurnal kerja pengamanan Karsa. Tujuannya agar setiap
keputusan, hasil pemeriksaan, perubahan, dan prosedur rollback dapat dilanjutkan
tanpa bergantung pada riwayat percakapan.

> Jangan pernah menulis password, token, API key, connection string lengkap,
> authorization code, cookie, atau secret lain di dokumen ini.

## Status

- Terakhir diperbarui: 24 September 2026 (WIB)
- Lingkungan: Supabase production + Vercel production
- Tahap aktif: pengujian password dan pooler melalui Vercel Preview
- Perubahan database selama proses ini: role, grant minimum, dan policy RLS
  `karsa_runtime` sudah dibuat
- Perubahan environment Vercel selama proses ini: belum ada
- Perubahan kode aplikasi: belum ada

## Sasaran

1. Mengeluarkan kredensial role administratif `postgres` dari runtime Vercel.
2. Menggunakan role `karsa_runtime` dengan privilege minimum untuk aplikasi.
3. Mempertahankan kompatibilitas Prisma, Auth.js, web admin, dan aplikasi native.
4. Menyediakan backup terenkripsi dan prosedur restore yang sudah diuji.
5. Menambah hardening aplikasi setelah akses database selesai diamankan.

## Batas Pengamanan

- Perubahan dilakukan bertahap dan dapat di-rollback.
- Koneksi production tidak diganti sebelum role baru lulus pengujian.
- Role `postgres` tidak dihapus; role itu hanya dikeluarkan dari runtime aplikasi.
- Secret tidak disimpan di repository, log, screenshot, atau percakapan.
- Restore tidak pernah diuji dengan menimpa database production.

## Baseline yang Dilaporkan

- RLS aktif pada seluruh tabel aplikasi.
- Grant untuk `anon` dan `authenticated` telah dicabut.
- Legacy API keys dinonaktifkan.
- Data API dinonaktifkan.
- Auto-expose tabel baru dinonaktifkan.
- SSL Enforcement aktif.
- MFA aktif pada empat akun pengelola.
- Supabase Security Advisor: 0 warning.
- Network Restrictions menerima semua IP karena outbound IP Vercel dinamis.
- `DATABASE_URL` dan `DIRECT_URL` Vercel memakai role `postgres`.
- Paket Supabase: Free.
- Uji restore belum pernah dilakukan.

## Hasil Step 1 — Audit Read-only Database

Audit dijalankan melalui Supabase SQL Editor pada 24 September 2026.

### Role

| Role | Login | Create role | Create DB | Bypass RLS |
| --- | --- | --- | --- | --- |
| `anon` | Tidak | Tidak | Tidak | Tidak |
| `authenticated` | Tidak | Tidak | Tidak | Tidak |
| `postgres` | Ya | Ya | Ya | Ya |
| `service_role` | Tidak | Tidak | Tidak | Ya |

Kesimpulan: koneksi runtime `postgres` memiliki kemampuan administratif dan
melewati RLS. Role `karsa_runtime` belum ada.

### Tabel

Empat belas tabel aplikasi ditemukan di schema `public`:

- `Account`
- `AuditLog`
- `KategoriPoin`
- `Kelas`
- `KelasMatkul`
- `Matkul`
- `MobileAuthRequest`
- `MobileSession`
- `PoinLog`
- `Prodi`
- `Semester`
- `Session`
- `User`
- `VerificationToken`

Seluruh tabel:

- dimiliki oleh `postgres`;
- memiliki RLS aktif;
- tidak memakai `FORCE ROW LEVEL SECURITY`;
- tidak memberikan `SELECT`, `INSERT`, `UPDATE`, atau `DELETE` kepada `anon`;
- tidak memberikan `SELECT`, `INSERT`, `UPDATE`, atau `DELETE` kepada
  `authenticated`.

### Policy RLS

Query `pg_policies` untuk schema `public` tidak mengembalikan baris. Artinya,
belum ada policy RLS. Aplikasi tetap bekerja karena role `postgres` memiliki
`BYPASSRLS`.

## Risiko Terverifikasi

Jika kredensial database dari Vercel dicuri, role `postgres` dapat melewati RLS,
mengubah role, membuat database, dan melakukan tindakan administratif lain.
RLS dan pencabutan grant publik tidak membatasi koneksi tersebut.

## Rencana Bertahap

- [x] Step 1 — Audit role, RLS, policy, dan grant secara read-only.
- [x] Step 2 — Buat role login `karsa_runtime` tanpa privilege administratif.
- [x] Step 3 — Berikan grant objek minimum dan policy khusus runtime.
- [x] Step 4 — Audit efektif privilege `karsa_runtime` secara read-only.
- [ ] Step 5 — Uji koneksi role baru tanpa mengganti production. (5A selesai;
  5B koneksi eksternal/pooler belum)
- [ ] Step 6 — Uji seluruh alur web dan native pada deployment preview.
- [ ] Step 7 — Ganti environment production dan redeploy.
- [ ] Step 8 — Pantau, verifikasi, lalu keluarkan `postgres` dari Vercel.
- [ ] Step 9 — Rotasi password `postgres`.
- [ ] Step 10 — Buat role backup, backup terenkripsi, dan uji restore terisolasi.
- [ ] Step 11 — Perbaiki dokumentasi backup Free/Pro.
- [ ] Step 12 — Hardening aplikasi: rate limiting, security headers, dan perilaku
  autentikasi saat database gagal.

## Rollback Umum

Sebelum Step 7, rollback cukup dengan tidak mempromosikan preview deployment.
Sesudah Step 7, pulihkan `DATABASE_URL` dan `DIRECT_URL` production ke nilai lama
melalui Vercel, lalu redeploy deployment stabil. Jangan menghapus role baru
sampai produksi dipastikan stabil.

## Catatan Keputusan

- Data API tetap dinonaktifkan karena Karsa mengakses PostgreSQL hanya melalui
  backend Next.js/Prisma.
- Network Restrictions belum dapat diperketat selama Vercel memakai outbound IP
  dinamis.
- Supabase Pro direkomendasikan sebelum operasional resmi universitas, tetapi
  hardening role database tidak bergantung pada upgrade paket.
- Pada paket Free, backup logis terenkripsi dan off-site harus dibuat sendiri.

## Hasil Step 2 — Pembuatan Role Runtime

Role `karsa_runtime` berhasil dibuat dan diverifikasi pada 24 September 2026.

| Atribut | Nilai |
| --- | --- |
| Login | Ya |
| Superuser | Tidak |
| Create role | Tidak |
| Create database | Tidak |
| Inherit | Tidak |
| Replication | Tidak |
| Bypass RLS | Tidak |

Password role dibuat dan disimpan oleh pemilik sistem; password tidak dicatat
di repository atau percakapan. Role belum digunakan oleh Vercel dan belum
memiliki akses ke tabel aplikasi pada akhir Step 2.

## Hasil Step 3 — Grant Minimum dan Policy RLS

Grant dan policy berhasil diterapkan pada 24 September 2026. Koneksi production
belum diganti.

| Kelompok tabel | Hak runtime |
| --- | --- |
| `Account`, `User`, `Semester`, `Prodi`, `Matkul`, `Kelas`, `KelasMatkul`, `MobileAuthRequest` | SELECT, INSERT, UPDATE, DELETE |
| `PoinLog` | SELECT, INSERT, DELETE |
| `KategoriPoin` | SELECT |
| `AuditLog` | SELECT, INSERT |
| `MobileSession` | SELECT, INSERT, UPDATE |
| `Session`, `VerificationToken` | Tidak ada |

Policy RLS khusus `karsa_runtime` telah dibuat untuk setiap operasi yang diberi
grant. Tidak ada policy yang ditambahkan untuk `anon` atau `authenticated`.

## Hasil Step 4 — Audit Privilege Efektif

Audit read-only berhasil pada 24 September 2026.

- `CONNECT` ke database: ya.
- `USAGE` schema `public`: ya.
- `CREATE` pada schema `public`: tidak.
- `karsa_runtime` tidak menjadi member role lain. `postgres` memiliki relasi
  pengelolaan administratif atas `karsa_runtime`, tanpa hak SET atau INHERIT.
- Hak tabel efektif cocok dengan matriks Step 3.
- `TRUNCATE`, `REFERENCES`, dan `TRIGGER` pada seluruh tabel: tidak ada.
- Function dalam schema `public`: tidak ada.
- Sequence dalam schema `public`: tidak ada.
- `Session` dan `VerificationToken`: tidak dapat diakses.

Kesimpulan: tidak ditemukan privilege tambahan dari `PUBLIC`, membership role,
function, sequence, atau schema.

## Catatan Step 5A — Percobaan Pertama

Percobaan pertama `SET LOCAL ROLE karsa_runtime` dari SQL Editor ditolak dengan
SQLSTATE `42501` (`permission denied to set role`). Sesi Dashboard berjalan
sebagai `postgres`, tetapi relasi pengelolaannya memiliki `set_option=false` dan
`inherit_option=false`. Penolakan terjadi sebelum operasi insert sehingga tidak
ada data uji yang ditulis. Pengujian direvisi dengan hak SET sementara di dalam
transaksi; `ROLLBACK` membatalkan hak sementara dan seluruh data uji sekaligus.

Percobaan revisi berhasil menjalankan operasi sebagai `karsa_runtime`.
`MobileAuthRequest` berhasil dibuat, diperbarui, dan dihapus; `AuditLog` berhasil
ditambahkan. Sesudah rollback, kedua tabel memiliki nol baris uji. Pemeriksaan
awal masih menemukan relasi membership `karsa_runtime` ke `postgres`. Status
opsi `ADMIN`, `INHERIT`, dan `SET` sedang diaudit sebelum menentukan apakah
relasi itu merupakan ownership administratif bawaan atau grant sementara yang
perlu dicabut.

Audit lanjutan memastikan relasi tersebut diberikan oleh `supabase_admin`
dengan `admin_option=true`, `set_option=false`, dan `inherit_option=false`.
Relasi ini aman: `postgres` dapat mengelola role yang dibuatnya, tetapi tidak
dapat beralih menjadi atau mewarisi `karsa_runtime`. Tidak perlu dilakukan
`REVOKE`.

### Hasil Step 5A

- SELECT melalui policy RLS: berhasil.
- INSERT/UPDATE/DELETE `MobileAuthRequest`: berhasil dalam transaksi.
- INSERT `AuditLog`: berhasil dalam transaksi.
- Data uji setelah rollback: nol.
- Membership dengan hak SET/INHERIT yang tertinggal: tidak ada.

## Langkah Berikutnya

Jalankan Step 5B untuk menguji password dan pooler lewat Preview Deployment
Vercel yang terisolasi dari environment Production.
