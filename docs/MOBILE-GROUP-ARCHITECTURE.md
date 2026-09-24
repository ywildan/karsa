# Karsa Mobile Group — Architecture Contract

> Status: approved design baseline, belum dimigrasikan ke database.
> Sumber kebenaran progres: `docs/MOBILE-GROUP-BUILD-PROGRESS.md`.

## 1. Prinsip Domain

`KelasMatkul` adalah grup. Tidak ada tabel room terpisah dan tidak ada proses
manual untuk membuat anggota. Jika kelas memiliki delapan `KelasMatkul`, API
otomatis mengembalikan delapan grup.

Membership ditentukan dari kelas terkini:

```text
boleh membaca/menulis grup
  = actor bukan admin
  AND actor.kelas_id tidak null
  AND actor.kelas_id = KelasMatkul.kelas_id

boleh mengelola grup
  = boleh membaca/menulis grup
  AND actor.id = KelasMatkul.pj_id
```

Semua PJ mata kuliah lain tetap dapat chat karena mereka juga mahasiswa dalam
kelas yang sama. Status PJ global tidak memberikan hak pengelola; kecocokan
`pj_id` selalu diperiksa terhadap grup yang sedang diakses.

## 2. Model Data

### Perubahan `KelasMatkul`

Tambahkan status lock langsung pada assignment:

- `group_locked_at DateTime?`
- `group_locked_by_id String?`
- relasi locker ke `User` dengan `onDelete: SetNull`

Tidak ditambahkan unique constraint pada `pj_id`. Kebijakan satu PJ memegang
satu mata kuliah tetap bersifat operasional.

### `GroupMessage`

| Field | Fungsi |
|---|---|
| `id` | CUID primary key |
| `kelas_matkul_id` | Grup sumber |
| `author_id` | Penulis |
| `reply_to_id` | Pesan yang dibalas, opsional |
| `body` | Teks pesan; nullable hanya setelah purge retensi |
| `idempotency_key` | Kunci unik yang sudah diprefix actor ID |
| `edited_at` | Penanda edit |
| `deleted_at` | Soft delete oleh penulis |
| `hidden_at` | Disembunyikan PJ grup |
| `hidden_by_id` | PJ yang menyembunyikan |
| `hidden_reason` | Alasan terstruktur/ringkas |
| `pinned_at` | Penanda pin |
| `pinned_by_id` | PJ yang melakukan pin |
| `created_at` | Urutan pesan |
| `updated_at` | Sinkronisasi edit/delete/moderasi |

Aturan database:

- FK `kelas_matkul_id` menggunakan `ON DELETE CASCADE`.
- FK author/reply memakai `ON DELETE RESTRICT`/`SET NULL` sesuai kebutuhan.
- `idempotency_key` unique.
- Index utama `(kelas_matkul_id, created_at DESC, id DESC)`.
- Index sinkronisasi `(kelas_matkul_id, updated_at DESC)`.
- Index author, reply, dan pin.
- CHECK body maksimum tidak menggantikan validasi API; API membatasi 2.000
  karakter Unicode setelah trim.
- Tidak ada hard delete melalui API mobile rutin.

### `GroupReport`

Laporan menunjuk satu pesan dan dibuat dari mobile:

- `id`, `message_id`, `reporter_id`
- `reason` dari allowlist
- `details` opsional, maksimum 500 karakter
- `status`: `OPEN`, `DISMISSED`, atau `ACTIONED`
- `resolved_at`, `resolved_by_id`
- `created_at`, `updated_at`
- unique `(message_id, reporter_id)` agar satu pengguna tidak menggandakan vote

PJ grup dapat menangani laporan selama pesan bukan pesan miliknya. Laporan
terhadap PJ tidak dapat diselesaikan oleh PJ tersebut. Tiga laporan unik yang
masih terbuka memicu auto-hide. Ambang ini adalah default pilot dan harus
dievaluasi dari pola penggunaan nyata, tanpa memberi PJ yang dilaporkan hak
untuk mengadili laporannya sendiri.

### `GroupBlock`

Preferensi pengguna untuk menyembunyikan pesan anggota tertentu:

- composite primary key `(blocker_id, blocked_id)`
- `created_at`
- CHECK konseptual: pengguna tidak boleh memblokir dirinya sendiri

Block hanya memengaruhi penyajian untuk blocker. Karena konteksnya akademik,
client menampilkan placeholder yang dapat dibuka manual agar informasi penting
tidak hilang diam-diam.

## 3. Kontrak API Mobile

Semua endpoint berada di `/api/mobile/v1/groups`, memakai bearer session native,
`Cache-Control: no-store`, envelope JSON yang sudah ada, dan error boundary aman.

### Daftar grup

`GET /groups`

- Memerlukan actor non-admin dengan `kelas_id`.
- Mengembalikan seluruh `KelasMatkul` kelas actor.
- Tiap item memuat mata kuliah, PJ utama, status `is_manager`, status lock,
  jumlah anggota, serta preview pesan terakhir yang tidak terhapus/tersembunyi.
- Tidak ada unread count pada MVP karena tidak ada read receipt.

### Membaca pesan

`GET /groups/{assignmentId}/messages?cursor={messageId}&limit=30`

- Memverifikasi membership sebelum query pesan.
- Default 30 dan maksimum 50 pesan.
- Urutan query terbaru ke lama; respons client disusun kronologis.
- Mengembalikan hingga 10 pesan aktif paling baru yang di-pin dalam field
  `pinned_messages`, agar strip pin tidak bergantung pada halaman cursor saat ini.
- Cursor hanya berlaku di grup yang sama.
- Pesan deleted/hidden dikirim sebagai tombstone tanpa body.
- Reply preview tidak membocorkan body deleted/hidden/blocked.

### Mengirim pesan

`POST /groups/{assignmentId}/messages`

- Memerlukan header `Idempotency-Key` 16–128 karakter.
- Body: `text` dan optional `reply_to_id`.
- Ditolak jika grup locked, kecuali actor adalah PJ utama grup.
- Reply harus menunjuk pesan dari grup yang sama.
- Rate limit aplikasi dan firewall diterapkan terpisah.

### Edit dan soft delete

- `PATCH /groups/{assignmentId}/messages/{messageId}`
- `DELETE /groups/{assignmentId}/messages/{messageId}`

Hanya author; edit maksimal 15 menit; pesan hidden/deleted tidak dapat diedit.
DELETE mengisi `deleted_at` dan `updated_at`, bukan menghapus row.

### Pin dan lock

- `POST /groups/{assignmentId}/messages/{messageId}/pin`
- `POST /groups/{assignmentId}/lock`

Keduanya memerlukan `actor.id = KelasMatkul.pj_id`. PJ mata kuliah lain menerima
403 walaupun `capabilities.record_points = true`.

Di native app, PJ membuka menu tindakan dengan menekan lama pesan. PJ dapat
menyematkan pesan anggota maupun pesannya sendiri; strip pesan tersemat tampil
di atas percakapan untuk semua anggota grup.

### Hide, report, block

- `POST /groups/{assignmentId}/messages/{messageId}/hide`
- `POST /groups/{assignmentId}/messages/{messageId}/reports`
- `PUT /groups/blocks/{userId}`
- `DELETE /groups/blocks/{userId}`

Hide hanya untuk PJ utama dan membutuhkan alasan. Report serta block tersedia
bagi seluruh anggota. Endpoint tidak pernah tersedia di namespace admin/web.

## 4. Response dan Error Contract

Kode error minimum:

| HTTP | Code | Makna |
|---:|---|---|
| 400 | `INVALID_INPUT` | Body/query/header tidak valid |
| 401 | `UNAUTHENTICATED` | Bearer session tidak valid |
| 403 | `GROUP_FORBIDDEN` | Actor bukan anggota kelas |
| 403 | `GROUP_MANAGER_REQUIRED` | Actor bukan PJ utama grup |
| 404 | `GROUP_NOT_FOUND` | Grup tidak ditemukan dalam scope actor |
| 404 | `MESSAGE_NOT_FOUND` | Pesan tidak ditemukan dalam scope grup |
| 409 | `GROUP_LOCKED` | Grup terkunci untuk anggota biasa |
| 409 | `EDIT_WINDOW_EXPIRED` | Batas edit 15 menit lewat |
| 422 | `MESSAGE_REJECTED` | Write gagal aturan domain |
| 429 | `RATE_LIMITED` | Batas request terlampaui |

Error tidak menyertakan query, stack, token, body pesan, atau detail database.

## 5. Grant dan RLS

Mobile tetap mengakses database melalui server/Prisma dan role
`karsa_runtime`; Data API tetap tidak diekspos.

Grant minimum yang direncanakan:

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `GroupMessage` | Ya | Ya | Ya | Tidak |
| `GroupReport` | Ya | Ya | Ya | Tidak |
| `GroupBlock` | Ya | Ya | Tidak | Ya |

RLS diaktifkan dan policy ditulis per operasi untuk `karsa_runtime`. Karena
runtime memakai satu database role bersama, membership user tetap ditegakkan di
service API menggunakan actor hasil bearer session; RLS mencegah role publik dan
role tanpa policy mengakses tabel, bukan menggantikan authorization per-user.

Role `anon` dan `authenticated` tidak menerima grant. Role `karsa_backup`
menerima SELECT agar backup tetap lengkap. Owner/admin database tetap merupakan
akses operasional dan bukan akses produk.

## 6. Retensi

- Pesan aktif: sampai semester berakhir + 90 hari.
- Body pesan soft-deleted: purge setelah 30 hari, row tombstone tetap minimal.
- Body yang menjadi bukti laporan: maksimal 90 hari setelah laporan selesai.
- Pesan yang masih memiliki laporan terbuka atau laporan yang selesai dalam 90
  hari terakhir dikecualikan dari seluruh penghapusan sampai masa bukti berakhir.
- Audit action tidak menyimpan body pesan.
- Purge dijalankan setiap hari pukul 03:17 WIB oleh Supabase Cron melalui
  `public.karsa_purge_group_retention()`.
- Hak EXECUTE fungsi dicabut dari public, role API, dan role backup. Job
  dijadwalkan oleh database owner dan tidak melewati backend/web aplikasi.

## 7. Test Matrix Wajib

1. Mahasiswa kelas A melihat seluruh grup kelas A dan tidak melihat kelas B.
2. PJ mata kuliah 1 dapat chat di seluruh grup kelas A.
3. PJ mata kuliah 1 hanya dapat pin/lock/hide di grup mata kuliah 1.
4. Admin tanpa kelas ditolak dari seluruh endpoint grup.
5. ID grup/pesan lintas kelas tidak dapat dipakai untuk membaca atau menulis.
6. Reply lintas grup ditolak.
7. Duplicate idempotency key tidak membuat pesan ganda.
8. Edit setelah 15 menit ditolak.
9. Locked room menolak anggota biasa tetapi menerima PJ utama.
10. Soft-deleted/hidden message tidak mengembalikan body.
11. PJ tidak dapat menyelesaikan laporan atas pesannya sendiri.
12. Token revoke/expired menghasilkan 401 dan tidak membocorkan data.

## 8. Keputusan yang Sengaja Ditunda

- Realtime/private channel dan JWT khusus Realtime.
- Push notification.
- Lampiran/media.
- E2EE atau application-layer encryption.
- Persetujuan/kebijakan institusional atas masa retensi final.
