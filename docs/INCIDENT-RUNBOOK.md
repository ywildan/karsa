# Incident Runbook — Karsa

Dokumen ini menjadi panduan operasional saat Karsa mengalami gangguan. Tujuan utamanya adalah memulihkan layanan dan menjaga integritas data secepat mungkin, kemudian memastikan penyebab utama ditangani.

## 1. Klasifikasi Insiden

| Prioritas | Definisi | Contoh | Target respons awal |
|---|---|---|---|
| **P0** | Aplikasi down total; semua user tidak dapat mengakses Karsa. | Deployment gagal, database tidak dapat dijangkau, login gagal untuk semua role. | Segera, maksimal 15 menit setelah diketahui. |
| **P1** | Fitur kritis rusak, tetapi aplikasi masih dapat dibuka. | Input poin tidak bekerja, autentikasi down, data poin salah atau berisiko hilang. | Maksimal 30 menit. |
| **P2** | Fitur non-kritis rusak atau mengalami degradasi. | Export gagal, rapor lambat, leaderboard tidak termuat. | Pada hari kerja yang sama. |
| **P3** | Bug minor atau masalah UX tanpa risiko data. | Teks keliru, tampilan tidak rapi, animasi atau filter kurang nyaman. | Masuk backlog dan diprioritaskan pada siklus berikutnya. |

Jika tingkat dampak belum jelas, gunakan klasifikasi yang lebih tinggi sampai diagnosis membuktikan sebaliknya.

## 2. Prosedur Penanganan

### 2.1 P0 — Aplikasi Down Total

**Deteksi**

- Laporan bahwa halaman Karsa tidak dapat dibuka oleh seluruh role.
- Health check atau deployment Vercel gagal.
- Lonjakan error server, timeout, atau kegagalan koneksi database.

**Diagnosa**

1. Catat waktu mulai, URL, pesan error, dan deployment aktif.
2. Periksa Vercel Logs pada deployment dan Function terkait.
3. Periksa Supabase Logs untuk error API, Postgres, atau koneksi.
4. Periksa status Vercel, Supabase, dan Google Workspace.
5. Bandingkan waktu mulai insiden dengan deployment atau perubahan database terakhir.

**Mitigasi**

1. Jika dipicu deployment baru, redeploy deployment stabil sebelumnya.
2. Jika penyedia layanan sedang bermasalah, hentikan perubahan baru dan tampilkan informasi gangguan di landing page bila memungkinkan.
3. Jika masalah database berisiko merusak data, hentikan sementara aktivitas tulis sampai kondisi aman.

**Resolusi**

- Perbaiki penyebab utama pada branch terpisah, lakukan verifikasi, lalu deploy.
- Jika data rusak atau hilang, jalankan prosedur restore yang sesuai dan validasi jumlah serta relasi data sebelum membuka layanan penuh.

**Post-mortem**

- Buat kronologi, dampak, akar masalah, tindakan pemulihan, dan durasi insiden.
- Tetapkan tindakan pencegahan beserta PIC dan tenggat waktu.

### 2.2 P1 — Fitur Kritis Rusak

**Deteksi**

- PJ gagal mencatat atau menghapus poin.
- Semua user gagal login, atau role/otorisasi bekerja tidak semestinya.
- Audit log tidak tercatat atau data utama dan audit tidak konsisten.

**Diagnosa**

1. Reproduksi dengan role dan data uji yang sesuai tanpa mengubah data produksi bila tidak diperlukan.
2. Periksa Vercel Function Logs untuk Server Action atau route terkait.
3. Periksa Supabase API/Postgres Logs dan constraint database.
4. Periksa status Vercel, Supabase, dan Google jika gangguan berkaitan dengan infrastruktur atau OAuth.
5. Cocokkan `PoinLog` dan `AuditLog` untuk menilai apakah ada inkonsistensi data.

**Mitigasi**

1. Rollback deployment jika regresi berasal dari rilis terbaru.
2. Nonaktifkan atau hindari fitur terdampak dan berikan workaround operasional yang tidak merusak audit trail.
3. Simpan catatan input secara terbatas di kanal internal jika input harus ditunda; masukkan kembali setelah layanan pulih dengan verifikasi admin.

**Resolusi**

- Perbaiki validasi, transaksi, autentikasi, atau query penyebab gangguan.
- Uji happy path, error path, otorisasi, serta konsistensi data utama dan audit sebelum deploy.

**Post-mortem**

- Dokumentasikan data yang terdampak dan tindakan rekonsiliasi.
- Tambahkan regression test atau langkah verifikasi deployment yang relevan.

### 2.3 P2 — Fitur Non-kritis Rusak

**Deteksi**

- Laporan export gagal, rapor lambat, filter bermasalah, atau halaman tertentu timeout.
- Error terlokalisasi pada satu fitur tanpa menghentikan input poin dan autentikasi.

**Diagnosa**

1. Catat parameter, kelas, semester, browser, dan waktu kejadian.
2. Periksa Vercel Function Logs dan waktu eksekusi request terkait.
3. Periksa Supabase Logs untuk query lambat atau error koneksi.
4. Periksa status penyedia jika ada indikasi degradasi eksternal.

**Mitigasi**

- Gunakan export atau laporan manual sementara jika aman.
- Kurangi lingkup filter/data atau ulangi proses di luar jam sibuk.
- Rollback hanya jika dampak regresi lebih besar daripada risiko rollback.

**Resolusi**

- Optimalkan query, perbaiki format export, atau perbaiki UI yang gagal.
- Verifikasi dengan dataset kecil dan besar sebelum deploy.

**Post-mortem**

- Catat pola beban, gap monitoring, dan batas data yang perlu diuji ke depan.

### 2.4 P3 — Bug Minor / UX Issue

**Deteksi**

- Laporan visual, copy, aksesibilitas ringan, atau interaksi yang membingungkan tanpa kehilangan fungsi utama.

**Diagnosa**

1. Minta URL, browser/perangkat, langkah reproduksi, dan screenshot.
2. Periksa Browser Console jika ada perilaku client yang tidak normal.
3. Tentukan apakah masalah berdampak pada data atau akses; naikkan ke P1/P2 jika ya.

**Mitigasi**

- Berikan workaround sederhana dan catat bug di backlog.
- Tidak perlu rollback kecuali masalah menghalangi alur penting.

**Resolusi**

- Perbaiki dalam siklus pengembangan normal dan lakukan smoke test pada viewport terkait.

**Post-mortem**

- Untuk P3, cukup catat penyebab dan pencegahan pada tiket perubahan; post-mortem formal tidak wajib.

## 3. Kontak Eskalasi

| Pihak | Kontak |
|---|---|
| Admin Karsa — Yusuf Wildan Affandi | `yuwiaffa@gmail.com` |
| Vercel Support | Melalui dashboard Vercel proyek |
| Supabase Support | Melalui dashboard Supabase proyek |
| Google OAuth Support | Google Cloud Console atau Google Workspace Support, jika diperlukan |

## 4. Status Page

- Vercel: [vercel-status.com](https://www.vercel-status.com)
- Supabase: [status.supabase.com](https://status.supabase.com)
- Google Workspace: [google.com/appsstatus](https://www.google.com/appsstatus)

## 5. Prosedur Rollback

### 5.1 Vercel

1. Buka Project → Deployments.
2. Temukan deployment terakhir yang telah terverifikasi stabil.
3. Pilih opsi untuk redeploy deployment tersebut.
4. Uji login, halaman utama tiap role, input poin, dan audit log.
5. Catat URL serta waktu deployment hasil rollback pada kronologi insiden.

### 5.2 Database Supabase

1. Hentikan perubahan data jika operasi lanjutan dapat memperbesar kerusakan.
2. Tentukan waktu pemulihan yang dibutuhkan dan dampak data setelah titik tersebut.
3. Buka Database → Backups dan pilih backup yang sesuai. Retensi backup otomatis adalah 7 hari.
4. Hubungi Supabase Support melalui dashboard jika proses restore tidak tersedia atau membutuhkan bantuan.
5. Setelah restore, validasi tabel utama seperti `User`, `PoinLog`, `AuditLog`, `Kelas`, dan `KelasMatkul` sebelum membuka layanan kembali.
6. Jika backup otomatis tidak mencakup periode yang dibutuhkan, gunakan ekspor CSV manual di folder Google Drive `Karsa Backup` untuk rekonsiliasi terkontrol.

Restore database dapat menghilangkan perubahan yang terjadi setelah waktu backup. Dampak tersebut harus disetujui admin dan dicatat dalam post-mortem.

## 6. Komunikasi

- **Internal:** koordinasi melalui WhatsApp admin, termasuk prioritas, dampak, PIC, dan pembaruan berkala.
- **User saat P0/P1:** tampilkan pembaruan status di landing page bila aplikasi masih dapat di-deploy. Sertakan fitur terdampak dan workaround tanpa memaparkan detail keamanan.
- **Setelah resolusi:** kirim notifikasi melalui email atau WhatsApp kepada user terdampak, berisi waktu pemulihan dan tindakan yang perlu dilakukan.
- Jangan menyampaikan dugaan penyebab sebagai fakta sebelum diagnosis selesai.

## 7. Lokasi Log

| Sumber | Lokasi | Kegunaan |
|---|---|---|
| Vercel Logs | Project → Deployments → Functions | Error server, route handler, Server Action, dan durasi request |
| Supabase Logs | Project → Logs → API/Postgres | Error API, query database, constraint, dan koneksi |
| Browser Console | DevTools browser user | Error client; user dapat mengirim screenshot beserta URL dan waktu kejadian |
| Audit Log Karsa | `/admin/audit` | Verifikasi perubahan data yang dilakukan melalui aplikasi |

Jangan menyalin token, cookie, credential, atau data pribadi yang tidak diperlukan ke kanal komunikasi insiden.

## 8. Template Catatan Insiden

- ID dan judul insiden:
- Prioritas: P0 / P1 / P2 / P3
- Waktu mulai dan selesai (WIB):
- Fitur dan user terdampak:
- Deployment aktif:
- Kronologi:
- Mitigasi:
- Akar masalah:
- Resolusi:
- Dampak data dan hasil rekonsiliasi:
- Tindakan pencegahan, PIC, dan tenggat:

---

*Pemilik dokumen: Yusuf Wildan Affandi · Dibuat 21 September 2026 (WIB)*
