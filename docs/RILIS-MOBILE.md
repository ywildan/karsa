# Rilis Karsa Mobile (APK Android)

Workflow: `.github/workflows/karsa-mobile-build.yml` ("Validate and Build
Karsa Mobile"). Versi kini: lihat `version:` di `karsa-mobile/pubspec.yaml`.

## Cara rilis

1. Pastikan semua perubahan sudah di-merge ke `main` **via PR** (lihat
   `docs/PANDUAN-KONTRIBUSI.md`).
2. Buka GitHub → **Actions** → **Validate and Build Karsa Mobile** →
   **Run workflow** (branch `main`).
3. Isi input:
   - `api_base_url`: URL backend production (default `https://www.sikarsa.id`).
   - `publish_release`: centang **`true`**.
4. Tunggu sampai selesai. Workflow otomatis:
   - menaikkan versi (`scripts/mobile_release.py`),
   - build APK release Flutter,
   - membuat tag `karsa-v2.0.x` + commit `chore(mobile): release 2.0.x`,
   - membuat GitHub Release berisi **satu file**: `Karsa-Mobile-2.0.x-arm64-v8a.apk`
     + `release-metadata.json`.

Jangan membuat release manual via `gh release create` — versinya tidak akan
sinkron dengan pubspec.

## Versioning

- Format pubspec: `2.0.14+16` (version + build number).
- `scripts/mobile_release.py` menaikkan versi otomatis tiap run dengan
  `publish_release=true`; release guard (`tests/test_mobile_release*.py`)
  memastikan tag & versi konsisten.
- Tag release: `karsa-v2.0.x` (tanpa build number).

## Signing

- APK release memakai **satu keystore permanen** agar update tidak perlu
  uninstall. Jangan pernah membuat ulang keystore.
- Workflow mengambil keystore dari GitHub Actions Secrets:
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Kalau secrets belum diisi, APK tetap dibuild tapi **debug-signed** (tidak
  cocok untuk update dari APK release).
- Keystore/password tidak boleh di-commit, jadi artifact, atau muncul di log.
  Backup `.jks` disimpan di penyimpanan privat terenkripsi (Secrets tidak bisa
  dibaca ulang sebagai backup).

## Catatan rilis ("What's Changed")

- Release dibuat dengan `--notes` (satu baris info Android 7+ ARM64) +
  `--generate-notes`.
- GitHub mengisi **"What's Changed" otomatis dari PR yang di-merge** di antara
  dua tag. Commit yang di-push langsung ke `main` **tidak muncul**.
- Karena itu semua perubahan wajib lewat PR — kalau tidak, kolomnya kosong.
- Contoh format: `- fix(mobile): center AI disclaimer text in Teman baca sheet by @ywildan in #45`.

## Batasan

- Hanya **arm64-v8a** yang dipublish (ABI lain tetap jadi build artifact).
- Syarat perangkat: Android 7+ ARM64.
