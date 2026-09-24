# Karsa Mobile Group — Build Progress

> Catatan kerja fitur grup percakapan mobile-only. Dokumen ini harus diperbarui
> pada setiap milestone. Jangan pernah menulis password, token, connection string,
> secret, atau isi percakapan production di dokumen ini.

## Status Ringkas

- Tanggal mulai: 24 September 2026
- Tahap aktif: pengujian authorization/abuse dan review migrasi
- Kode fitur: selesai di branch `feat/mobile-groups`, belum digabung/deploy
- Migrasi production: belum dijalankan
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
- [ ] M10 — Tambahkan pengujian kontrak, authorization, dan abuse cases.
- [x] M11 — Jalankan pemeriksaan format, analyzer, test, dan build via GitHub Actions.
- [ ] M12 — Review migrasi; minta user menjalankan langkah Supabase eksternal.
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

## Dokumen Terkait

- `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md`
- `docs/SECURITY-HARDENING-LOG.md`
- `docs/MOBILE-GROUP-ARCHITECTURE.md`
- `docs/DATABASE-BACKUP-RESTORE.md`
- `docs/architecture.md`
- `prisma/schema.prisma`
- `prisma/mobile-native.sql`
