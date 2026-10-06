# Teman baca — AI artikel Karsa Lib

Fitur disiapkan di backend dan Flutter, tetapi default **nonaktif**. Tanpa konfigurasi yang lengkap, tombol Ringkas dan Tanya AI tetap bertanda “Dalam pengembangan”. APK tidak menyimpan API key, endpoint penyedia, atau model AI.

## Aktivasi nanti

1. Jalankan seluruh [prisma/karsa-lib-ai.sql](../prisma/karsa-lib-ai.sql) di SQL Editor database Karsa. Ini hanya menambah tabel. Jika backend memakai role `karsa_runtime`, script memberikan izin dan policy RLS untuk role tersebut. Akses `anon`/`authenticated` tidak diberikan.
2. Deploy backend terlebih dahulu, lalu APK dengan perubahan AI ini. Selama persiapan, biarkan `AI_ENABLED=false`. Backend baru menerima versi persetujuan dokumen 1.0 maupun 1.1, sehingga APK lama tetap dapat login.
3. Di Vercel → project Karsa → Settings → Environment Variables, isi konfigurasi di bawah untuk environment yang dituju.
4. Uji key dan model di Preview dengan akun mahasiswa serta artikel uji. Key layanan nyata dapat menghasilkan biaya; tes otomatis memakai provider tiruan.
5. Aktifkan `AI_ENABLED=true` di Production dan redeploy backend. Pengguna membuka ulang artikel agar aplikasi mengambil status terbaru. Tidak perlu membangun APK lagi untuk mengganti key/model setelah APK yang mendukung AI terpasang.

```env
AI_ENABLED=false
AI_API_KEY=key-milik-pengelola
AI_BASE_URL=https://penyedia.example.com/v1
AI_MODEL=nama-model-dari-penyedia
AI_TOKEN_PARAMETER=max_completion_tokens
AI_USER_DAILY_LIMIT=5
AI_USER_SUMMARY_DAILY_LIMIT=3
AI_GLOBAL_DAILY_LIMIT=100
AI_MAX_OUTPUT_TOKENS=900
AI_TIMEOUT_MS=20000
```

`AI_BASE_URL` adalah URL dasar HTTPS, bukan URL lengkap `/chat/completions`. Backend menambahkan path tersebut. Endpoint harus mendukung format Chat Completions: Bearer API key, `model`, `messages`, dan respons teks di `choices[0].message.content`. Untuk endpoint yang hanya menerima `max_tokens`, gunakan `AI_TOKEN_PARAMETER=max_tokens`. Referensi format: [Chat Completions API](https://developers.openai.com/api/reference/resources/chat).

Tidak semua endpoint “AI” kompatibel. Endpoint dengan format Anthropic, Gemini native, atau format khusus lain memerlukan adapter tambahan. Tidak ada auto-retry ke provider dan redirect tidak diikuti. Key hanya ada pada header server-ke-provider; detail galat provider tidak dikirim kepada mahasiswa.

## Kuota dan biaya

- Kuota chat default 5 permintaan per pengguna per hari; ringkasan baru default 3. Ringkasan dari cache tidak memakai kuota atau memanggil provider.
- Semua permintaan baru ke provider juga memakai counter global default 100 per hari, dengan reservasi atomik dalam transaksi PostgreSQL.
- Hari berganti pada pukul 00.00 Asia/Jakarta. Counter menghitung percobaan yang sudah dikirim/dipesan, termasuk kegagalan provider, karena kegagalan koneksi tidak menjamin tidak ada biaya.
- Batas ini merupakan jumlah permintaan, bukan nominal rupiah. Atur batas belanja pada akun penyedia juga. Pertanyaan dibatasi 600 karakter, jawaban maksimum token dari konfigurasi, dan konteks percakapan hanya empat pasangan terakhir.
- ID pertanyaan dipakai ulang setelah respons jaringan yang tidak pasti. Replay dengan ID dan isi yang sama tidak memanggil provider lagi. Setelah kegagalan yang sudah pasti, pengguna dapat mengirim percobaan baru.

## Data dan akses

Backend memeriksa login, kapabilitas mahasiswa, prodi artikel, dan status PUBLISHED pada setiap endpoint AI. Admin atau pengguna prodi lain tidak mendapat konteks. Ringkasan disimpan sekali per artikel dengan fingerprint isi, judul, model, endpoint, dan versi prompt. Setelah materi/model berubah, cache lama tidak dipakai dan riwayat lama tidak menjadi konteks materi baru.

Riwayat pertanyaan/jawaban dicatat per pengguna dan artikel; endpoint hanya menampilkan 20 pasangan terbaru milik pengguna tersebut. Artikel yang diarsipkan tidak dapat diakses melalui AI. Menghapus akun/artikel menghapus riwayat terkait lewat foreign key cascade. Counter harian tidak berisi pertanyaan; bucket lama dapat dibersihkan lewat prosedur retensi pengelola.

Isi artikel, pertanyaan, dan empat pasangan percakapan terakhir dikirim ke provider. Nama akun, email, NIM, token sesi, dan API key tidak dimasukkan ke prompt. Aturan retensi provider bergantung pada penyedia yang dipilih. Aplikasi menampilkan pemberitahuan sebelum pengguna membuat ringkasan/bertanya; kebijakan privasi publik menyebut penggunaan AI ketika diaktifkan.

Nomor paragraf dalam jawaban divalidasi backend dan membuka bagian artikel di Flutter. Ini tidak menjamin kebenaran jawaban: model bisa keliru atau memilih rujukan yang tidak mendukung klaimnya. Materi artikel diperlakukan sebagai data tidak tepercaya dan provider tidak diberi tool atau akses web.

## Kontrak endpoint

Semua endpoint memakai Bearer session mobile dan envelope API Karsa, dengan `Cache-Control: no-store`.

- `GET /api/mobile/v1/lib/articles/:id/ai?revision=...`: aktivasi, ringkasan tersimpan, riwayat milik sendiri, kuota.
- `POST /api/mobile/v1/lib/articles/:id/ai/summary`: body `{ "revision": "fingerprint" }`.
- `POST /api/mobile/v1/lib/articles/:id/ai/messages`: body `{ "revision": "fingerprint", "question": "...", "request_id": "id-stabil" }`.

Mode nonaktif tidak mengakses tabel AI dan tidak memanggil provider. Jika artikel berubah saat panel terbuka, kode `AI_ARTICLE_CHANGED` menutup panel dan memuat ulang artikel. `AI_DISABLED` tetap berlaku di backend walaupun pengguna memakai APK lama atau membuat request sendiri. `429 AI_QUOTA_EXCEEDED` menunjukkan batas pengguna/global tercapai.

## Pengujian

`npm run test:lib-ai` menjalankan tes konfigurasi, batas prodi, prompt, parsing, dan error dengan fetch tiruan. `npm run test:lib-ai:integration` hanya boleh dijalankan dengan `AI_TEST_DB=true` pada PostgreSQL lokal terisolasi bernama `karsa_ai_test` (atau database service CI `karsa`). Tes integrasi menguji lease ringkasan, idempotensi, konkurensi kuota, perubahan artikel, dan isolasi riwayat. Jangan gunakan database produksi.

Prisma client perlu dihasilkan ulang dengan `npx prisma generate`; ini tidak mengubah database. Workflow mobile menjalankan tes backend tersebut dan tes Flutter di runner GitHub. Pengujian Flutter tidak membutuhkan key layanan AI nyata.
