# SiKarsa Mobile

Aplikasi Flutter native untuk mahasiswa dan penanggung jawab (PJ) mata kuliah. Aplikasi ini tidak memuat situs melalui WebView; antarmuka, navigasi, penyimpanan sesi, dan komunikasi API berjalan sebagai komponen mobile native.

## Fitur

- Login Google melalui browser sistem dengan OAuth bridge, PKCE, dan deep link.
- Sesi disimpan di secure storage dengan access token singkat dan rotasi refresh token.
- Mahasiswa: laporan poin per mata kuliah dan peringkat kelas.
- PJ: seluruh fitur mahasiswa, input poin, riwayat input, dan hapus poin miliknya.
- Admin tetap menggunakan dashboard web dan tidak memperoleh akses khusus di aplikasi.
- Idempotency key mencegah poin ganda ketika permintaan terkirim ulang.

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
4. Menjalankan format check, analyzer, dan test.
5. Membuat launcher icon dan APK release.
6. Mengunggah `karsa-mobile-apk` sebagai artifact.

Jalankan workflow secara manual dari tab **Actions**, atau push perubahan yang termasuk dalam path pemicu. URL backend dapat diganti melalui input manual workflow; nilai default-nya `https://www.sikarsa.id`.

## Kontrak backend

Endpoint native berada di `/api/mobile/v1`. Build APK harus diarahkan ke deployment backend yang telah menjalankan migrasi tambahan `prisma/mobile-native.sql`.
