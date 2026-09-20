# SOP — Koreksi Poin & Retensi Data

**Karsa — Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**

| Aspek | Nilai |
| --- | --- |
| **Versi** | 1.1 |
| **Tanggal berlaku** | 19 September 2026 |
| **Penanggung jawab** | Yusuf Wildan Affandi (admin) |
| **Review berikutnya** | Desember 2026 (akhir semester) |
| **Acuan regulasi** | UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi |

> **Disclaimer:** Dokumen ini adalah panduan operasional internal, bukan nasihat hukum. Untuk kepatuhan formal terhadap UU PDP, konsultasikan dengan pihak berwenang di UNTIDAR (Legal/Biro Hukum).

---

## 1. Tujuan

SOP ini mengatur:

1. **Prosedur koreksi poin** — alur penanganan ketidaksesuaian poin oleh mahasiswa, PJ, dosen, dan admin.
2. **Kebijakan retensi data** — berapa lama data disimpan dan kapan dihapus.
3. **Prosedur erasure** — proses permohonan penghapusan data pribadi (UU PDP).
4. **Backup & recovery** — bagaimana data dilindungi dari kehilangan.
5. **Penanggung jawab** — siapa yang bertanggung jawab atas setiap proses.

Tujuan: transparansi, akuntabilitas, dan kepatuhan UU PDP tanpa mengorbankan integritas data akademik.

---

## 2. Koreksi Poin

### 2.1 Matriks Hak Koreksi

| Aktor | Mengajukan | Mengeksekusi |
|---|:---:|:---:|
| Mahasiswa | ✅ | ❌ |
| PJ (pengampu matkul) | ✅ | ✅ (hanya poin yang ia input) |
| Dosen pengampu | ✅ | ❌ (eskalasi ke admin) |
| Admin | ✅ | ✅ (semua poin) |

### 2.2 Alur Koreksi — 3 Skenario

#### Skenario A — PJ Salah Input, Sadar Sendiri

**Kondisi:** PJ menyadari kesalahan (salah poin, salah mahasiswa, salah kategori).

**Prosedur:**
1. PJ login dari HP → buka tab **Riwayat** (`/riwayat-poin`)
2. Cari poin yang salah → klik ikon **Hapus**
3. Konfirmasi di dialog → poin terhapus
4. Input ulang poin yang benar via tab **Input**

**Batas waktu:** selama semester aktif.
**Audit:** setiap penghapusan tercatat di `/admin/audit` (timestamp WIB, identitas PJ).

---

#### Skenario B — Mahasiswa Komplain Poin Kurang/Salah

**Kondisi:** mahasiswa merasa poin tidak sesuai, atau poin yang seharusnya diterima tidak tercatat.

**Prosedur:**

1. **Mahasiswa** kirim email ke `yuwiaffa@gmail.com`:
   - **Subjek:** `[Karsa] Permohonan Koreksi Poin`
   - **Isi:**
     - Nama lengkap + NIM
     - Mata kuliah + kelas
     - Tanggal aktivitas
     - Jenis aktivitas (bertanya / menjawab / presentasi)
     - Poin yang diharapkan
     - Bukti pendukung (opsional)

2. **Admin** terima email → cek status poin di `/admin/audit`:
   - Poin belum tercatat → eskalasi ke PJ pengampu
   - Poin salah → eskalasi ke PJ pengampu
   - Poin sudah benar → balas email dengan penjelasan

3. **PJ pengampu** verifikasi:
   - Klaim valid → PJ input/hapus poin sesuai koreksi
   - Klaim tidak valid → PJ beri penjelasan ke admin

4. **Admin** konfirmasi ke mahasiswa via email dalam **7 hari kerja**.

**Batas waktu:** selama semester aktif. Setelah semester berganti, poin semester lama terkunci.

**Sengketa:** jika mahasiswa tidak puas dengan keputusan PJ → admin eskalasi ke **dosen pengampu**. Keputusan dosen bersifat final.

---

#### Skenario C — Dosen Pengampu Menemukan Anomali

**Kondisi:** dosen review `/admin/rekap` dan menemukan ketidaksesuaian.

**Prosedur:**
1. Dosen buka `/admin/rekap` → pilih kelas + matkul
2. Dosen identifikasi anomali
3. Dosen diskusi dengan PJ pengampu (langsung atau via admin)
4. Dosen memutuskan koreksi
5. Admin eksekusi koreksi di sistem atas nama dosen
6. Koreksi tercatat di `/admin/audit` (actor = admin, catatan referensi keputusan dosen)

**Batas waktu:** selama semester aktif, atau setelahnya jika ada bukti kesalahan sistem.

---

### 2.3 Aturan Umum Koreksi

| Aturan | Keterangan |
|---|---|
| **Batas waktu** | Selama semester aktif. Setelah semester ganti → data terkunci. |
| **Pengecualian** | Kesalahan sistem (bug) → bisa dikoreksi kapan saja dengan persetujuan dosen + admin. |
| **Bukti** | Koreksi sebaiknya disertai bukti (screenshot, catatan PJ, kesaksian). |
| **Audit** | Setiap koreksi tercatat di `/admin/audit`. |
| **Immutability** | Tidak immutable. Poin bisa dihapus, tapi penghapusan tercatat & dapat diverifikasi. |

---

## 3. Retensi Data

### 3.1 Kebijakan Retensi

| Jenis Data | Retensi | Alasan |
|---|---|---|
| **Data akademik (`PoinLog`)** | Selama semester aktif + tetap tersimpan setelahnya | Rapor, leaderboard, histori akademik |
| **Data mahasiswa (`User`)** | Selama terdaftar di UNTIDAR | Identifikasi & autentikasi |
| **Audit log (`AuditLog`)** | 5 tahun dari `created_at` | Kepatuhan UU PDP (storage limitation) |
| **Session token (`Session`)** | Sampai expired (default 30 hari) | Otomatis dari NextAuth |
| **Account OAuth (`Account`)** | Selama user aktif | Login Google |
| **Email pengajuan erasure** | 1 tahun setelah diproses | Audit internal |

### 3.2 Mahasiswa Dihapus dari Kelas

**Skenario:** admin hapus mahasiswa dari kelas via `/admin/kelas/[id]` → Tab Mahasiswa.

**Prosedur:**
1. Admin klik "Hapus" → konfirmasi
2. Sistem set `user.kelas_id = NULL`
3. **Data `PoinLog` TETAP ADA** (histori akademik tidak dihapus)
4. **User TETAP ADA** di database (akun tidak dihapus)
5. User tidak bisa akses `/dashboard` (empty state)

**Alasan:** menghapus poin akan merusak histori akademik & rekap semester lalu.

### 3.3 Setelah Semester Berganti

**Prosedur:**
1. Semester lama → `is_active = false`
2. Semester baru → `is_active = true`
3. Data semester lama **TIDAK dihapus** (arsip histori)
4. Rapor & leaderboard otomatis menampilkan semester baru
5. Semester lama bisa diakses via query manual (belum ada UI — future feature)

### 3.4 Penghapusan Akun (Right to Erasure)

Lihat **Bagian 4** untuk prosedur lengkap.

### 3.5 Audit Trail

- **Retensi:** 5 tahun sejak tanggal pencatatan (`created_at`).
- **Setelah 5 tahun:** event audit dihapus permanen (*hard delete*).
- **Metode:** manual oleh admin melalui SQL, atau cron job yang akan
  diimplementasikan kemudian.
- **Alasan:** kepatuhan UU PDP, khususnya *purpose limitation* dan *storage
  limitation*.

Retensi `AuditLog` berdiri sendiri dari retensi data akademik. `PoinLog` dan
data akademik semester lama tetap mengikuti kebijakan arsip akademik, sedangkan
event auditnya hanya disimpan selama lima tahun.

---

## 4. Permohonan Erasure (Penghapusan Data)

### 4.1 Dasar Hukum

UU PDP No. 27 Tahun 2022 Pasal 8 — hak subjek data untuk menghapus data pribadi.

### 4.2 Siapa yang Boleh Mengajukan

- Mahasiswa aktif UNTIDAR (email `@students.untidar.ac.id`)
- Mahasiswa lulus/keluar (dengan verifikasi identitas)

### 4.3 Prosedur Lengkap

#### Langkah 1 — Mahasiswa Mengirim Email

- **Kepada:** `yuwiaffa@gmail.com`
- **Subjek:** `[Karsa] Permohonan Penghapusan Data Pribadi`
- **Isi:**
  - Nama lengkap
  - NIM
  - Email UNTIDAR
  - Alasan permohonan (opsional)
  - Pernyataan: *"Saya mengajukan penghapusan data pribadi saya dari sistem Karsa sesuai UU PDP No. 27 Tahun 2022."*

#### Langkah 2 — Admin Memverifikasi Identitas

Cek:
- Email pengirim = `@students.untidar.ac.id`
- Nama + NIM match database

Jika tidak match → minta klarifikasi.

#### Langkah 3 — Admin Memproses Data melalui Supabase SQL Editor

**Penting:** kolom `PoinLog.mahasiswa_id`, `PoinLog.pj_id`, dan `KelasMatkul.pj_id` punya FK **`RESTRICT`** — artinya `DELETE User` akan **gagal** kalau masih ada referensi. Urutan berikut **wajib** diikuti.

```sql
-- ══════════════════════════════════════════════════════════════
-- STEP 3.1 — BACKUP DATA (wajib, ekspor ke CSV dulu)
-- ══════════════════════════════════════════════════════════════
SELECT * FROM "User"      WHERE id = '<user_id>';
SELECT * FROM "PoinLog"   WHERE mahasiswa_id = '<user_id>'
                             OR pj_id = '<user_id>';
SELECT * FROM "KelasMatkul" WHERE pj_id = '<user_id>';
SELECT * FROM "AuditLog" WHERE actor_id = '<user_id>';

-- ══════════════════════════════════════════════════════════════
-- STEP 3.2 — HANDLE KELASMATKUL (jika user pernah jadi PJ)
-- ══════════════════════════════════════════════════════════════
-- Opsi A: ganti PJ ke admin/user lain (lebih aman, histori utuh)
UPDATE "KelasMatkul"
SET pj_id = '<admin_user_id>'
WHERE pj_id = '<user_id>';

-- Opsi B: hapus KelasMatkul (hati-hati — ini akan cascade ke PoinLog)
-- DELETE FROM "KelasMatkul" WHERE pj_id = '<user_id>';

-- ══════════════════════════════════════════════════════════════
-- STEP 3.3 — HAPUS POINLOG USER
-- ══════════════════════════════════════════════════════════════
-- Wajib: FK RESTRICT, jadi harus dihapus dulu sebelum User
DELETE FROM "PoinLog" WHERE mahasiswa_id = '<user_id>';
DELETE FROM "PoinLog" WHERE pj_id = '<user_id>';

-- ══════════════════════════════════════════════════════════════
-- STEP 3.4 — HAPUS ACCOUNT & SESSION (CASCADE, tapi explicit)
-- ══════════════════════════════════════════════════════════════
DELETE FROM "Account" WHERE "userId" = '<user_id>';
DELETE FROM "Session" WHERE "userId" = '<user_id>';

-- ══════════════════════════════════════════════════════════════
-- STEP 3.5 — HAPUS USER
-- ══════════════════════════════════════════════════════════════
DELETE FROM "User" WHERE id = '<user_id>';

-- ══════════════════════════════════════════════════════════════
-- STEP 3.6 — ANONYMIZE AUDIT LOG (opsional, atau biarkan)
-- ══════════════════════════════════════════════════════════════
-- Anonimkan identitas aktor pada audit log.
UPDATE "AuditLog"
SET actor_id = 'DELETED_USER',
    actor_name = 'Pengguna dihapus'
WHERE actor_id = '<user_id>';
```

**Konsekuensi Opsi A (mengganti PJ):**
- Histori poin tetap utuh
- PJ pengganti menerima penugasan
- ⚠️ Rekomendasi: pakai Opsi A

**Konsekuensi jika `PoinLog` dihapus:**
- Rekap semester lalu kehilangan data user tersebut
- Leaderboard semester lalu berubah
- ⚠️ **Tidak dapat dipulihkan** kecuali restore backup

#### Langkah 4 — Admin Mengirim Konfirmasi kepada Mahasiswa

Admin kirim email konfirmasi:
> *"Permohonan penghapusan data Anda telah diproses pada [tanggal]. Data pribadi Anda (akun, session, login history) telah dihapus dari sistem Karsa."*

**Batas waktu:** 7 hari kerja sejak email diterima.

### 4.4 Apa yang TIDAK Dihapus

- **Audit log** — tetap tersimpan (kepentingan audit & sengketa). Aktor di-anonymize menjadi `DELETED_USER`.
- **Rekap Excel yang sudah diunduh** — tanggung jawab admin yang mengunduh.
- **Data di backup Supabase** — tetap ada sampai retensi backup berakhir (7 hari).

---

## 5. Backup & Recovery

### 5.1 Backup Otomatis

- **Supabase daily backup** — retensi 7 hari (free tier)
- **Akses:** Supabase Dashboard → Database → Backups

### 5.2 Backup Manual

**Frekuensi:** setiap akhir semester + sebelum perubahan besar.

**Prosedur:**
1. Buka Supabase SQL Editor
2. Ekspor tabel kunci:
   ```sql
   SELECT * FROM "User";
   SELECT * FROM "PoinLog";
   SELECT * FROM "AuditLog";
   ```
3. Copy hasil → simpan di Google Drive folder `Karsa Backup`
4. Nama file: `backup_<tabel>_<yyyyMMdd>.csv`
5. Simpan minimal 3 bulan terakhir

### 5.3 Recovery

Jika data corrupt atau hilang:
1. Cek Supabase daily backup (retensi 7 hari)
2. Jika backup tidak cukup → restore dari manual backup
3. Kontak Supabase support jika insiden server

### 5.4 Rencana Insiden

**Jika Karsa down:**
1. Cek [status Vercel](https://www.vercel-status.com).
2. Cek [status Supabase](https://status.supabase.com).
3. Jika Vercel mengalami gangguan, tunggu hingga layanan pulih.
4. Jika Supabase mengalami gangguan, tunggu hingga layanan pulih.
5. Jika kedua layanan normal tetapi Karsa masih bermasalah, periksa **Vercel Logs**.

**Kontak darurat:** Yusuf Wildan Affandi — `yuwiaffa@gmail.com`

---

## 6. Penanggung Jawab

| Proses | PIC | Backup |
|---|---|---|
| Input poin | PJ pengampu | Admin |
| Koreksi poin | PJ pengampu | Admin |
| Sengketa poin (eskalasi) | Dosen pengampu | Admin |
| Permohonan erasure | Admin (Yusuf) | — |
| Backup manual | Admin (Yusuf) | — |
| Review SOP | Admin + dosen | Per semester |
| Insiden & recovery | Admin (Yusuf) | — |

**Catatan:** saat ini admin = Yusuf Wildan Affandi (single admin). Rencana jangka panjang: tambah admin kedua (dosen/operator kampus) untuk separation of duties.

---

## 7. Review & Update

**Jadwal review:** setiap akhir semester.

**Trigger review tambahan:**
- Perubahan regulasi (UU PDP update)
- Insiden serius
- Permintaan dari kampus
- Perubahan arsitektur signifikan

**Log perubahan:**

| Tanggal | Versi | Perubahan | PIC |
|---|---|---|---|
| 19 Sep 2026 | 1.0 | Dokumen dibuat | Yusuf |
| 19 Sep 2026 | 1.1 | Memperbaiki inkonsistensi FK `RESTRICT` pada prosedur erasure, menghapus nested code fence, dan menambahkan disclaimer legal | Yusuf |
| 20 Sep 2026 | 1.2 | Memperbarui retensi AuditLog menjadi 5 tahun dan prosedur erasure audit trail sistemik | Yusuf |

---

## 8. Kontak

| Keperluan | Kontak |
|---|---|
| Koreksi poin | PJ pengampu (langsung) |
| Sengketa poin | `yuwiaffa@gmail.com` |
| Permohonan erasure | `yuwiaffa@gmail.com` |
| Insiden teknis | `yuwiaffa@gmail.com` |
| Pertanyaan umum | `yuwiaffa@gmail.com` |

**Waktu respons:** maksimal 1×24 jam untuk permohonan, 7 hari kerja untuk proses erasure.

> **Catatan:** alamat email admin masih personal (`yuwiaffa@gmail.com`). Setelah mendapat persetujuan kampus, akan dimigrasi ke email institusional (misal `karsa@untidar.ac.id`) agar lebih formal.

---

*Dokumen ini adalah SOP resmi Karsa dan berlaku sejak tanggal yang tercantum. Setiap pembaruan akan diumumkan kepada pihak terkait.*
