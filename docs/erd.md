# Karsa — Entity Relationship Diagram

**Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**

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

---

*Dokumen ini bersifat internal dan rahasia. Hanya untuk tim pengembang dan pihak berwenang di Universitas Tidar.*
