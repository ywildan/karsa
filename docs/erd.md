# Karsa — Entity Relationship Diagram

**Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**

> **Cakupan diagram §1:** hanya entity akademik inti. Entity tambahan —
> `VerificationToken`, `MobileAuthRequest`, `MobileSession`, `AuditLog`,
> dan tiga entity grup chat (`GroupMessage`, `GroupReport`, `GroupBlock`) —
> tidak digambar tetapi dirinci pada §2 sampai §5 sesuai `prisma/schema.prisma`
> dan `prisma/mobile-groups.sql`.

---

## 1. Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                        ERD                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│            User                 │       │           Account               │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id            TEXT PK           │◄──────│ id            TEXT PK           │
│ name          TEXT NULL         │   1:N │ userId        TEXT FK           │
│ nim           TEXT UNIQUE NULL  │       │ type          TEXT              │
│ email         TEXT UNIQUE       │       │ provider      TEXT              │
│ emailVerified TIMESTAMP NULL    │       │ providerAcctId TEXT UNIQUE      │
│ image         TEXT NULL         │       │ refresh_token TEXT NULL         │
│ is_admin      BOOLEAN DEFAULT F │       │ access_token  TEXT NULL         │
│ kelas_id      TEXT FK NULL      │       │ expires_at    INTEGER NULL      │
│ created_at    TIMESTAMP         │       │ token_type    TEXT NULL         │
│ updated_at    TIMESTAMP         │       │ scope         TEXT NULL         │
└──────────┬──────────────────────┘       │ id_token      TEXT NULL         │
           │                               │ session_state TEXT NULL         │
           │ 1:N                           └─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│            Kelas                │
├─────────────────────────────────┤
│ id            TEXT PK           │
│ name          TEXT              │
│ prodi_id      TEXT FK           │
│ semester_id   TEXT FK           │
│ created_at    TIMESTAMP         │
│ updated_at    TIMESTAMP         │
└──────────┬──────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────┐
│          KelasMatkul            │
├─────────────────────────────────┤
│ id            TEXT PK           │
│ kelas_id      TEXT FK           │
│ matkul_id     TEXT FK           │
│ pj_id         TEXT FK           │
│ created_at    TIMESTAMP         │
│ updated_at    TIMESTAMP         │
└──────────┬──────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────┐
│           PoinLog               │
├─────────────────────────────────┤
│ id            TEXT PK           │
│ kelas_matkul_id TEXT FK         │
│ mahasiswa_id  TEXT FK           │
│ pj_id         TEXT FK           │
│ kategori_id   TEXT FK           │
│ poin          INTEGER (1-4)     │
│ catatan       TEXT NULL         │
│ created_at    TIMESTAMP         │
└─────────────────────────────────┘

┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│            Prodi                │       │           Matkul                │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id            TEXT PK           │       │ id            TEXT PK           │
│ name          TEXT UNIQUE       │       │ name          TEXT              │
│ created_at    TIMESTAMP         │       │ code          TEXT UNIQUE NULL  │
│ updated_at    TIMESTAMP         │       │ created_at    TIMESTAMP         │
└─────────────────────────────────┘       │ updated_at    TIMESTAMP         │
                                         └─────────────────────────────────┘

┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│           Semester              │       │         KategoriPoin            │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id            TEXT PK           │       │ id            TEXT PK           │
│ name          TEXT UNIQUE       │       │ name          TEXT UNIQUE       │
│ start_date    TIMESTAMP         │       │ created_at    TIMESTAMP         │
│ end_date      TIMESTAMP         │       │ updated_at    TIMESTAMP         │
│ is_active     BOOLEAN DEFAULT F │       └─────────────────────────────────┘
│ created_at    TIMESTAMP         │
│ updated_at    TIMESTAMP         │       ┌─────────────────────────────────┐
└─────────────────────────────────┘       │           Session               │
                                         ├─────────────────────────────────┤
                                         │ id            TEXT PK           │
                                         │ sessionToken  TEXT UNIQUE       │
                                         │ userId        TEXT FK           │
                                         │ expires       TIMESTAMP         │
                                         └─────────────────────────────────┘
```

---

## 2. Entity Descriptions

### User
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | User ID (cuid) |
| name | TEXT | NULLABLE | Display name |
| nim | TEXT | UNIQUE, NULLABLE | Student ID number |
| email | TEXT | UNIQUE, NOT NULL | UNTIDAR email |
| emailVerified | TIMESTAMP | NULLABLE | Email verification date |
| image | TEXT | NULLABLE | Profile picture URL |
| is_admin | BOOLEAN | DEFAULT false | Admin flag |
| kelas_id | TEXT | FK → Kelas, NULLABLE | Class membership |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### Account (NextAuth)
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Account ID |
| userId | TEXT | FK → User | Linked user |
| type | TEXT | NOT NULL | Account type |
| provider | TEXT | NOT NULL | OAuth provider |
| providerAccountId | TEXT | UNIQUE | Provider's user ID |
| refresh_token | TEXT | NULLABLE | Refresh token |
| access_token | TEXT | NULLABLE | Access token |
| expires_at | INTEGER | NULLABLE | Token expiry |
| token_type | TEXT | NULLABLE | Token type |
| scope | TEXT | NULLABLE | OAuth scope |
| id_token | TEXT | NULLABLE | ID token |
| session_state | TEXT | NULLABLE | Session state |

### Kelas
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Class ID |
| name | TEXT | NOT NULL | Class name (e.g., "TI-01") |
| prodi_id | TEXT | FK → Prodi | Study program |
| semester_id | TEXT | FK → Semester | Semester |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### KelasMatkul
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Assignment ID |
| kelas_id | TEXT | FK → Kelas | Class |
| matkul_id | TEXT | FK → Matkul | Course |
| pj_id | TEXT | FK → User | Person in charge |
| group_locked_at | TIMESTAMP | NULLABLE | Lock aktif grup percakapan (mobile-only) |
| group_locked_by_id | TEXT | FK → User, NULLABLE, SET NULL | PJ yang mengunci grup |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### PoinLog
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Log ID |
| kelas_matkul_id | TEXT | FK → KelasMatkul | Course-class assignment |
| mahasiswa_id | TEXT | FK → User | Student being graded |
| pj_id | TEXT | FK → User | PJ who awarded points |
| kategori_id | TEXT | FK → KategoriPoin | Point category |
| poin | INTEGER | CHECK (1-4) | Points awarded |
| catatan | TEXT | NULLABLE | Notes |
| created_at | TIMESTAMP | DEFAULT now() | Timestamp |

### AuditLog
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Audit event ID |
| actor_id, actor_name, actor_role | TEXT | NOT NULL, snapshot | Identity and role of the actor |
| action | TEXT | NOT NULL | Systemic event type, e.g. `POIN_INPUT`, `PJ_ASSIGN` |
| entity_type, entity_id | TEXT | NOT NULL | Affected entity type and identifier |
| entity_label | TEXT | NULLABLE, snapshot | Human-readable affected entity |
| kelas_id, kelas_label | TEXT | NULLABLE, snapshot | Class context for filtering and history |
| matkul_id, matkul_label | TEXT | NULLABLE, snapshot | Course context for filtering and history |
| before, after, metadata | JSONB | NULLABLE | Change snapshots and action-specific context |
| created_at | TIMESTAMP | DEFAULT now() | Event timestamp |

Indexes: `(kelas_id, created_at DESC)`, `(action, created_at DESC)`,
`(actor_id, created_at DESC)`, and `(created_at DESC)`.

### Prodi
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Study program ID |
| name | TEXT | UNIQUE, NOT NULL | Program name |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### Matkul
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Course ID |
| name | TEXT | NOT NULL | Course name |
| code | TEXT | UNIQUE, NULLABLE | Course code |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### Semester
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Semester ID |
| name | TEXT | UNIQUE, NOT NULL | Semester name |
| start_date | TIMESTAMP | NOT NULL | Start date |
| end_date | TIMESTAMP | NOT NULL | End date |
| is_active | BOOLEAN | DEFAULT false | Active flag |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### KategoriPoin
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Category ID |
| name | TEXT | UNIQUE, NOT NULL | Category name |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### Session (NextAuth)
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Session ID |
| sessionToken | TEXT | UNIQUE | Session token |
| userId | TEXT | FK → User | Linked user |
| expires | TIMESTAMP | NOT NULL | Expiry |

### VerificationToken
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| identifier | TEXT | NOT NULL | Target identifier |
| token | TEXT | UNIQUE | Verification token |
| expires | TIMESTAMP | NOT NULL | Expiry |
| — | — | @@unique([identifier, token]) | Composite uniqueness |

### MobileAuthRequest
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY (cuid) | Request ID |
| state | TEXT | NOT NULL | CSRF state (OAuth native) |
| code_challenge | TEXT | NOT NULL | PKCE challenge |
| redirect_uri | TEXT | NOT NULL | Redirect target (mis. `karsa://auth/callback`) |
| user_id | TEXT | FK → User, NULLABLE, ON DELETE CASCADE | User setelah consent |
| code_hash | TEXT | UNIQUE, NULLABLE | Hash authorization code |
| expires_at | TIMESTAMP | NOT NULL | Kedaluwarsa request |
| consumed_at | TIMESTAMP | NULLABLE | Saat code ditukar |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |

### MobileSession
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY (cuid) | Session ID |
| user_id | TEXT | FK → User, NOT NULL, ON DELETE CASCADE | Pemilik sesi |
| access_token_hash | TEXT | UNIQUE | SHA-256 access token (raw token tidak disimpan) |
| refresh_token_hash | TEXT | UNIQUE | SHA-256 refresh token |
| access_expires_at | TIMESTAMP | NOT NULL | 15 menit sejak issued |
| refresh_expires_at | TIMESTAMP | NOT NULL | 30 hari sejak issued |
| revoked_at | TIMESTAMP | NULLABLE | Set oleh logout/revoke server-side |
| last_used_at | TIMESTAMP | DEFAULT now() | Probe aktivitas |
| device_name | TEXT | NULLABLE | Label perangkat |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### GroupMessage
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY (cuid) | Message ID |
| kelas_matkul_id | TEXT | FK → KelasMatkul, ON DELETE CASCADE | Grup sumber |
| author_id | TEXT | FK → User, ON DELETE RESTRICT | Penulis |
| reply_to_id | TEXT | FK → GroupMessage, NULLABLE, ON DELETE SET NULL | Pesan yang dibalas |
| body | TEXT | NULLABLE hanya setelah purge retensi; CHECK `char_length(btrim) BETWEEN 1 AND 2000` ATAU (`NULL` DAN `deleted_at/hidden_at NOT NULL`) | Isi pesan |
| idempotency_key | TEXT | UNIQUE, NOT NULL | Format `{actor_id}:{client_key}` (16–128 karakter dari header) |
| edited_at | TIMESTAMP | NULLABLE | Penanda edit |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete oleh penulis |
| hidden_at | TIMESTAMP | NULLABLE | Disembunyikan PJ atau auto-hide |
| hidden_by_id | TEXT | FK → User, NULLABLE, ON DELETE SET NULL | PJ yang menyembunyikan |
| hidden_reason | TEXT | NULLABLE; CHECK 1–120 karakter | Alasan hide |
| pinned_at | TIMESTAMP | NULLABLE | Pin kedaluwarsa otomatis 40×24 jam |
| pinned_by_id | TEXT | FK → User, NULLABLE, ON DELETE SET NULL | PJ yang mem-pin |
| created_at | TIMESTAMP | DEFAULT now() | Urutan pesan |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Sinkronisasi edit/delete/moderasi |

### GroupReport
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY (cuid) | Report ID |
| message_id | TEXT | FK → GroupMessage, ON DELETE CASCADE | Pesan yang dilaporkan |
| reporter_id | TEXT | FK → User, ON DELETE RESTRICT | Pelapor |
| reason | TEXT | CHECK IN ('SPAM','HARASSMENT','INAPPROPRIATE','MISINFORMATION','OTHER') | Alasan allowlist |
| details | TEXT | NULLABLE; CHECK ≤ 500 karakter | Detail opsional |
| status | TEXT | DEFAULT 'OPEN'; CHECK IN ('OPEN','DISMISSED','ACTIONED') | Status laporan |
| resolved_at | TIMESTAMP | NULLABLE | Waktu resolusi |
| resolved_by_id | TEXT | FK → User, NULLABLE, ON DELETE SET NULL | PJ penyelesai |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| updated_at | TIMESTAMP | DEFAULT now(), AUTO UPDATE | Last update |

### GroupBlock
| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| blocker_id | TEXT | FK → User, ON DELETE CASCADE | Pemilik preferensi |
| blocked_id | TEXT | FK → User, ON DELETE CASCADE | Target blokir |
| created_at | TIMESTAMP | DEFAULT now() | Creation date |
| — | — | PRIMARY KEY (blocker_id, blocked_id) | Kunci komposit |
| — | — | CHECK `blocker_id <> blocked_id` | Tidak boleh self-block |

---

## 3. Relationships

| Parent | Child | Cardinality | On Delete | Constraint |
|--------|-------|-------------|-----------|------------|
| User | Account | 1:N | CASCADE | @relation |
| User | PoinLog (mahasiswa) | 1:N | RESTRICT | @relation("PoinLogMahasiswa") |
| User | PoinLog (pj) | 1:N | RESTRICT | @relation("PoinLogPj") |
| User | KelasMatkul (pj) | 1:N | RESTRICT | @relation("KelasMatkulPj") |
| User | Session | 1:N | CASCADE | @relation |
| Kelas | User | 1:N | SET NULL | @relation |
| Kelas | KelasMatkul | 1:N | CASCADE | @relation |
| Prodi | Kelas | 1:N | RESTRICT | @relation |
| Semester | Kelas | 1:N | RESTRICT | @relation |
| Matkul | KelasMatkul | 1:N | RESTRICT | @relation |
| KelasMatkul | PoinLog | 1:N | CASCADE | @relation |
| KategoriPoin | PoinLog | 1:N | RESTRICT | @relation |
| User | MobileAuthRequest | 1:N | CASCADE | @relation |
| User | MobileSession | 1:N | CASCADE | @relation |
| User | KelasMatkul (group locker) | 1:N | SET NULL | @relation("KelasMatkulGroupLocker") |
| KelasMatkul | GroupMessage | 1:N | CASCADE | @relation |
| User | GroupMessage (author) | 1:N | RESTRICT | @relation("GroupMessageAuthor") |
| GroupMessage | GroupMessage (replies) | 1:N | SET NULL | @relation("GroupMessageReplies") |
| User | GroupMessage (hiddenBy) | 1:N | SET NULL | @relation("GroupMessageHiddenBy") |
| User | GroupMessage (pinnedBy) | 1:N | SET NULL | @relation("GroupMessagePinnedBy") |
| GroupMessage | GroupReport | 1:N | CASCADE | @relation |
| User | GroupReport (reporter) | 1:N | RESTRICT | @relation("GroupReportReporter") |
| User | GroupReport (resolvedBy) | 1:N | SET NULL | @relation("GroupReportResolver") |
| User | GroupBlock (blocker) | 1:N | CASCADE | @relation("GroupBlocker") |
| User | GroupBlock (blocked) | 1:N | CASCADE | @relation("GroupBlocked") |

---

## 4. Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| User | @@index | kelas_id | Fast lookup by class |
| Account | @@unique | provider, providerAccountId | Unique OAuth account |
| Account | @@index | userId | Fast lookup by user |
| Session | @@index | userId | Fast lookup by user |
| Kelas | @@unique | name, prodi_id, semester_id | Unique class per semester |
| Kelas | @@index | prodi_id | Fast lookup by prodi |
| Kelas | @@index | semester_id | Fast lookup by semester |
| KelasMatkul | @@unique | kelas_id, matkul_id | Unique course per class |
| KelasMatkul | @@index | kelas_id | Fast lookup by class |
| KelasMatkul | @@index | matkul_id | Fast lookup by matkul |
| KelasMatkul | @@index | pj_id | Fast lookup by PJ |
| PoinLog | @@index | kelas_matkul_id | Fast lookup by assignment |
| PoinLog | @@index | mahasiswa_id | Fast lookup by student |
| PoinLog | @@index | pj_id | Fast lookup by PJ |
| PoinLog | @@index | kategori_id | Fast lookup by category |
| PoinLog | @@index | created_at | Fast sort by date |
| PoinLog | @@index | kelas_matkul_id, mahasiswa_id | Fast class+student lookup |
| Semester | @@unique (partial) | is_active WHERE is_active=true | Max 1 active semester |
| KelasMatkul | @@index | group_locked_by_id | Fast lookup pengunci grup |
| GroupMessage | @@index | kelas_matkul_id, created_at DESC, id DESC | Cursor utama timeline grup |
| GroupMessage | @@index | kelas_matkul_id, updated_at DESC | Sinkronisasi delta |
| GroupMessage | @@index | author_id | Lookup pesan penulis |
| GroupMessage | @@index | reply_to_id | Lookup balasan |
| GroupMessage | @@index | kelas_matkul_id, pinned_at DESC | Strip pesan tersemat |
| GroupMessage | @unique | idempotency_key | Dedup write |
| GroupReport | @@unique | message_id, reporter_id | Satu laporan per pengguna per pesan |
| GroupReport | @@index | message_id, status | Hitung laporan OPEN (auto-hide) |
| GroupReport | @@index | reporter_id, created_at DESC | Riwayat laporan pengguna |
| GroupReport | @@index | resolved_by_id | Audit resolusi |
| GroupBlock | @@index | blocked_id | Lookup daftar pem-blokir |
| MobileAuthRequest | @@index | expires_at | Retensi request kadaluarsa |
| MobileAuthRequest | @@index | user_id | Lookup per user |
| MobileAuthRequest | @unique | code_hash | Anti-replay |
| MobileSession | @unique | access_token_hash | Lookup bearer |
| MobileSession | @unique | refresh_token_hash | Lookup refresh |
| MobileSession | @@index | user_id, revoked_at | Revocation check |
| MobileSession | @@index | refresh_expires_at | Retensi sesi |

---

## 5. Constraints

| Constraint | Table | Description |
|------------|-------|-------------|
| User_email_key | User | Unique email |
| User_nim_key | User | Unique NIM |
| Account_provider_providerAccountId_key | Account | Unique OAuth account |
| Session_sessionToken_key | Session | Unique session token |
| VerificationToken_token_key | VerificationToken | Unique token |
| VerificationToken_identifier_token_key | VerificationToken | Unique identifier+token |
| Semester_name_key | Semester | Unique semester name |
| Prodi_name_key | Prodi | Unique prodi name |
| Matkul_code_key | Matkul | Unique course code |
| Kelas_name_prodi_id_semester_id_key | Kelas | Unique class per semester |
| KelasMatkul_kelas_id_matkul_id_key | KelasMatkul | Unique course per class |
| KategoriPoin_name_key | KategoriPoin | Unique category name |
| PoinLog_poin_check | PoinLog | poin BETWEEN 1 AND 4 |
| Semester_rentang_check | Semester | end_date > start_date |
| Semester_satu_aktif_key | Semester | Only 1 active semester |
| GroupMessage_body_check | GroupMessage | body bukan-NULL 1–2000 char ATAU NULL dengan deleted_at/hidden_at terisi |
| GroupMessage_hidden_reason_check | GroupMessage | hidden_reason NULL ATAU 1–120 char setelah trim |
| GroupMessage_idempotency_key_key | GroupMessage | idempotency_key unique |
| GroupReport_reason_check | GroupReport | reason ∈ allowlist |
| GroupReport_details_check | GroupReport | details NULL ATAU ≤ 500 char |
| GroupReport_status_check | GroupReport | status ∈ {OPEN, DISMISSED, ACTIONED} |
| GroupReport_message_id_reporter_id_key | GroupReport | Satu laporan per reporter per message |
| GroupBlock_not_self_check | GroupBlock | blocker_id ≠ blocked_id |

---

*Dokumen ini bersifat internal dan rahasia. Hanya untuk tim pengembang dan pihak berwenang di Universitas Tidar.*
