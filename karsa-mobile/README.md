# SiKarsa Mobile

Aplikasi Flutter native untuk mahasiswa dan penanggung jawab (PJ) mata kuliah. Aplikasi ini tidak memuat situs melalui WebView; antarmuka, navigasi, penyimpanan sesi, dan komunikasi API berjalan sebagai komponen mobile native.

## Fitur

- Login Google melalui browser sistem dengan OAuth bridge, PKCE, dan deep link.
- Sesi disimpan di secure storage dengan access token singkat dan rotasi refresh token.
- Mahasiswa: laporan poin per mata kuliah dan peringkat kelas.
- PJ: seluruh fitur mahasiswa, input poin, riwayat input, dan hapus poin miliknya.
- Admin tetap menggunakan dashboard web dan tidak memperoleh akses khusus di aplikasi.
- Idempotency key mencegah poin ganda ketika permintaan terkirim ulang.
- Karsa Lib: feed artikel per program studi, halaman baca artikel, vault penulis, editor untuk menulis/menerbitkan/mengarsipkan, dan pengajuan akses penulis. Tersedia melalui `/api/mobile/v1/lib/*`.
- Chat grup per kelas/mata kuliah: kirim dan muat riwayat pesan, pin pesan, blokir pengguna, serta laporkan pesan melalui `/api/mobile/v1/groups/*`.
- Teman baca (asisten AI artikel Karsa Lib): panel ringkasan dan tanya materi dengan rujukan paragraf serta kuota harian, ditambah opsi **web search** (ikon globe) yang menyuntik hasil pencarian realtime (Tavily) sebagai konteks. Fitur sudah terimplementasi di backend dan aplikasi; default nonaktif sampai `AI_ENABLED=true` beserta variabel lain diisi — lihat [panduan Teman Baca](../docs/TEMAN-BACA.md).

## Struktur

```text
karsa-mobile/
├── android/AndroidManifest.xml  # izin jaringan dan deep link karsa://
├── assets/                      # ikon launcher
├── lib/
│   ├── core/                    # API, autentikasi, sesi, model
│   ├── screens/                 # layar native mahasiswa dan PJ
│   ├── widgets/                 # komponen bersama
│   ├── app.dart
│   └── main.dart
├── test/                        # pengujian model/kontrak
└── pubspec.yaml
```

## Build tanpa instalasi lokal

Workflow `.github/workflows/karsa-mobile-build.yml` melakukan seluruh proses di GitHub Actions:

1. Membuat project Flutter sementara.
2. Menyalin source, manifest, aset, dan pengujian.
3. Mengambil dependency di runner GitHub.
4. Menggunakan `pubspec.lock`, lalu menjalankan format, analyzer, dan test.
5. Membuat launcher icon dan APK per arsitektur. PR/branch fitur hanya memakai signing debug untuk validasi build.
6. Pada `main` dengan backend produksi, menggunakan keystore permanen dan memeriksa sertifikat, package, versi, ABI, manifest login, serta backup.
7. Mengunggah APK bertanda tangan produksi dan `release-metadata.json` sebagai artifact `karsa-mobile-apk-<commit>`.

Push dan PR menjalankan validasi/build, tanpa membuat GitHub Release. Untuk publikasi, jalankan workflow dari tab **Actions** pada branch `main` dengan `publish_release=true`; tidak perlu menaikkan versi secara manual. Workflow memilih versi patch berikutnya dari tag yang ada (atau memakai versi di `pubspec.yaml` jika sudah lebih tinggi), membangun dan memverifikasi APK, kemudian menyimpan versi baru ke `pubspec.yaml` di `main` dan menerbitkan GitHub Release. Jika build gagal, versi di repo tidak berubah. Workflow manual tanpa checkbox hanya membuat build untuk pemeriksaan. Penyimpanan versi otomatis memerlukan izin `contents: write` untuk job release dan akses push bot ke `main`.

URL backend dapat diganti menjadi HTTPS origin melalui input manual workflow. Nilai default-nya `https://www.sikarsa.id`. Build staging tidak memakai signing produksi dan tidak boleh dipublikasikan sebagai release. Untuk staging, gunakan instalasi terpisah dari aplikasi produksi.

APK publik memerlukan Android 7+ dan ARM64. Build counter GitHub tetap dipakai agar versionCode meningkat dari APK yang sebelumnya dibagikan; angka `+N` pada pubspec tidak menggantikan counter tersebut. Sertifikat rilis dipin pada `android/release-cert.sha256`, berdasarkan APK `2.0.7` yang sudah diterbitkan. Jangan mengganti keystore/fingerprint untuk update biasa.

## Verifikasi manual (arsip, untuk 2.0.8)

> Catatan: daftar ini disusun untuk rilis 2.0.8 dan dipertahankan sebagai arsip. Versi aktif saat ini `2.0.19+21` (lihat `pubspec.yaml`); checklist ini bukan acuan rilis terkini, tetapi poin-poinnya tetap relevan sebagai pola pengujian manual.

- Pasang APK sebagai update di atas 2.0.7 tanpa uninstall; data/sesi yang masih sah harus tetap terbaca.
- Coba login dari aplikasi baru dibuka, background, dan setelah aplikasi ditutup ketika browser masih terbuka.
- Batalkan login, lalu coba lagi; callback/link lama tidak boleh membatalkan percobaan baru.
- Keluar saat koneksi lambat atau terputus; buka kembali aplikasi dan pastikan tetap meminta login.
- Buka chat/artikel/editor ketika sesi dicabut dari server. Permintaan berikutnya harus membawa aplikasi ke login dan menutup layar privat. Draf yang belum tersimpan pada sesi yang berakhir akan ikut ditutup.
- Muat histori chat lebih dari 30 pesan, lalu blokir/unblokir penulis pesan lama; status seluruh pesan yang sudah dimuat harus diperbarui.
- Coba input/hapus poin, membaca/menulis artikel, dan kirim komentar untuk memastikan alur sehari-hari tetap berjalan.

Untuk pemeriksaan lokal: gunakan Flutter 3.47.0, jalankan `flutter pub get --enforce-lockfile`, `flutter test`, dan `dart analyze lib test` dari folder ini. Guard rilis dapat diuji dengan `python3 -m unittest discover -s tests -p 'test_mobile_release*.py'` dari root repository.

## Kontrak backend

Endpoint native berada di `/api/mobile/v1`. Build APK harus diarahkan ke deployment backend yang telah menjalankan skema dasar `prisma/init.sql` lalu seluruh migrasi additif di `prisma/` agar struktur database cocok dengan `prisma/schema.prisma`: `mobile-native.sql` (poin + idempotency key), `mobile-groups.sql` dan `mobile-groups-retention.sql` (chat grup + retensi), `karsa-lib-ai.sql` dan `karsa-lib-author-social.sql` (Karsa Lib, AI, dan profil penulis), `pengelola-scope.sql` (penunjukan pengelola scoped), serta `user-growth.sql` (analitik pertumbuhan pengguna).
