# Teman baca — AI artikel Karsa Lib

"Teman baca" adalah asisten AI di aplikasi mobile untuk meringkas artikel Karsa
Lib dan menjawab pertanyaan tentang materinya. Implementasi: backend Next.js +
sheet Flutter `karsa-mobile/lib/widgets/lib_ai_sheet.dart`.

## Status & perilaku UI (mobile)

- Bottom sheet dengan dua tab: **Ringkasan** dan **Tanya materi** — bisa
  **di-swipe** (PageView), tidak harus diketuk.
- Ringkasan tampil sebagai daftar **bernombor**; setiap poin bisa merujuk ke
  "Paragraf N" yang kalau diketuk membuka bagian artikel tersebut.
- Tombol **"Tanya tentang ringkasan"** melompat ke tab Tanya materi.
- Kolom chat mempertahankan teks saat AI menjawab; teks baru dibersihkan
  setelah respons berhasil (draft aman kalau request gagal).
- Pertanyaan yang gagal terkirim tidak lenyap: tampil sebagai bubble
  "Gagal terkirim — ketuk untuk coba lagi" (status ikon web ikut dipulihkan).
- Quota habis → tampil pesan "Kuota membuat ringkasan baru hari ini habis."
  + tombol "Periksa ringkasan tersimpan" (cache tidak memakan kuota).
- Disclaimer di bawah sheet, rata tengah: *"AI dapat keliru. Periksa kembali
  artikel dan sumber belajarmu."*
- APK tidak menyimpan API key, endpoint penyedia, atau nama model.
- **Web search (ikon globe)** — di tab Tanya materi ada ikon globe di baris
  chat. Diketuk → aktif untuk 1 pertanyaan berikutnya
  (one-shot, lalu otomatis mati). AI menjawab memakai hasil pencarian web
  realtime (Tavily) di samping isi artikel, dengan daftar sumber web yang
  bisa diketuk. Kuota habis → popup "Kuota Web Search Habis" + tombol
  "Lihat Paket" (buka halaman plan di web).

## Aktivasi backend

Fitur default **nonaktif** sampai konfigurasi lengkap.

1. Jalankan seluruh `prisma/karsa-lib-ai.sql` di SQL Editor database Karsa
   (hanya menambah tabel; memberi izin + policy RLS untuk role `karsa_runtime`).
   Untuk update Oktober 2026 (kolom web search + analitik), jalankan ulang
   file yang sama — pernyataan ALTER-nya idempoten (`IF NOT EXISTS`).
2. Deploy backend dulu, lalu APK. Selama persiapan biarkan `AI_ENABLED=false`.
3. Isi environment variables di Vercel (project Karsa):

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
# Web search (Tavily) — opsional, default nonaktif
AI_SEARCH_ENABLED=false
AI_SEARCH_API_KEY=tvly-...
AI_SEARCH_MAX_RESULTS=5
AI_SEARCH_TIMEOUT_MS=8000
AI_WEBSEARCH_FREE_LIMIT=3
AI_WEBSEARCH_PREMIUM_LIMIT=3
AI_WEBSEARCH_PLUS_LIMIT=5
AI_WEBSEARCH_GLOBAL_LIMIT=100
```

`AI_BASE_URL` adalah URL dasar HTTPS (backend menambahkan
`/chat/completions`). Endpoint harus mendukung format Chat Completions
(OpenAI-compatible): Bearer API key, `model`, `messages`, respons teks di
`choices[0].message.content`. Untuk endpoint yang hanya menerima `max_tokens`,
pakai `AI_TOKEN_PARAMETER=max_tokens`. Format Anthropic/Gemini native butuh
adapter tambahan. Tidak ada auto-retry dan redirect tidak diikuti.

4. Uji key & model di Preview dengan akun mahasiswa + artikel uji (key nyata
   bisa menimbulkan biaya; tes otomatis memakai provider tiruan).
5. Aktifkan `AI_ENABLED=true` di Production → redeploy backend. Pengguna buka
   ulang artikel untuk mengambil status terbaru; tidak perlu rebuild APK untuk
   ganti key/model.

## Kuota & biaya

- Chat: 5 permintaan/pengguna/hari; ringkasan baru: 3/hari. Ringkasan dari
  cache tidak memakai kuota dan tidak memanggil provider.
- Semua request baru ke provider juga memakai counter global 100/hari
  (reservasi atomik di PostgreSQL).
- **Web search** (ikon globe): kuota terpisah per tier (`User.premium_tier`,
  diatur manual oleh admin) —
  gratis 3x/**bulan**, premium 3x/hari, plus 5x/hari; global 100/hari.
  Search yang gagal (error, bukan fallback) **tidak** memakan kuota.
  Free tier Tavily: 1.000 query/bulan; selebihnya ±Rp 130/query.
- Hari berganti pukul 00.00 WIB (kuota gratis web search reset tiap tanggal 1).
  Counter menghitung percobaan yang dikirim/dipesan, termasuk yang gagal
  (kegagalan koneksi tidak menjamin tidak ada biaya) — kecuali search web
  yang gagal sebelum reservasi.
- Batas = jumlah permintaan, bukan rupiah. Atur juga batas belanja di akun
  penyedia. Pertanyaan ≤ 600 karakter; konteks = 4 pasangan percakapan terakhir.

## Data & privasi

- Backend memeriksa login, kapabilitas mahasiswa, prodi artikel, dan status
  PUBLISHED di setiap endpoint AI.
- Yang dikirim ke provider: isi artikel, pertanyaan, 4 pasangan percakapan
  terakhir. Yang TIDAK dikirim: nama, email, NIM, token sesi, API key.
- Ringkasan di-cache per artikel (fingerprint isi + model + versi prompt);
  materi/model berubah → cache lama tidak dipakai.
- Riwayat: 20 pasangan terbaru per pengguna per artikel; artikel diarsipkan
  tidak bisa diakses via AI; hapus akun/artikel menghapus riwayat (FK cascade).
- Nomor paragraf divalidasi backend — tapi model tetap bisa keliru; materi
  diperlakukan sebagai data tidak tepercaya.
- **Web search**: hasil Tavily (judul, URL https, cuplikan) disuntik ke prompt
  sebagai konteks; hasil pencarian juga diperlakukan sebagai data tidak
  tepercaya (bukan instruksi). Sumber web yang URL-nya tidak valid difilter,
  tidak menggagalkan jawaban. Yang dikirim ke Tavily: hanya teks pertanyaan.
- **Analitik**: setiap turn AI mencatat `web_search`, `latency_ms`,
  `prompt_tokens`, `completion_tokens`, `search_error`, dan `web_sources`
  (bahan evaluasi biaya & kualitas). Retensi teks pertanyaan: 90 hari.

## Kontrak endpoint

Bearer session mobile + envelope API Karsa, `Cache-Control: no-store`.

- `GET /api/mobile/v1/lib/articles/:id/ai?revision=...` — aktivasi, ringkasan
  tersimpan, riwayat sendiri, kuota.
- `POST /api/mobile/v1/lib/articles/:id/ai/summary` — body `{ "revision": "fingerprint" }`.
- `POST /api/mobile/v1/lib/articles/:id/ai/messages` — body `{ "revision": "fingerprint", "question": "...", "request_id": "id-stabil", "web_search": true }`
  (opsional, default false). Respons turn menyertakan `web_sources`
  `[{ "title", "url", "published_at?" }]` bila web search dipakai; state kuota
  menyertakan `websearch_tier`, `websearch_limit`, `websearch_remaining`.

Kode error: `AI_DISABLED`, `AI_ARTICLE_CHANGED` (artikel berubah saat panel
terbuka → panel menutup & artikel dimuat ulang), `429 AI_QUOTA_EXCEEDED`,
`502 AI_SEARCH_UNAVAILABLE` (Tavily gagal; kuota tidak terpakai).

## Pengujian

- `npm run test:lib-ai` — konfigurasi, batas prodi, prompt, parsing, error (fetch tiruan).
- `npm run test:lib-ai:integration` — hanya dengan `AI_TEST_DB=true` di
  PostgreSQL lokal terisolasi `karsa_ai_test` (atau service CI `karsa`).
  Jangan pakai database produksi.
- `npx prisma generate` perlu dijalankan ulang setelah perubahan schema.
- Workflow mobile menjalankan tes backend ini + tes Flutter; Flutter tidak
  butuh key AI nyata.
