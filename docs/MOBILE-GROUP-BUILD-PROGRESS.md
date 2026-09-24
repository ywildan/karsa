# Karsa Mobile Group — Build Progress

> Catatan kerja fitur grup percakapan mobile-only. Dokumen ini harus diperbarui
> pada setiap milestone. Jangan pernah menulis password, token, connection string,
> secret, atau isi percakapan production di dokumen ini.

## Status Ringkas

- Tanggal mulai: 24 September 2026
- Tahap aktif: deployment preview dan smoke test lintas role
- Kode fitur: selesai di branch `feat/mobile-groups`, belum digabung/deploy
- Migrasi production: berhasil dijalankan dan terverifikasi
- Instalasi lokal: tidak ada dan tidak akan dilakukan
- Target aplikasi: Flutter native (`karsa-mobile`)
- Target backend: Next.js API `/api/mobile/v1`
- Target database: PostgreSQL Supabase

## Keputusan Produk Final

### Ruang dan anggota

- Satu `KelasMatkul` mewakili satu grup percakapan.
- Jika sebuah kelas memiliki delapan mata kuliah, setiap mahasiswa kelas tersebut
  otomatis melihat delapan grup.
- Anggota setiap grup adalah seluruh mahasiswa dalam kelas yang sama, termasuk
  seluruh PJ dari mata kuliah lain di kelas tersebut.
- Semua anggota boleh membaca dan mengirim pesan di seluruh grup kelasnya.
- Tidak ada direct message, grup buatan pengguna, anonymous chat, atau akses web.

### Hak PJ

- PJ boleh chat di semua grup dalam kelasnya.
- Hak pin, lock, dan moderasi hanya berlaku pada grup dengan
  `KelasMatkul.pj_id` yang sama dengan ID PJ tersebut.
- Di grup mata kuliah lain, PJ diperlakukan sebagai anggota biasa.
- Secara operasional satu PJ hanya memegang satu mata kuliah, tetapi aturan ini
  tidak dibuat sebagai unique constraint database.
- Jika PJ diganti, PJ lama tetap dapat chat sebagai mahasiswa kelas, tetapi hak
  pengelola grup berpindah kepada PJ baru.

### Privasi

- Fitur grup hanya tersedia di aplikasi mobile.
- Dashboard dan session admin web tidak memperoleh browser, search, export,
  endpoint, atau hak khusus untuk membaca percakapan.
- Status `is_admin` tidak memberikan membership grup.
- Percakapan bukan E2EE pada MVP. Riwayat tetap dapat dipulihkan setelah login
  ulang atau pindah perangkat selama masih berada dalam masa retensi.
- Isi pesan tidak disalin ke audit log; audit hanya menyimpan metadata tindakan.
- Tidak ada analytics isi, training model, atau export massal percakapan.

### Batas MVP

- Text-only.
- Stream pesan per mata kuliah dengan reply-to.
- Pagination berbasis cursor.
- Edit maksimal 15 menit.
- Soft delete, pin, lock, hide, mute/block, dan report.
- Tanpa upload, gambar, file, HTML, link preview, typing indicator, presence,
  read receipt, direct message, dan push notification.
- MVP tidak memakai Supabase Realtime; pembaruan memakai refresh/polling adaptif
  hanya ketika layar grup terbuka.

## Milestone

- [x] M0 — Finalisasi scope, membership, hak PJ, dan model privasi.
- [x] M1 — Backup source code sebelum perubahan.
- [x] M2 — Backup database terenkripsi sebelum perubahan.
- [x] M3 — Buat progress log.
- [x] M4 — Rancang schema, constraint, index, grant/RLS, dan kontrak API.
- [x] M5 — Implementasikan schema sumber dan SQL migrasi idempotent.
- [x] M6 — Implementasikan API baca/tulis pesan mobile.
- [x] M7 — Implementasikan edit, soft delete, reply, pin, dan lock.
- [x] M8 — Implementasikan report/block serta konflik laporan terhadap PJ.
- [x] M9 — Implementasikan UI Flutter daftar grup dan ruang percakapan.
- [x] M10 — Tambahkan pengujian kontrak, authorization, dan abuse cases.
- [x] M11 — Jalankan pemeriksaan format, analyzer, test, dan build via GitHub Actions.
- [x] M12 — Review migrasi; minta user menjalankan langkah Supabase eksternal.
- [ ] M13 — Deploy preview, smoke test lintas role/kelas, lalu production.
- [ ] M14 — Perbarui dokumentasi privacy/security dan tutup milestone.

## Bukti Backup Pra-Fitur

### Source code

- Branch: `main`
- Baseline commit: `2d2c53f8e07c37e54a176a8e81423930b33d5833`
- Tag remote: `pre-mobile-groups-2026-09-24`
- Repository: `ywildan/karsa`

### Database

- Workflow: `Encrypted Database Backup`
- Run ID: `36006484158`
- Trigger: manual (`workflow_dispatch`)
- Status: `completed`
- Conclusion: `success`
- Head: `main` / `2d2c53f8e07c37e54a176a8e81423930b33d5833`
- Artifact: `karsa-database-backup-36006484158`
- Artifact ID: `10810706247`
- Ukuran: 49.004 byte
- Digest artifact: `sha256:1c44df3f9b02e40d671c81cf67bbef9f2f831c29cacfeb29b61782cc850142ad`
- Kedaluwarsa: 24 Oktober 2026 pukul 13:34:21 UTC
- Artifact berisi dump terenkripsi dan checksum; plaintext dihapus runner.

## Security Invariants

Semua implementasi harus mempertahankan aturan berikut:

1. Mobile bearer token diverifikasi dan sesi yang revoke/kedaluwarsa ditolak.
2. Membership dihitung dari kelas terkini di database, bukan claim lama client.
3. Akses room lintas kelas selalu ditolak tanpa membocorkan keberadaan room.
4. `is_admin` tidak pernah menjadi alasan mengizinkan akses grup.
5. Hak pin/lock/hide mensyaratkan `KelasMatkul.pj_id = actor.id`.
6. Penulis hanya dapat mengedit dalam 15 menit dan soft-delete pesannya sendiri.
7. Input divalidasi, panjang dibatasi, dan write memakai idempotency key.
8. Audit tindakan tidak menyimpan body pesan.
9. Endpoint web/admin untuk membaca percakapan tidak dibuat.
10. Tabel baru menerima grant minimum dan RLS/policy eksplisit untuk runtime.

## Langkah Eksternal yang Diperkirakan

Langkah berikut tidak akan dilakukan diam-diam dan akan diminta kepada user saat
dibutuhkan:

- Menjalankan SQL migrasi yang telah direview melalui Supabase SQL Editor.
- Memeriksa hasil query verifikasi grant, RLS, policy, constraint, dan index.
- Memicu GitHub Actions untuk build APK bila autentikasi CLI tidak tersedia.
- Menguji APK pada minimal dua akun/role dan, bila tersedia, dua kelas berbeda.
- Menyetujui deployment preview/production setelah smoke test.

## Log Berkala

### 24 September 2026 — Scope dan backup

- Scope grup dikoreksi: semua mahasiswa dan seluruh PJ dalam satu kelas menjadi
  anggota semua grup mata kuliah kelas tersebut.
- Otoritas PJ dipisahkan dari membership: PJ hanya mengelola grup mata kuliahnya.
- Keputusan: tidak ada unique constraint satu-PJ-satu-matkul.
- Keputusan: MVP bukan E2EE dan tidak memakai Realtime.
- Snapshot Git berhasil dibuat dan didorong ke remote.
- Backup database terenkripsi manual berhasil dan artifact terverifikasi tersedia.
- Tidak ada dependency atau software yang dipasang secara lokal.

### 24 September 2026 — Architecture contract

- `KelasMatkul` ditetapkan sebagai room sehingga grup selalu otomatis tersedia.
- Membership dan hak pengelola dirumuskan sebagai dua pemeriksaan berbeda.
- Kontrak endpoint, cursor pagination, idempotency, tombstone, lock, pin, hide,
  report, block, grant, RLS, retensi, dan test matrix didokumentasikan.
- RLS diakui sebagai defense untuk database role; authorization per-user tetap
  dilakukan service API karena runtime memakai satu role bersama.
- M4 selesai tanpa migrasi database dan tanpa instalasi lokal.

### 24 September 2026 — Schema dan migration source

- `KelasMatkul` memperoleh status lock tanpa constraint unik pada `pj_id`.
- Model `GroupMessage`, `GroupReport`, dan `GroupBlock` ditambahkan ke Prisma.
- `prisma/mobile-groups.sql` dibuat idempotent dengan FK, CHECK, index, RLS,
  revoke public roles, grant minimum runtime/backup, dan policy per operasi.
- `prisma/init.sql` diselaraskan dengan schema sumber.
- Seed development memakai PJ berbeda untuk dua mata kuliah agar pengujian hak
  PJ pada grup sendiri vs grup lain bisa dilakukan.
- `prisma format` dan `prisma validate` berhasil menggunakan URL dummy; tidak
  ada koneksi database dan tidak ada dependency yang dipasang.
- SQL migrasi belum dijalankan ke Supabase dan masih menunggu tahap eksternal.

### 24 September 2026 — Backend API dan Flutter UI

- API mobile daftar grup, pagination pesan, kirim, reply, edit 15 menit, soft
  delete, pin, lock, hide, report, block, dan resolusi laporan PJ dibuat.
- Seluruh akses grup menolak admin dan memverifikasi kelas terkini.
- Hak pengelola selalu memverifikasi `KelasMatkul.pj_id` untuk grup terkait.
- Write pesan memakai idempotency key dan guard 12 pesan/menit per actor.
- Tiga reporter unik memicu auto-hide; PJ tidak dapat menangani laporan terhadap
  pesannya sendiri.
- Audit mutasi hanya menyimpan ID/metadata tindakan, bukan body pesan.
- Flutter memperoleh tab Grup, daftar grup otomatis, ruang chat text-only,
  pagination, polling 12 detik saat layar aktif, composer reply, action sheet,
  serta layar laporan khusus PJ grup.
- Prisma Client digenerate dari dependency yang sudah tersedia; tidak ada
  package yang diinstal.
- TypeScript check dan Next.js production build berhasil. Satu warning lama di
  `lib/services/student-service.ts` tetap ada dan tidak terkait fitur grup.

### 24 September 2026 — Validasi CI dan APK

- Branch implementasi: `feat/mobile-groups`.
- Commit tervalidasi: `879d22c6884382d0b32ddf5c0f099d7fcf4a2de3`.
- GitHub Actions run: `36010042379`, status `completed/success`.
- Backend lolos `npm ci`, Prisma Client generation, dan TypeScript typecheck.
- Flutter lolos dependency resolution, formatter, analyzer, seluruh test,
  launcher icon generation, dan release APK build.
- Analyzer CI memakai `dart analyze --format=machine` dari SDK Flutter agar
  diagnosis per baris dapat diterbitkan sebagai anotasi Actions.
- Artifact APK: `karsa-mobile-apk-879d22c6884382d0b32ddf5c0f099d7fcf4a2de3`.
- Artifact ID: `10812406521`, ukuran 24.453.476 byte.
- Digest artifact: `sha256:225826409611bd041e1020e250cfe8e628563000e0a19b4e24949b4e23937acf`.
- Artifact kedaluwarsa: 8 Oktober 2026 pukul 14:08:30 UTC.
- Tidak ada dependency atau software yang dipasang secara lokal.

### 24 September 2026 — Authorization dan abuse policy tests

- Policy keamanan grup dipisahkan menjadi fungsi murni yang juga dipakai oleh
  service API, sehingga test menguji aturan yang benar-benar dieksekusi aplikasi.
- Enam test otomatis mencakup fail-closed untuk admin/user tanpa kelas,
  otoritas PJ per-grup, lock bypass hanya oleh PJ grup tersebut, batas edit
  tepat 15 menit, ambang auto-hide tiga laporan, dan larangan self-moderation.
- `npm run test:groups` dan TypeScript typecheck berhasil tanpa instalasi lokal.
- Test tersebut ditambahkan ke job `Validate mobile API` di GitHub Actions.
- Final test/build run `36011022654` selesai sukses untuk commit `779c2dc`.
- Artifact final: `karsa-mobile-apk-779c2dcabc49dc654d7ff306c2ebc079131dd016`,
  ID `10812702790`, ukuran tampilan 23,3 MB, digest
  `sha256:85f85e9bad9afbffbc2516462adb0fd872dcd601cef1c50d4e3f50bfea8f5df1`.

### 24 September 2026 — Persiapan review migrasi

- SQL migrasi ditinjau ulang terhadap schema Prisma dan kontrak authorization.
- Dibuat `docs/mobile-groups-verify.sql` yang sepenuhnya read-only untuk
  memeriksa tabel, kolom lock, RLS, grants runtime/public, sembilan policy,
  constraint, dan index setelah migrasi.
- Pada checkpoint ini migrasi belum dijalankan; M12 tetap terbuka sampai output
  verifikasi Supabase diperiksa.

### 24 September 2026 — Eksekusi migrasi production

- User menjalankan seluruh `prisma/mobile-groups.sql` melalui SQL Editor pada
  project Supabase production.
- Supabase mengembalikan status sukses tanpa error.
- Belum ada merge/deploy production; M12 tetap terbuka sampai seluruh query
  read-only pada `docs/mobile-groups-verify.sql` diperiksa.

### 24 September 2026 — Verifikasi migrasi production

- Tabel `GroupMessage`, `GroupReport`, dan `GroupBlock` tersedia, dimiliki
  `postgres`, dan seluruhnya memiliki RLS aktif.
- Seluruh kolom chat dan dua kolom lock `KelasMatkul` sesuai schema Prisma.
- Grant `karsa_runtime` tepat per operasi; `anon` dan `authenticated` tidak
  memiliki akses apa pun ke ketiga tabel.
- Sembilan policy runtime tersedia dan terikat hanya pada `karsa_runtime`.
- Primary key, foreign key, CHECK constraint, unique index, dan index pencarian
  lengkap sesuai migration contract.
- `karsa_backup` memiliki akses SELECT ke ketiga tabel, sehingga backup
  terenkripsi berikutnya tetap mencakup data grup.
- M12 selesai. Branch belum digabung dan backend production belum dideploy.

### 24 September 2026 — Integrasi backup schema grup

- Assertion restore diperbarui dari 14 menjadi 17 tabel dan secara eksplisit
  mencakup `GroupMessage`, `GroupReport`, serta `GroupBlock`.
- Assertion RLS diperbarui menjadi 17 tabel dan policy runtime menjadi 26.
- Dokumentasi backup/restore diselaraskan dengan schema production terbaru.

### 24 September 2026 — Backup pasca-migrasi

- Workflow `Encrypted Database Backup` run `36013841613` pada branch
  `feat/mobile-groups` selesai sukses di commit `6082951`.
- Artifact: `karsa-database-backup-36013841613`, ID `10813621797`, ukuran
  tampilan 65,2 KB.
- Digest artifact:
  `sha256:d8a9b023a19a068ae2d59b5b5614d13b2dd81a2fc42c263ab800c91e3cb57850`.
- Backup ini dibuat setelah ketiga tabel grup terverifikasi di production dan
  selanjutnya harus diuji restore ke project `karsa-restore-test`.

### 24 September 2026 — Restore pasca-migrasi

- Workflow `Verify Database Restore` run `36014635130` pada branch
  `feat/mobile-groups` selesai sukses di commit `8cb0ed8`.
- Artifact backup run `36013841613` berhasil diunduh, checksum diverifikasi,
  didekripsi, dan struktur dump PostgreSQL 17 dinyatakan valid.
- Guard memastikan target adalah project terisolasi `karsa-restore-test`.
- Restore schema public berjalan atomik dan assertion 17 tabel, 17 RLS, serta
  26 policy berhasil.
- File dump plaintext sementara dihapus oleh cleanup job.

### 24 September 2026 — Smoke test API terisolasi

- GitHub Actions run `36015498388` selesai sukses pada commit `d0b3205`.
- PostgreSQL 17 sementara dibuat oleh runner; schema Prisma dan seed uji dimuat
  tanpa menyentuh production maupun restore-test.
- Endpoint Next.js asli lolos skenario unauthenticated, admin/no-class,
  membership lintas kelas, hak PJ per-grup, idempotency, reply lintas grup,
  lock, pin, edit lewat 15 menit, tombstone delete, report tiga pengguna,
  self-report/self-moderation, block lintas kelas, dan token revoke.
- Fresh-database smoke menemukan dan memperbaiki seed lama yang memakai ID
  kategori hardcoded; seed sekarang mengambil ID kategori aktual berdasarkan nama.
- Regresi Flutter analyzer, test, release APK, dan upload artifact tetap sukses.
- Artifact APK: `karsa-mobile-apk-d0b3205d194b88d225ccf6f02d54ec870d029743`,
  ID `10813639746`, digest
  `sha256:b16ebd84eaf1fb01e2a955e6d93f42be3281963b8813fcb3cab9619531f8349f`.

### 24 September 2026 — Retention implementation

- Supabase Cron dipilih sebagai scheduler internal database; tidak ada layanan
  pihak ketiga, webhook, atau body pesan yang keluar dari PostgreSQL.
- `karsa_purge_group_retention()` menghapus seluruh pesan setelah semester
  berakhir + 90 hari dan memusnahkan body tombstone setelah 30 hari.
- Body yang masih menjadi bukti laporan terbuka atau laporan yang selesai dalam
  90 hari terakhir tidak dipurge lebih awal dan pesan tidak ikut dihapus saat
  retensi semester berakhir.
- Hak EXECUTE dicabut dari public, `anon`, `authenticated`, `karsa_runtime`, dan
  `karsa_backup`; hanya job yang dibuat database owner yang menjalankannya.
- Scheduler dirancang berjalan setiap hari pukul 03:17 WIB dan idempotent saat
  dipasang ulang. Aktivasi Cron dan SQL production masih menunggu langkah user.

## Dokumen Terkait

- `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md`
- `docs/SECURITY-HARDENING-LOG.md`
- `docs/MOBILE-GROUP-ARCHITECTURE.md`
- `docs/mobile-groups-retention-verify.sql`
- `docs/DATABASE-BACKUP-RESTORE.md`
- `docs/architecture.md`
- `prisma/schema.prisma`
- `prisma/mobile-native.sql`
- `prisma/mobile-groups-retention.sql`
