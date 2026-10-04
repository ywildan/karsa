# Laporan Rekonsiliasi Dokumentasi vs Kode — Karsa `feat/mobile-groups`

> Tanggal: 25 September 2026
> Branch: `feat/mobile-groups`
> Cakupan audit: seluruh file di repository pada saat mulai sesi
> Batasan: **kode sumber tidak diubah sama sekali** — hanya dokumen `.md`
> yang dikoreksi atau ditambah

---

## 1. Ringkasan

Audit membandingkan klaim di `docs/*.md`, `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md`,
`prisma/*.sql`, `.github/workflows/*.yml`, `lib/**`, `app/api/mobile/v1/groups/**`
dan `karsa-mobile/lib/**`. Ditemukan 6 kontradiksi keras, 4 dokumen basi, dan 2
celah kontrak API yang tertulis di dokumentasi tetapi tidak tercermin di kode.

Setelah audit, tujuh file dokumen dikoreksi. Tidak ada file `.ts`, `.tsx`,
`.dart`, `.sql`, atau `.yml` yang disentuh. Ringkasan perubahan:

| # | File | Kategori | Jenis koreksi |
|---|------|----------|---------------|
| 1 | `docs/PRD-Karsa-v2.md` | Legacy | Neon→Supabase, xlsx→exceljs, enumerasi 17 model |
| 2 | `docs/erd.md` | Legacy | Tambah 6 entitas baru + relasi + index + constraint |
| 3 | `docs/architecture.md` | Legacy | Scope AuditLog diperluas + catatan 11 model tak digambar |
| 4 | `docs/MOBILE-GROUP-ARCHITECTURE.md` | Kontrak | GroupBlock jujur, endpoint pin/lock/report/resolve, 20 error codes |
| 5 | `docs/MOBILE-GROUP-BUILD-PROGRESS.md` | Progress | Test count 6→7, mute dihapus, catatan cakupan 17/26 |
| 6 | `docs/DATABASE-BACKUP-RESTORE.md` | Runbook | Catatan bahwa 17/26 adalah keadaan production, bukan hasil SQL repo |
| 7 | `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md` | Riset | Catatan pasca-implementasi + pemetaan forum→groups + mute descoped |
| 8 | `docs/SPEC-AUDIT-TRAIL.md` | Spec | Taksonomi §5 diselaraskan dengan action nyata yang di-emit kode |

---

## 2. Kontradiksi keras (dokumen mengklaim X, kode melakukan Y)

### 2.1 `prisma/init.sql` vs klaim "RLS diaktifkan + policy runtime dibuat untuk semua tabel aplikasi"

- **Klaim lama**: `docs/PRD-Karsa-v2.md` dan `docs/MOBILE-GROUP-BUILD-PROGRESS.md` menyiratkan seluruh tabel production dilindungi RLS + policy, dan assertion CI `17|17|26` dipandang sebagai hasil dari SQL repo.
- **Faktual**: `prisma/init.sql:249–252, 278` hanya mengaktifkan RLS pada **4** tabel (`GroupMessage`, `GroupReport`, `GroupBlock`, `AuditLog`). `prisma/init.sql` **tidak** memiliki satu baris `CREATE POLICY`. `prisma/mobile-native.sql` tidak memiliki RLS maupun policy. `prisma/mobile-groups.sql:291–293` mengaktifkan RLS pada 3 tabel grup dan mendefinisikan **9** policy runtime.
- **Rekonsiliasi**: `docs/DATABASE-BACKUP-RESTORE.md` kini memiliki subbagian "Cakupan" yang menyatakan eksplisit bahwa 17 RLS dan 26 policy adalah **keadaan production** hasil hardening manual via Supabase SQL Editor (lihat `docs/SECURITY-HARDENING-LOG.md` §Hasil Step 3). Membangun database baru dari file SQL repo saja tidak akan memenuhi assertion restore.
- **Kode tidak diubah** — file SQL tetap apa adanya. Rekomendasi tindak lanjut (di luar scope sesi ini): kodifikasi hardening manual menjadi `prisma/hardening-pregroups.sql` agar reproduksible.

### 2.2 `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md:60` menyebut endpoint `/api/mobile/v1/forum/*`

- **Faktual**: rute nyata berada di `app/api/mobile/v1/groups/**/route.ts` (10 file). Tidak ada folder `forum` sama sekali.
- **Rekonsiliasi**: `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md` kini memiliki catatan pembuka "Catatan pasca-implementasi" yang menerangkan bahwa "forum" pada dokumen riset berubah menjadi "Groups" di kode dan API nyata, dan memetakan istilah lain yang berubah (mute→block, retensi pin 40 hari, dsb.).

### 2.3 `MOBILE-GROUP-BUILD-PROGRESS.md:206` menyatakan "Enam test otomatis"

- **Faktual**: `tests/group-policy.test.ts` berisi **7** `test(`. Test ke-7 adalah boundary pin 40 hari (`isGroupMessagePinned` pada tepat 40×24 jam).
- **Rekonsiliasi**: teks diganti menjadi "Tujuh test otomatis …, dan batas masa aktif pin tepat pada 40 × 24 jam."

### 2.4 `MOBILE-GROUP-BUILD-PROGRESS.md:58` menyebut `mute/block` di Batas MVP

- **Faktual**: hanya `block` yang diimplementasikan (backend `PUT/DELETE /groups/blocks/:userId` + model `GroupBlock`). Tidak ada endpoint mute grup maupun mute pengguna. `GroupBlock` tidak menyimpan state "muted".
- **Rekonsiliasi**: baris MVP diganti menjadi "Soft delete, pin, lock, hide, block, dan report (mute grup/pengguna diturunkan dari MVP; hanya block yang diimplementasikan …)".

### 2.5 `MOBILE-GROUP-ARCHITECTURE.md` §2 mengklaim pesan dari pengguna terblokir memakai "placeholder yang dapat dibuka manual"

- **Faktual**: `karsa-mobile/lib/screens/group_chat_screen.dart:733` menampilkan bubble statis `'Pesan dari pengguna yang kamu blokir'` tanpa mekanisme buka manual. Tidak ada tombol unblock di UI Flutter — helper `setGroupBlock(userId, blocked)` di `lib/core/api_client.dart:266` menerima parameter `bool` tetapi hanya dipanggil dengan `true` pada `group_chat_screen.dart:382`.
- **Rekonsiliasi**: §2 diganti agar mendeskripsikan perilaku aktual secara jujur (placeholder statis, tidak ada unblock UI, tidak ada manual-open; backend `DELETE` tersedia tetapi belum dipakai). Niat desain "dapat dibuka manual" dipertahankan tetapi direlabel sebagai pekerjaan masa depan.

### 2.6 `MOBILE-GROUP-ARCHITECTURE.md` §3 endpoint pin/lock hanya menampilkan satu arah + §4 error contract tidak lengkap

- **Faktual**: `POST /groups/:id/messages/:messageId/pin` menerima body `{pinned: boolean}` (`group-service.ts:692`) dan `POST /groups/:id/lock` menerima `{locked: boolean}` (`:752`). Dua endpoint belum terdokumentasi sama sekali: `GET /groups/:id/reports` dan `POST /groups/:id/reports/:reportId/resolve`. §4 error contract asli hanya memuat 10 kode padahal `group-service.ts` + `lib/mobile/http.ts` meng-emit **20** kode berbeda.
- **Rekonsiliasi**: §3 ditulis ulang untuk mendokumentasikan pin/lock/hide bidirectional + auto-expiry 40 hari + GET reports list + POST resolve. §4 tabel error contract diperluas dari 10 baris menjadi 20 baris mencakup `IDEMPOTENCY_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `MESSAGE_FORBIDDEN`, `MESSAGE_UNAVAILABLE`, `SELF_REPORT_FORBIDDEN`, `SELF_MODERATION_FORBIDDEN`, `REPORT_NOT_FOUND`, `USER_NOT_FOUND`, `DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`.

---

## 3. Dokumen basi terhadap schema 17 model

### 3.1 `docs/PRD-Karsa-v2.md`

Empat koreksi:

- **:15** `seed ke Neon` → `seed ke Supabase`.
- **:126 / :128** stack `PostgreSQL (Neon serverless)` → `PostgreSQL (Supabase)`; library Excel `xlsx` → `exceljs` (mengikuti `package.json`).
- **:442** klaim "11 tabel" → enumerasi lengkap 17 model dengan rujukan file SQL migrasi (`prisma/init.sql`, `prisma/mobile-native.sql`, `prisma/mobile-groups.sql`, `prisma/mobile-groups-retention.sql`).
- **:513** acceptance P7 "Cek schema Neon sinkron" → "Cek schema Supabase sinkron".

### 3.2 `docs/erd.md`

Lima koreksi:

- Catatan cakupan di awal file yang menerangkan 7 entitas tambahan (VerificationToken, MobileAuthRequest, MobileSession, GroupMessage, GroupReport, GroupBlock, dan dua kolom lock pada `KelasMatkul`).
- Field table `KelasMatkul` diperluas dengan `group_locked_at` dan `group_locked_by_id` (mengikuti `prisma/schema.prisma:181–182`).
- Subseksi baru sebelum §3 dengan tabel kolom lengkap untuk 6 entitas baru.
- §3 Relationships diperluas dengan 14 baris FK tambahan mencakup relasi mobile + grup.
- §4 Indexes ditambah 16 baris baru; §5 Constraints ditambah 9 baris (CHECK tombstone, hidden_reason, reason enum, details length, status enum, `blocker_id <> blocked_id`, unique keys).

### 3.3 `docs/architecture.md`

Dua koreksi:

- **:333** scope `AuditLog` dipersempit dari "Event sistemik poin dan PJ" menjadi enumerasi keluarga action yang benar-benar di-emit kode: `KELAS_*`, `MATKUL_*`, `PRODI_*`, `SEMESTER_*`, `MAHASISWA_*`, `POIN_*`, `PJ_*`, `GROUP_*`.
- Catatan baru di bawah diagram §5 yang mendaftar 11 model tambahan tidak digambar (VerificationToken, MobileAuthRequest, MobileSession, GroupMessage, GroupReport, GroupBlock + empat lookup) dengan cross-reference ke `docs/erd.md`.

---

## 4. Taksonomi audit action (`docs/SPEC-AUDIT-TRAIL.md` §5)

Klaim §5 asli: 13 baris aksi, termasuk `MATKUL_ASSIGN` dan `SEMESTER_SET_ACTIVE`.

Fakta kode: `MATKUL_ASSIGN` tidak pernah muncul (hanya `PJ_ASSIGN`, `PJ_REPLACE`, `PJ_REMOVE`). Aksi nyata yang di-emit dan tidak ada di taksonomi asli:

- `MATKUL_CREATE`, `MATKUL_UPDATE`, `MATKUL_DELETE` (`actions/matkul.ts:63, 116, 173`)
- `PRODI_CREATE`, `PRODI_UPDATE`, `PRODI_DELETE` (`actions/prodi.ts:54, 107, 164`)
- `SEMESTER_CREATE`, `SEMESTER_UPDATE`, `SEMESTER_DELETE` (`actions/semester.ts:90, 151, 226`)
- 11 aksi `GROUP_*` (`lib/services/group-service.ts` — lihat daftar di bawah)

**Rekonsiliasi**: taksonomi §5 ditulis ulang menjadi 27 baris, plus catatan revisi
yang menyatakan `MATKUL_ASSIGN` tidak pernah diimplementasikan.

Aksi `GROUP_*` yang didokumentasikan (dengan lokasi kode):

| Action | Lokasi |
|---|---|
| `GROUP_MESSAGE_EDIT` | `lib/services/group-service.ts:555` |
| `GROUP_MESSAGE_DELETE` | `:626` |
| `GROUP_MESSAGE_PIN` / `GROUP_MESSAGE_UNPIN` | `:692` |
| `GROUP_MESSAGE_HIDE` / `GROUP_MESSAGE_UNHIDE` | `:842` |
| `GROUP_MESSAGE_REPORT` | `:927` |
| `GROUP_REPORT_ACTION` / `GROUP_REPORT_DISMISS` | `:1062` |
| `GROUP_LOCK` / `GROUP_UNLOCK` | `:752` |

---

## 5. Dokumen riset (`DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md`)

Dokumen ini adalah analisis pra-keputusan dan sebagian besar rekomendasi tetap
sah. Yang tidak lagi sesuai kode sudah di-annotasi lewat blok "Catatan
pasca-implementasi" di bagian pembuka:

- Istilah "forum" → "Groups".
- `mute` grup/pengguna **tidak** diimplementasikan; hanya `block`.
- Retensi final: edit 15 menit, soft-delete body 30 hari, hapus penuh
  semester+90 hari, auto-hide pada 3 laporan unik, pin kedaluwarsa 40×24 jam.
- Rotasi `pj_id` tidak menghasilkan event sistem khusus; hak kelola berubah
  pada request berikutnya.

---

## 6. Verifikasi independen terhadap setiap klaim

Setiap temuan di atas diverifikasi terhadap artefak nyata:

| Fakta | Artefak | Bukti |
|---|---|---|
| 7 tests pada group-policy | `tests/group-policy.test.ts` | `grep -c "^test(" = 7` |
| 9 CREATE POLICY grup | `prisma/mobile-groups.sql` | `grep -c = 9`, baris 322–396 |
| 4 RLS toggle di init.sql | `prisma/init.sql` | baris 249, 250, 251, 278 |
| 0 policy di init.sql | `prisma/init.sql` | `grep -c CREATE POLICY = 0` |
| 0 RLS/mobile policy di mobile-native.sql | `prisma/mobile-native.sql` | `grep` tidak menemukan |
| Assertion CI `17|17|26` | `.github/workflows/database-restore-test.yml:173` | teks assertion |
| Polling 12 detik | `group_chat_screen.dart:41–44` | `Timer.periodic(const Duration(seconds: 12))` |
| Envelope + `Cache-Control: no-store` | `lib/mobile/http.ts` | `no-store` header, `withMobileApiErrors` boundary |
| Bearer regex + TTLs | `lib/mobile/auth.ts` | `/^Bearer\s+([A-Za-z0-9_-]{32,})$/i`, 15 min access, 30 d refresh |
| Idempotency key actor-prefixed | `lib/services/group-service.ts` | `${actor.id}:${idempotencyKey}` |
| Message max 2000, page 30/50, rate 12/min | `lib/services/group-service.ts:19–22` | konstanta |
| Pin query filter 40 hari | `group-service.ts` | `pinned_at: { gt: Date.now() - GROUP_PIN_WINDOW_MS }` |
| Report reason enum 5 nilai | `group-service.ts` + `group_chat_screen.dart:308–313` | sinkron FE↔BE |
| Retention cron `17 20 * * *` UTC = 03:17 WIB | `prisma/mobile-groups-retention.sql` | schedule pg_cron |
| Backup cron `0 18 * * *` UTC = 01:00 WIB | `.github/workflows/database-backup.yml` | `schedule.cron` |
| Signed APK gated to `refs/heads/main` | `.github/workflows/karsa-mobile-build.yml` | `if:` condition + 4 secrets |
| 10 endpoint grup dengan method yang benar | `app/api/mobile/v1/groups/**/route.ts` | daftar file + verifikasi per-file |
| `GroupBlock` tidak punya flag "muted" | `prisma/schema.prisma:343` | model hanya berisi `blocker_id`/`blocked_id` |

---

## 7. Yang **tidak** diubah dalam sesi ini

Sesuai instruksi eksplisit "JANGAN MENGUBAH CODE APAPUN YANG SUDAH ADA":

- Seluruh file `.ts` di `lib/`, `app/`, `actions/`, `components/`, `tests/`.
- Seluruh file `.dart` di `karsa-mobile/lib/`.
- Seluruh file `.sql` di `prisma/`, `db/`, `scripts/`.
- Seluruh `.yml` di `.github/workflows/`.
- `package.json`, `pubspec.yaml`, `tsconfig.json`, `next.config.*`, `tailwind.*`.
- Konfigurasi environment (`.env`, `.env.example`, Vercel, Supabase).

Dua celah antara kode dan dokumentasi **disengaja tidak ditambal lewat kode**,
melainkan diakui apa adanya lewat catatan dokumen, karena menambalnya akan
memerlukan perubahan kode:

1. Placeholder pesan terblokir tidak dapat dibuka manual dan tidak ada UI
   unblock → dicatat di `MOBILE-GROUP-ARCHITECTURE.md` §2 dan di header
   `DEEP_RESEARCH_MOBILE_GROUP_PRIVACY.md`.
2. Hardening pre-group (17 RLS + 17 policy di luar repo) tidak ada sebagai file
   SQL idempotent → dicatat di `DATABASE-BACKUP-RESTORE.md` §Cakupan dan
   `MOBILE-GROUP-BUILD-PROGRESS.md` §Catatan cakupan grant/RLS/policy.

---

## 8. Rekomendasi tindak lanjut (di luar scope sesi dokumentasi ini)

Hanya sebagai catatan, **tidak** dikerjakan pada sesi ini karena menyentuh kode:

- **R1** Kodifikasi hardening pre-group (13 RLS toggle + 17 policy) menjadi
  `prisma/hardening-pregroups.sql` idempotent agar `17|17|26` dapat direproduksi
  dari SQL repo, bukan hanya dari restore backup.
- **R2** Tambahkan jalur unblock UI Flutter yang memanggil
  `setGroupBlock(userId, false)` (helper sudah menerima `bool` — hanya
  pemanggilan sisi UI belum ada).
- **R3** Putuskan apakah placeholder pesan terblokir memang harus dapat
  dibuka manual. Jika ya, implementasikan; jika tidak, hapus klaim tersebut
  dari arsitektur (kini sudah dilabeli "niat desain, belum diimplementasikan").
- **R4** Hapus `MATKUL_ASSIGN` dari rencana spec atau implementasikan sebagai
  action nyata; saat ini dokumen sudah diberi catatan bahwa ia tidak pernah
  di-emit.
- **R5** Deploy fungsi `karsa_purge_group_retention()` yang terbaru (versi 40
  hari pin) ke Supabase production — sesuai catatan
  `MOBILE-GROUP-BUILD-PROGRESS.md` §"Masa aktif pin 40 hari".
- **R6** Sinkronkan kembali `prisma/schema.prisma`, `prisma/init.sql`, dan
  `docs/erd.md` pada setiap penambahan kolom/model baru (contoh drift terbaru:
  dua kolom lock `KelasMatkul`).

---

## 9. Cara membaca laporan ini

- Bagian 2 = temuan yang membuat dokumen menyesatkan tentang perilaku sistem.
- Bagian 3 = temuan yang membuat dokumen basi terhadap schema yang sudah ada.
- Bagian 4 = temuan pada taksonomi audit action.
- Bagian 5 = temuan pada dokumen riset pra-keputusan.
- Bagian 6 = bukti file:line yang digunakan untuk memverifikasi setiap klaim
  (agar pembaca dapat mereproduksi audit tanpa mengulang kerja).
- Bagian 7 = konfirmasi bahwa tidak ada kode yang disentuh.
- Bagian 8 = pekerjaan lanjutan yang **butuh izin terpisah** karena mengubah
  kode, SQL, atau deployment.
