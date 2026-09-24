# Security Hardening Log — Karsa

Dokumen ini adalah jurnal kerja pengamanan Karsa. Tujuannya agar setiap
keputusan, hasil pemeriksaan, perubahan, dan prosedur rollback dapat dilanjutkan
tanpa bergantung pada riwayat percakapan.

> Jangan pernah menulis password, token, API key, connection string lengkap,
> authorization code, cookie, atau secret lain di dokumen ini.

## Status

- Terakhir diperbarui: 24 September 2026 (WIB)
- Lingkungan: Supabase production + Vercel production
- Tahap aktif: menyiapkan backup terenkripsi untuk paket Free
- Perubahan database selama proses ini: role, grant minimum, dan policy RLS
  `karsa_runtime` sudah dibuat; role baca-saja `karsa_backup` juga sudah dibuat
- Perubahan environment Vercel selama proses ini: Production dan Preview sudah
  memakai `karsa_runtime`; tidak ada credential `postgres` di Vercel
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
- [x] Step 5 — Uji koneksi role baru tanpa mengganti production.
- [x] Step 6 — Uji alur kritis web/native pada deployment preview dan simulasi
  transaksi admin secara rollback-only.
- [x] Step 7 — Ganti environment production dan redeploy.
- [x] Step 8 — Pantau, verifikasi, lalu keluarkan `postgres` dari Vercel.
- [x] Step 9 — Rotasi password `postgres`.
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

Jalankan Step 6 untuk smoke test autentikasi dan alur utama web/native pada
Preview Deployment sebelum mengganti environment Production.

### Persiapan Step 5B

- Branch uji: `security/runtime-role-test`
- Commit awal jurnal: `180a629`
- Branch sudah dipush ke GitHub pada 24 September 2026.
- Branch tidak digabung ke `main` dan tidak mengubah Production.
- Override `DATABASE_URL` dan `DIRECT_URL` khusus branch Preview masih harus
  dipasang sebelum deployment uji role baru dijalankan ulang.

### Hasil Step 5B

- Commit pemicu Preview: `53a259d`.
- Vercel Preview Deployment: berhasil.
- Deployment Protection/SSO: aktif dan menahan request anonim.
- Password `karsa_runtime` dan koneksi Transaction Pooler port 6543: berhasil.
- Endpoint `GET /api/mobile/v1/auth/start` berhasil membaca request lama dan
  membuat `MobileAuthRequest` melalui role baru.
- Redirect berhasil mencapai `/mobile-auth/login`.
- Dua baris uji ditemukan karena endpoint tercapai dua kali; keduanya sudah
  dihapus dan tidak ada data uji yang tersisa.
- Production masih memakai role `postgres` dan belum diubah.

### Hasil Step 6A — Login Web Preview

- Login Google/Auth.js: berhasil.
- User: Yusuf Wildan Affandi.
- Role efektif: PJ.
- JWT dan pemuatan snapshot user: berhasil.
- Halaman tujuan: `/catat-poin`.
- Query penugasan PJ berhasil menampilkan satu mata kuliah Bahasa Indonesia,
  Kelas K1, Akuntansi Perpajakan, Semester Ganjil 2026/2027.
- Tidak ada perubahan data akademik pada pengujian ini.

### Hasil Step 6B — Pembacaan Alur PJ

- Halaman detail mata kuliah: berhasil.
- Kategori poin: berhasil dimuat.
- Pencarian mahasiswa tiga huruf: berhasil.
- Riwayat poin: berhasil dimuat/tidak menghasilkan error.
- Tidak ada poin yang disimpan atau dihapus selama pengujian.

### Hasil Step 6C — Simulasi Admin dan Poin

Pengujian dilakukan sebagai `karsa_runtime` dalam satu transaksi yang kemudian
di-rollback karena akun PJ production tidak boleh diubah menjadi admin/mahasiswa
hanya untuk pengujian.

- INSERT/UPDATE/DELETE data master `Prodi`: berhasil.
- INSERT `PoinLog` dengan relasi production yang valid: berhasil.
- INSERT `AuditLog` untuk aksi PJ dan admin: berhasil.
- DELETE `PoinLog`: berhasil.
- Foreign key dan policy RLS: berhasil.
- Sebelum rollback: prodi uji 0, poin uji 0, audit uji 2.
- Sesudah rollback: seluruh prodi, poin, dan audit uji 0.
- Role aplikasi milik user production tidak diubah.

Kesimpulan Step 6: kemampuan database yang dibutuhkan login, channel PJ,
pencarian mahasiswa, data master admin, pencatatan/penghapusan poin, mobile auth,
dan audit log telah tervalidasi. UI admin/mahasiswa tidak diuji dengan perubahan
role production; pengujian permission-nya diganti dengan transaksi rollback-only.

## Persiapan Step 7 — Production

- URL lama `postgres` untuk rollback telah disimpan oleh pemilik sistem.
- `DATABASE_URL` target Production telah diganti ke `karsa_runtime` melalui
  Transaction Pooler port 6543.
- `DIRECT_URL` target Production telah diganti ke `karsa_runtime` melalui direct
  connection port 5432.
- Override branch Preview tetap dipertahankan sebagai pembanding.
- Perubahan environment baru berlaku setelah deployment Production berikutnya.
- Pemicu deployment direncanakan berupa commit dokumentasi ini; tidak ada
  perubahan kode aplikasi.

## Hasil Step 7 — Cutover Production

- Commit Production: `1e68e26`.
- Perubahan repository hanya dokumentasi jurnal keamanan.
- Deployment Vercel Production: berhasil.
- `DATABASE_URL` Production memakai `karsa_runtime` melalui Transaction Pooler.
- `DIRECT_URL` Production tidak lagi membawa kredensial `postgres`.
- Request uji `GET /api/mobile/v1/auth/start` pada `www.sikarsa.id` berhasil
  dengan HTTP 307 menuju `/mobile-auth/login` dan menghasilkan cookie auth
  berumur 10 menit.
- Hasil tersebut membuktikan runtime Production dapat melakukan operasi database
  melalui role baru.
- Baris `MobileAuthRequest` uji berhasil ditemukan dan dihapus.
- Verifikasi setelah cleanup: `remaining_test_rows = 0`.
- Tidak ada data uji runtime yang tersisa di Production.

### Kegagalan Smoke Test dan Rollback

- Sesudah cutover, endpoint mobile-auth Production berhasil, tetapi halaman awal
  pengguna menampilkan global error boundary: "Terjadi kesalahan — Kami tidak
  dapat memuat halaman ini".
- Build/deployment sukses tidak cukup membuktikan seluruh query UI berfungsi.
- Keputusan: rollback `DATABASE_URL` dan `DIRECT_URL` Production ke kredensial
  `postgres` lama, lalu redeploy sebelum diagnosis lanjutan.
- Jangan memperluas privilege `karsa_runtime` tanpa bukti error dari log.
- Percobaan rollback awal terhambat karena password lama role `postgres` tidak
  dapat dipakai. Password akun Supabase dan password `karsa_runtime` bukan
  password role database `postgres`. Jika kredensial lama tidak tersedia,
  prosedur pemulihan adalah reset project database password, perbarui kedua URL
  Production, lalu redeploy.
- Ditemukan perbedaan penting pada URL: `DATABASE_URL` `karsa_runtime` memakai
  Supavisor Transaction Pooler port 6543 tetapi tidak menyertakan
  `?pgbouncer=true`. Supabase menyatakan transaction mode tidak mendukung
  prepared statements dan Prisma memerlukan parameter tersebut. Ini menjadi
  hipotesis utama error UI; koreksi koneksi harus diuji sebelum menambah grant.

### Resolusi Cutover

- `DATABASE_URL` Production dan Preview diperbaiki dengan menambahkan
  `?pgbouncer=true` pada URL Transaction Pooler port 6543.
- Tidak ada privilege `karsa_runtime` yang diperluas.
- Commit pemicu redeploy perbaikan: `2e0afad`.
- Deployment Vercel: berhasil.
- Endpoint mobile-auth Production: berhasil.
- Smoke test pengguna Production: halaman awal, login, `/catat-poin`, detail
  mata kuliah, dan pencarian mahasiswa berhasil tanpa error.
- Secara operasional, error hilang tepat setelah mode PgBouncer Prisma
  diaktifkan. Penyebab disimpulkan sebagai inkompatibilitas prepared statement
  dengan Supavisor Transaction Pooler.
- Cutover Production ke `karsa_runtime` dinyatakan berhasil.

## Hasil Step 8 — Verifikasi Role dan Secret

- `pg_stat_statements` mencatat `karsa_runtime`: 247 calls pada 42 normalized
  statements.
- Statistik `postgres`: 20.041 calls pada 499 normalized statements; angka ini
  bersifat kumulatif dan mencakup SQL Editor serta aktivitas administratif lama.
- Tidak ada kredensial ber-username `postgres` yang tersisa di environment
  Vercel Production, Preview, atau Development.
- Kredensial runtime di Vercel hanya menggunakan `karsa_runtime`.
- Password `postgres` tetap merupakan credential administratif dan harus
  dirotasi pada Step 9.

## Hasil Step 9 — Rotasi Password Administrator

- Project database password untuk role `postgres` telah direset satu kali pada
  24 September 2026.
- Password akun Supabase, password role `postgres`, dan password
  `karsa_runtime` diperlakukan sebagai tiga credential yang berbeda.
- Password lama `postgres` tidak lagi berlaku.
- Karsa tidak memerlukan pembaruan environment setelah rotasi karena Production
  dan Preview memakai password `karsa_runtime`.
- Deployment Production dan smoke test tetap sehat setelah rotasi.

## Step 10A — Inventaris Backup

- PostgreSQL: 17.6.
- Ukuran database: 12 MB.
- Jumlah estimasi baris schema `public`: 29.
- Tabel terbesar berdasarkan estimasi saat audit: `AuditLog` dan `Matkul`,
  masing-masing 8 baris.
- `MobileAuthRequest`, `Session`, dan `VerificationToken` kosong.
- Backup harian penuh layak dilakukan karena ukuran masih sangat kecil.
- Workflow harus memakai `pg_dump` major version 17.

## Step 10B — Role Backup Read-only

Role `karsa_backup` dibuat pada 24 September 2026 khusus untuk proses backup
logis lengkap.

| Atribut | Nilai |
| --- | --- |
| Login | Ya |
| Superuser | Tidak |
| Create role | Tidak |
| Create database | Tidak |
| Inherit | Tidak |
| Replication | Tidak |
| Bypass RLS | Ya |
| Connection limit | 2 |

- Role memperoleh `CONNECT` ke database `postgres` dan `USAGE` pada schema
  `public`, tetapi tidak memperoleh `CREATE` pada schema.
- Role hanya memperoleh `SELECT` pada seluruh tabel dan sequence di schema
  `public`, termasuk default privilege untuk objek baru yang dibuat oleh
  `postgres`.
- `BYPASSRLS` sengaja diberikan agar backup memuat seluruh baris tanpa membuka
  kemampuan menulis, menghapus, atau mengubah struktur database.
- Role ini tidak boleh digunakan oleh Vercel dan credential-nya hanya boleh
  disimpan sebagai secret pada workflow backup.

### Remediasi Password Placeholder

Pada pembuatan awal, placeholder password belum diganti. Role segera diamankan
dengan `NOLOGIN`, lalu password diganti dengan password acak baru dan akses
login diaktifkan kembali. Password lama maupun password baru tidak dicatat.

Verifikasi setelah remediasi:

- `rolcanlogin = true`;
- `rolbypassrls = true`;
- `rolconnlimit = 2`;
- tidak ada sesi aktif untuk `karsa_backup`;
- `pg_stat_statements` menunjukkan `total_calls = 0` untuk `karsa_backup`.
- audit efektif pada ke-14 tabel menunjukkan `SELECT = true`, sedangkan
  `INSERT`, `UPDATE`, `DELETE`, dan `TRUNCATE` seluruhnya `false`.
- audit database/schema menunjukkan `CONNECT = true`, database `CREATE = false`,
  schema `USAGE = true`, dan schema `CREATE = false`.
- privilege `TEMP = true` pada database diterima sebagai privilege bawaan dan
  tidak memberikan akses tulis ke tabel production.
- schema `public` tidak memiliki sequence saat audit; query sequence selesai
  tanpa mengembalikan baris.

Kesimpulan: tidak ditemukan indikasi bahwa credential placeholder pernah
digunakan. Role siap dipakai untuk workflow backup, tetapi Step 10 belum selesai
sampai backup terenkripsi berhasil dibuat dan diuji restore secara terisolasi.

## Step 10C — Workflow Backup Manual

Workflow `.github/workflows/database-backup.yml` disiapkan secara lokal dengan
karakteristik berikut:

- hanya dapat dipicu manual melalui `workflow_dispatch` selama tahap uji;
- memakai image resmi `postgres:17` sehingga tidak memerlukan instalasi lokal;
- membuat logical backup dalam custom format memakai role `karsa_backup`;
- memvalidasi struktur dump dengan `pg_restore --list`;
- mengenkripsi dump memakai AES-256-CBC, PBKDF2-SHA256, salt, dan 600.000
  iterasi sebelum artefak diunggah;
- hanya dump terenkripsi dan checksum SHA-256 yang menjadi GitHub Artifact;
- artefak disimpan 30 hari dan file sementara dibersihkan dari runner;
- permission workflow dibatasi menjadi `contents: read`;
- eksekusi paralel backup dicegah melalui concurrency group.

Workflow memerlukan repository secrets `BACKUP_DATABASE_URL` dan
`BACKUP_ENCRYPTION_PASSWORD`. Workflow sudah didorong ke GitHub, tetapi jadwal
harian belum diaktifkan sampai uji manual dan restore terisolasi berhasil.

### Uji Manual Pertama

- Workflow dikenali GitHub dan dipicu manual pada 24 September 2026.
- Validasi keberadaan kedua secret berhasil.
- `pg_dump` berhenti sebelum mengekspor data karena
  `BACKUP_DATABASE_URL` mengandung karakter baris baru setelah nilai
  `sslmode=require`.
- Tidak ada dump atau artefak yang diunggah; cleanup runner berhasil.
- Validasi CR/LF ditambahkan untuk kedua secret agar kesalahan serupa gagal
  lebih awal tanpa mencoba koneksi database.
- Secret URL harus diperbarui menjadi tepat satu baris sebelum uji ulang.

### Uji Manual Kedua

- Secret URL diperbarui, tetapi GitHub masih mendeteksi karakter CR/LF sehingga
  workflow berhenti pada tahap validasi sebelum mencoba koneksi.
- Tidak ada dump atau artefak yang dibuat.
- Workflow diperkuat untuk menghapus CR/LF dari URL hanya di memori runner
  sebelum memanggil `pg_dump`; URL dan hasil normalisasi tidak dicetak.
- Password enkripsi tetap wajib benar-benar satu baris dan tidak dinormalisasi
  agar selalu identik dengan salinan yang disimpan di password manager.

### Uji Manual Ketiga

- Normalisasi URL berhasil dan autentikasi `karsa_backup` diterima database.
- `pg_dump` kemudian ditolak saat mencoba mengunci schema internal Supabase
  (`auth`, `storage`, dan `realtime`) yang memang tidak diberikan kepada role
  backup aplikasi.
- Tidak ada artefak yang dibuat dan cleanup runner berhasil.
- Dump dibatasi secara eksplisit ke schema `public`, tempat seluruh 14 tabel
  Karsa berada. Schema internal yang dikelola Supabase tidak termasuk cakupan
  backup logis aplikasi ini.
