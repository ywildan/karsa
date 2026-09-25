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

   Untuk mengirim Base64 langsung ke secret tanpa mencetaknya ke terminal, jika
   GitHub CLI di Codespace sudah login ke akun pemilik repo:

   ```sh
   base64 -w0 karsa-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --repo ywildan/karsa
   ```

   Password dan alias dapat dimasukkan melalui form GitHub Secrets yang sama.
   Base64 bukan enkripsi; hanya simpan nilainya sebagai Actions Secret, jangan
   sebagai file/commit/artifact publik.

## Verifikasi

- Jalankan workflow `Validate and Build Karsa Mobile` pada `main`.
- Pastikan validasi dan build sukses dan artifact APK tersedia.
- Simpan keystore/password di backup aman; kehilangan private key berarti APK
  mendatang tidak dapat memperbarui instalasi yang memakai kunci ini.
- APK lama yang dipasang sebelum keystore permanen tersedia kemungkinan perlu
  di-uninstall satu kali. Setelah pemasangan APK permanen pertama, rilis
  berikutnya memakai kunci yang sama dan dapat dipasang sebagai update.
