# Spesifikasi Perluasan Audit Trail

Dokumen teknis untuk memperluas audit trail Karsa dari pencatatan aktivitas poin menjadi event log sistemik.

| Informasi | Nilai |
| --- | --- |
| **Status** | Draft untuk ditinjau |
| **Target fase** | 6A (diperluas) |
| **Versi** | 1.0 |
| **Lokasi dokumen** | `docs/SPEC-AUDIT-TRAIL.md` |

---

## 1. Latar Belakang

Saat ini sistem hanya mencatat audit atas aktivitas **poin** (input dan penghapusan) melalui tabel `PoinAuditLog`. Admin belum bisa melihat aktivitas lain seperti penunjukan PJ, penambahan mahasiswa, atau perubahan data master.

**Tujuan pengembangan:** memperluas audit menjadi **event log sistemik** untuk semua aksi CRUD penting, dengan filter berlapis agar admin dapat menelusuri aktivitas berdasarkan kelas maupun tipe aksi.

**Manfaat:**

- Transparansi penuh untuk semua aktivitas admin
- Investigasi cepat jika ada sengketa (misal: "kok PJ saya diganti?")
- Kepatuhan UU PDP (jejak audit yang lengkap)
- Fondasi untuk fitur reporting admin ke depan

---

## 2. Ruang Lingkup

### 2.1 Termasuk dalam Ruang Lingkup

- Perluasan tabel audit jadi generic event log
- Perluasan event yang di-audit (poin, PJ, mahasiswa, kelas, matkul, semester)
- Filter berlapis di UI admin (kelas + tipe aksi + aktor + search)
- Retensi 5 tahun (kebijakan tertulis, implementasi delete nanti)

### 2.2 Tidak Termasuk untuk Saat Ini

- Audit login/logout
- Backfill data audit lama (mulai clean dari nol)
- Auto-delete cron job (dokumentasi dulu, implement nanti)
- Akses untuk PJ/mahasiswa (admin-only)
- Export audit ke Excel/CSV

---

## 3. Keputusan yang Sudah Dikunci

| # | Topik | Keputusan |
| --- | --- | --- |
| 1 | Nama tabel | `AuditLog` (rename dari `PoinAuditLog`, extend field) |
| 2 | Backfill data lama | **Tidak** — mulai clean, truncate data lama |
| 3 | Log LOGIN/LOGOUT | **Tidak** dulu |
| 4 | Retensi | **5 tahun** (dihitung dari `created_at`) |
| 5 | Hard delete setelah 5 tahun | **Ya** (dokumentasi, implement nanti) |
| 6 | Trigger deletion | **Manual/nanti** — dokumentasi dulu |
| 7 | Akses UI | **Admin only** |

---

## 4. Skema Database

### 4.1 Model Prisma

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  
  // Siapa yang melakukan
  actor_id     String
  actor_name   String   // snapshot nama saat aksi
  actor_role   String   // "ADMIN" | "PJ"
  
  // Apa yang dilakukan
  action       String   // lihat §5 Taksonomi Event
  entity_type  String   // "PoinLog" | "KelasMatkul" | "User" | ...
  entity_id    String   // id entity yang terdampak
  entity_label String?  // human-readable: "Budi Santoso", "Algoritma"
  
  // Konteks (denormalized untuk filter cepat)
  kelas_id     String?
  kelas_label  String?  // snapshot "AK-01"
  matkul_id    String?
  matkul_label String?  // snapshot "Algoritma"
  
  // Perubahan
  before       Json?    // snapshot sebelum aksi
  after        Json?    // snapshot setelah aksi
  metadata     Json?    // info tambahan per action
  
  created_at   DateTime @default(now())
  
  @@index([kelas_id, created_at(sort: Desc)])
  @@index([action, created_at(sort: Desc)])
  @@index([actor_id, created_at(sort: Desc)])
  @@index([created_at(sort: Desc)])
}
```

**Catatan:**

- Tidak ada FK ke `User` — karena kalau user dihapus, audit harus tetap ada
- `actor_id` = string biasa (bukan FK), tapi disimpan sebagai referensi
- `actor_name` / `kelas_label` / `matkul_label` = **snapshot** — freeze saat event terjadi

### 4.2 Migrasi

**Karena tidak backfill:**

```sql
-- 1. Drop tabel lama (tidak ada data berharga)
DROP TABLE IF EXISTS "PoinAuditLog";

-- 2. Buat tabel baru sesuai schema di atas
CREATE TABLE "AuditLog" (
  "id"           TEXT NOT NULL,
  "actor_id"     TEXT NOT NULL,
  "actor_name"   TEXT NOT NULL,
  "actor_role"   TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "entity_type"  TEXT NOT NULL,
  "entity_id"    TEXT NOT NULL,
  "entity_label" TEXT,
  "kelas_id"     TEXT,
  "kelas_label"  TEXT,
  "matkul_id"    TEXT,
  "matkul_label" TEXT,
  "before"       JSONB,
  "after"        JSONB,
  "metadata"     JSONB,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- 3. Index
CREATE INDEX "AuditLog_kelas_id_created_at_idx" ON "AuditLog" ("kelas_id", "created_at" DESC);
CREATE INDEX "AuditLog_action_created_at_idx" ON "AuditLog" ("action", "created_at" DESC);
CREATE INDEX "AuditLog_actor_id_created_at_idx" ON "AuditLog" ("actor_id", "created_at" DESC);
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog" ("created_at" DESC);
```

---

## 5. Taksonomi Event

### Kategori & Tipe Aksi

| Kategori | Action Code | Entity Type | Kapan Dipicu |
|---|---|---|---|
| **Poin** | `POIN_INPUT` | PoinLog | PJ/admin input poin |
| | `POIN_DELETE` | PoinLog | PJ/admin hapus poin |
| **PJ** | `PJ_ASSIGN` | KelasMatkul | Admin assign PJ ke matkul |
| | `PJ_REPLACE` | KelasMatkul | Admin ganti PJ |
| | `PJ_REMOVE` | KelasMatkul | Admin hapus penugasan |
| **Mahasiswa** | `MAHASISWA_ADD` | User | Admin tambah mahasiswa ke kelas |
| | `MAHASISWA_REMOVE` | User | Admin keluarkan dari kelas |
| **Kelas** | `KELAS_CREATE` | Kelas | Admin buat kelas |
| | `KELAS_UPDATE` | Kelas | Admin edit kelas |
| | `KELAS_DELETE` | Kelas | Admin hapus kelas |
| **Matkul** | `MATKUL_ASSIGN` | KelasMatkul | Assign matkul ke kelas |
| **Semester** | `SEMESTER_SET_ACTIVE` | Semester | Admin set semester aktif |

### Detail Per Action

| Action | `before` | `after` | `metadata` |
|---|---|---|---|
| `POIN_INPUT` | null | `{ poin, kategori, catatan }` | `{ mahasiswa_nim }` |
| `POIN_DELETE` | `{ poin, kategori, catatan }` | null | `{ alasan }` |
| `PJ_ASSIGN` | null | `{ pj_id, pj_name }` | `{ matkul_nama }` |
| `PJ_REPLACE` | `{ pj_id, pj_name }` | `{ pj_id, pj_name }` | `{ matkul_nama }` |
| `PJ_REMOVE` | `{ pj_id, pj_name }` | null | `{ matkul_nama }` |
| `MAHASISWA_ADD` | null | `{ name, nim }` | null |
| `MAHASISWA_REMOVE` | `{ name, nim, kelas_id }` | `{ kelas_id: null }` | null |
| `KELAS_CREATE` | null | `{ name, prodi, semester }` | null |
| `KELAS_UPDATE` | `{ name }` | `{ name }` | `{ changed_fields }` |
| `KELAS_DELETE` | `{ name }` | null | `{ reason }` |
| `SEMESTER_SET_ACTIVE` | `{ prev_active }` | `{ new_active }` | null |

---

## 6. Helper Audit Logging

Buat `lib/audit.ts`:

```ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  actor: { id: string; name: string; is_admin: boolean };
  action: string;
  entity: { type: string; id: string; label?: string };
  context?: {
    kelas_id?: string;
    kelas_label?: string;
    matkul_id?: string;
    matkul_label?: string;
  };
  before?: Prisma.JsonValue;
  after?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
};

export async function logAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      actor_role: input.actor.is_admin ? "ADMIN" : "PJ",
      action: input.action,
      entity_type: input.entity.type,
      entity_id: input.entity.id,
      entity_label: input.entity.label,
      kelas_id: input.context?.kelas_id,
      kelas_label: input.context?.kelas_label,
      matkul_id: input.context?.matkul_id,
      matkul_label: input.context?.matkul_label,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
    },
  });
}
```

**Contoh penggunaan di Server Action:**

```ts
// Setelah operasi Prisma sukses
await logAudit({
  actor: { id: user.id, name: user.name, is_admin: user.is_admin },
  action: "POIN_INPUT",
  entity: { type: "PoinLog", id: newLog.id, label: mahasiswa.name },
  context: { kelas_id, kelas_label, matkul_id, matkul_label },
  after: { poin, kategori, catatan },
});
```

---

## 7. Query dan Filter

### Server Action Baru: `getAuditLog(filters)`

```ts
type AuditFilters = {
  kelas_id?: string;
  action?: string;         // "POIN_INPUT" | "PJ_ASSIGN" | ...
  action_category?: string; // "POIN" | "PJ" | "MAHASISWA" | ...
  actor_id?: string;
  search?: string;         // cari entity_label / actor_name
  date_from?: Date;
  date_to?: Date;
  limit?: number;          // default 100, max 500
  offset?: number;
};

async function getAuditLog(filters: AuditFilters): Promise<AuditLog[]>;
```

**Query pattern:**
```ts
prisma.auditLog.findMany({
  where: {
    AND: [
      filters.kelas_id && { kelas_id: filters.kelas_id },
      filters.action && { action: filters.action },
      filters.actor_id && { actor_id: filters.actor_id },
      filters.search && {
        OR: [
          { entity_label: { contains: filters.search, mode: "insensitive" } },
          { actor_name: { contains: filters.search, mode: "insensitive" } },
        ],
      },
      filters.date_from && { created_at: { gte: filters.date_from } },
      filters.date_to && { created_at: { lte: filters.date_to } },
    ].filter(Boolean),
  },
  orderBy: { created_at: "desc" },
  take: filters.limit ?? 100,
  skip: filters.offset ?? 0,
});
```

### Server Action Pendukung

```ts
async function getAuditKelasOptions(): Promise<{ id, label }[]>;
async function getAuditActorOptions(): Promise<{ id, name }[]>;
```

Untuk dropdown filter.

---

## 8. Spesifikasi UI

### Layout Halaman `/admin/audit`

```
┌─────────────────────────────────────────────────────┐
│ Riwayat Perubahan                                    │
│ Jejak lengkap semua aksi administratif di Karsa.    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Filter:                                             │
│  [Kelas: ▼ Semua] [Tipe Aksi: ▼ Semua]              │
│  [Aktor: ▼ Semua] [🔍 Cari nama/matkul...]          │
│                                                      │
│  [Clear filter]                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│  47 events ditemukan                                 │
│                                                      │
│  [Card event 1]                                      │
│  [Card event 2]                                      │
│  [Card event 3]                                      │
│  ...                                                 │
│                                                      │
│  [Load more]                                         │
└─────────────────────────────────────────────────────┘
```

### Desain Card

```
┌─────────────────────────────────────────────────────┐
│ [BADGE]  Judul Event                                │
│          19 Sep 2026, 17:47 WIB · oleh Yusuf        │
│                                                      │
│  Detail singkat 2-3 baris                           │
│  Konteks: AK-01 · Algoritma                         │
└─────────────────────────────────────────────────────┘
```

### Warna Badge per Kategori

| Kategori | Warna |
| --- | --- |
| POIN | Orange (primary) |
| PJ | Blue |
| MAHASISWA | Green |
| KELAS | Purple |
| MATKUL | Cyan |
| SEMESTER | Amber |

### Perilaku Filter

- **Kelas** → dropdown: "Semua Kelas" + list kelas aktif
- **Tipe Aksi** → dropdown dengan grup:
  - Semua
  - Poin → Input, Hapus
  - PJ → Assign, Ganti, Hapus
  - Mahasiswa → Tambah, Keluar
  - Kelas → Buat, Edit, Hapus
- **Aktor** → dropdown: "Semua Admin" + list admin
- **Search** → filter `entity_label` + `actor_name`
- Filter **AND** — semua filter yang aktif digabung

### Loading dan Empty State

- **Loading awal** → skeleton (3-5 card placeholder)
- **Empty karena belum ada event** → "Belum ada aktivitas tercatat."
- **Empty karena filter** → "Tidak ada event dengan filter ini. Coba reset."

---

## 9. Retensi dan Lifecycle

### Kebijakan

- **Retensi:** 5 tahun dari `created_at`
- **Hard delete:** setelah 5 tahun, data dihapus permanen
- **Trigger:** manual (admin) — implementasi otomatis nanti

### Dokumentasi

Tulis di `docs/SOP-KOREKSI-DAN-RETENSI.md`:

```markdown
### Audit Trail

- Retensi: 5 tahun sejak tanggal pencatatan
- Setelah 5 tahun: data dihapus permanen (hard delete)
- Metode: manual oleh admin via SQL, atau cron job (akan diimplementasikan)
- Alasan: kepatuhan UU PDP (purpose limitation, storage limitation)
```

### Halaman Privasi

Update klaim di `karsa-landing.vercel.app/privacy`:

```
Audit Trail: Setiap aksi administratif dicatat dengan 
timestamp WIB, identitas aktor, dan detail perubahan. 
Data audit disimpan selama 5 tahun, setelah itu dihapus.
```

---

## 10. File yang Terdampak

### File Baru

- `lib/audit.ts` — helper logging
- `actions/audit.ts` — query + filter
- `components/admin/audit-log-view.tsx` — UI
- `docs/SPEC-AUDIT-TRAIL.md` — dokumen ini

### File yang Diubah — Tahap 1

- `prisma/schema.prisma` — rename model, extend field
- `prisma/init.sql` — update schema DDL (untuk dokumentasi)
- `app/(desktop)/admin/audit/page.tsx` — rewrite UI
- `actions/poin.ts` — add `logAudit()` calls
- `actions/kelas-matkul.ts` — add `logAudit()` calls

### File yang Diubah — Tahap 2

- `actions/mahasiswa.ts` — add `logAudit()`
- `actions/kelas.ts` — add `logAudit()`
- `actions/matkul.ts` — add `logAudit()` (jika ada assign matkul)
- `actions/semester.ts` — add `logAudit()`
- `docs/SOP-KOREKSI-DAN-RETENSI.md` — update retensi section

---

## 11. Kriteria Penerimaan

### Tahap 1 (Fase 6A-1)
- [ ] Tabel `AuditLog` ada di schema + Supabase
- [ ] Data lama `PoinAuditLog` terhapus (truncate)
- [ ] Setiap `POIN_INPUT` tercatat di `AuditLog`
- [ ] Setiap `POIN_DELETE` tercatat di `AuditLog`
- [ ] Setiap `PJ_ASSIGN`, `PJ_REPLACE`, `PJ_REMOVE` tercatat di `AuditLog`
- [ ] Halaman `/admin/audit` render 100 event terbaru
- [ ] Filter kelas berfungsi (AND dengan filter lain)
- [ ] Filter tipe aksi berfungsi (dropdown nested)
- [ ] Filter aktor berfungsi
- [ ] Search filter berfungsi
- [ ] Kombinasi filter AND berfungsi (kelas + tipe = filter kedua)
- [ ] Snapshot label freeze (kelas di-rename → audit lama tetap label lama)
- [ ] Admin-only guard di server
- [ ] `tsc` + `lint` + `build` bersih

### Tahap 2 (Fase 6A-2)
- [ ] Semua event taxonomy di §5 terimplementasi
- [ ] Test E2E semua tipe aksi
- [ ] Update SOP + privacy page
- [ ] `tsc` + `lint` + `build` bersih

---

## 12. Rencana Pengujian

### Pengujian Manual — Tahap 1

**Setup:** admin login, siapkan kelas AK-01 + mahasiswa + 2 matkul.

```
Test 1 — POIN_INPUT
  1. Login PJ → input poin untuk 1 mahasiswa
  2. Login admin → buka /admin/audit
  3. Cek: event POIN_INPUT muncul
  4. Verify: kelas_label = "AK-01", matkul_label = "..."
  
Test 2 — POIN_DELETE
  1. Login PJ → hapus poin yang baru diinput
  2. Login admin → buka /admin/audit
  3. Cek: event POIN_DELETE muncul dengan referensi

Test 3 — PJ_ASSIGN
  1. Login admin → /admin/kelas/AK-01 → assign PJ
  2. Buka /admin/audit
  3. Cek: event PJ_ASSIGN muncul

Test 4 — Filter Kelas
  1. Di /admin/audit, pilih kelas = AK-01
  2. Verify: hanya event AK-01 muncul

Test 5 — Filter Kelas + Tipe
  1. Filter kelas = AK-01
  2. Filter tipe = POIN_INPUT
  3. Verify: hanya POIN_INPUT AK-01 muncul

Test 6 — Snapshot Freeze
  1. Ada event POIN_INPUT dengan kelas_label = "AK-01"
  2. Rename kelas jadi "AK-01-NEW"
  3. Cek /admin/audit → event lama masih "AK-01" (snapshot)
  4. Event baru → "AK-01-NEW"
```

### Pengujian Otorisasi

```
Test 7 — Non-admin block
  1. Login sebagai PJ (non-admin)
  2. Akses /admin/audit via URL
  3. Harus redirect /dashboard
  
Test 8 — Server-level guard
  1. Coba panggil getAuditLog() via devtools
  2. Harus ditolak
```

---

## 13. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Tabel audit tumbuh cepat | Index tepat + retensi 5 tahun |
| Rename tabel → ada reference lama di code | Grep semua `PoinAuditLog` → replace |
| Snapshot label boros storage | Acceptable — ~200 bytes/row × 300K rows = 60 MB |
| Hard delete = kehilangan histori | Policy tertulis + konfirmasi manual |
| Filter kombinasi lambat | Index + limit 500 max |

---

## 14. Estimasi Pengerjaan

| Tahap | Effort | Sesi Codex |
| --- | --- | --- |
| Tahap 1 (Poin + PJ) | 5-6 jam | 2 sesi |
| Tahap 2 (Event lain) | 3-4 jam | 1-2 sesi |
| **Total** | **~9 jam** | **3-4 sesi** |

---

## 15. Rencana Pengembangan Berikutnya

- Audit log export ke CSV/Excel
- Audit untuk login/logout
- Auto-delete via Vercel Cron
- Akses audit untuk PJ (view own activity)
- Alerting jika ada aksi sensitif (misal hapus kelas)
- Retention policy per entity type (sekarang semua 5 tahun)

---

## 16. Hal yang Perlu Diputuskan

Sebelum implementasi dimulai, pastikan tiga hal berikut sudah disepakati:

1. **Cakupan event** — apakah perubahan nama, NIM, dan data mahasiswa lainnya juga perlu dicatat?
2. **Field `metadata`** — apakah satu field JSONB generik sudah cukup atau perlu field yang lebih spesifik untuk setiap kategori event?
3. **Batas query** — apakah maksimal 500 event per permintaan sudah mencukupi?

---

*Dokumen ini menjadi acuan resmi untuk perluasan audit trail Karsa setelah seluruh keputusan terbuka disetujui.*
