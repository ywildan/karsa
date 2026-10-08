# Karsa Android Release Signing

## Tujuan

Semua APK release harus menggunakan satu keystore permanen agar pemasangan
berikutnya bisa menjadi update, tanpa uninstall. Android mensyaratkan package
name sama dan sertifikat penandatangan sama; workflow juga menaikkan
`versionCode` berdasarkan nomor run GitHub Actions.

Workflow menyimpan keystore hanya sementara di runner, mengambilnya dari empat
GitHub Actions Secrets, dan melewati build APK jika salah satu secret belum
diatur. Keystore/password tidak boleh di-commit, diunggah sebagai artifact, atau
ditulis ke log.

## Membuat dan menyimpan keystore

Pembuatan dapat dilakukan di GitHub Codespaces agar tidak perlu memasang Java di
laptop:

1. Buka repo `ywildan/karsa` di GitHub, buat Codespace sementara, lalu buka
   terminal Codespace.
2. Pastikan `keytool` tersedia dengan `keytool -help`. Jika belum ada, pasang
   JDK hanya di Codespace, bukan di laptop.
3. Buat keystore satu kali dengan alias `karsa-release`, algoritma RSA 4096,
   dan masa berlaku 10.000 hari:

   ```sh
   keytool -genkeypair -v -keystore karsa-release.jks -storetype JKS \
     -alias karsa-release -keyalg RSA -keysize 4096 -validity 10000
   ```

   Pilih password kuat dan simpan password secara aman. Jangan membuat ulang
   keystore untuk rilis berikutnya.
4. Buat backup file `.jks` di penyimpanan privat terenkripsi yang kamu kendalikan.
   GitHub Actions Secrets tidak dapat dibaca kembali sebagai backup.
5. Atur secrets pada `Settings > Secrets and variables > Actions` repo `karsa`:

   - `ANDROID_KEYSTORE_BASE64`: isi Base64 dari file `.jks`.
   - `ANDROID_KEYSTORE_PASSWORD`: password keystore.
   - `ANDROID_KEY_ALIAS`: `karsa-release`.
   - `ANDROID_KEY_PASSWORD`: password private key untuk alias tersebut.

   Cara utama adalah memasukkan setiap secret melalui halaman Settings GitHub.
   `gh secret set` hanya berfungsi jika token CLI memiliki izin Actions Secrets
   write; token Codespaces dapat menolak akses tersebut. Jika CLI berizin, Base64
   dapat dikirim tanpa dicetak ke terminal:

   ```sh
   base64 -w0 karsa-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo ywildan/karsa
   ```

   Password dan alias dapat dimasukkan melalui form GitHub Secrets yang sama.
   Base64 bukan enkripsi; hanya simpan nilainya sebagai Actions Secret, jangan
   sebagai file/commit/artifact publik.

## Verifikasi

- Build signing permanen pertama berhasil di run
  [36089951126](https://github.com/ywildan/karsa/actions/runs/36089951126),
  commit `c3d5aa8b74fb61677d25421a210f5df98be44313`.
- Artifact: `karsa-mobile-apk-c3d5aa8b74fb61677d25421a210f5df98be44313`, ID
  `10845795443`, digest
  `sha256:f02b2b86bed7e5a40531626a5b92a1ba38f0112090e346c4130a719c63d9bd3b`.
- Simpan keystore/password di backup aman; kehilangan private key berarti APK
  mendatang tidak dapat memperbarui instalasi yang memakai kunci ini.
- APK lama yang dipasang sebelum keystore permanen tersedia kemungkinan perlu
  di-uninstall satu kali. Setelah pemasangan APK permanen pertama, rilis
  berikutnya memakai kunci yang sama dan dapat dipasang sebagai update.
