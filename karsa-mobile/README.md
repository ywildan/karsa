# Karsa Mobile (Flutter WebView Wrapper)

APK Flutter yang membungkus aplikasi web Karsa menggunakan WebView. Cocok untuk PJ (mobile view) dan Mahasiswa (desktop view) karena langsung memakai aplikasi web yang sudah responsif.

## Struktur File

```
karsa-mobile/
├── pubspec.yaml      # Konfigurasi Flutter + dependencies + config ikon
├── assets/
│   ├── icon.png             # Launcher icon legacy (full-bleed #CF6A12)
│   └── icon_foreground.png  # Foreground ikon adaptif (transparan)
├── lib/
│   └── main.dart     # Entry point: WebView full screen
└── README.md         # Dokumentasi ini
```

## Cara Kerja Build

GitHub Actions di `.github/workflows/karsa-mobile-build.yml` akan:

1. Generate project Flutter baru dari template (`flutter create`).
2. Overlay file custom kita (`pubspec.yaml`, `lib/main.dart`, dan `assets/*.png`).
3. Patch nama app menjadi **SiKarsa** (`android:label` di AndroidManifest).
4. Patch `minSdkVersion` ke 21 agar kompatibel dengan `webview_flutter`.
5. Generate launcher icon dari `assets/icon.png` via `flutter_launcher_icons`.
6. Build APK release.
7. Upload artifact bernama `karsa-mobile-apk`.

Tidak perlu install Flutter di lokal.

## Konfigurasi Wajib

Sebelum build, ubah URL di `lib/main.dart`:

```dart
const String karsaBaseUrl = 'https://www.sikarsa.id';
```

Ganti dengan URL production Karsa Anda.

## Cara Build APK

### Otomatis via Push

Setiap push ke branch `main` yang menyentuh file di folder `karsa-mobile/` atau workflow akan otomatis trigger build.

### Manual via GitHub UI

1. Buka tab **Actions** di repository GitHub.
2. Pilih workflow **Build Karsa Mobile APK**.
3. Klik **Run workflow**.

### Download APK

1. Buka workflow run yang sudah selesai.
2. Scroll ke bawah ke bagian **Artifacts**.
3. Download `karsa-mobile-apk`.
4. File `app-release.apk` ada di dalam zip tersebut.

## Cara Install di Android

1. Copy `app-release.apk` ke HP.
2. Izinkan install dari **Sumber Tidak Dikenal**.
3. Install APK seperti aplikasi biasa.

## Catatan Keamanan OAuth

Login Google OAuth akan berjalan di dalam WebView. Pastikan URL redirect/callback OAuth Google diatur agar merujuk kembali ke URL yang sama, sehingga sesi tetap berada di dalam WebView.

## Dependencies Utama

- `webview_flutter`: wrapper WebView resmi dari Flutter team.

## Kustomisasi Ikon & Nama App

- **Nama app** di launcher HP: **SiKarsa**, di-patch otomatis oleh workflow ke `android:label` di `AndroidManifest.xml`.
- **Ikon app**: di-generate otomatis oleh workflow via `flutter_launcher_icons` dari `assets/icon.png` (legacy) dan `assets/icon_foreground.png` (adaptive, Android 8+).
- Referensi desain ikon: `public/icon.svg` di repo utama (aksen `#CF6A12`, latar `#FDFBF7`).

Jika ingin mengganti ikon, cukup replace kedua PNG di `assets/` — config di `pubspec.yaml`:

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon.png"
  adaptive_icon_background: "#FDFBF7"
  adaptive_icon_foreground: "assets/icon_foreground.png"
```
