# Karsa — Arsitektur Sistem

**Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR**
*Fase 5 — Security Hardening*

---

## 1. Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KARSA SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND LAYER                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │   │
│  │   │   Landing Page   │  │   Web App       │  │   Mobile App    │    │   │
│  │   │   (Vite+React)  │  │   (Desktop)     │  │   (Responsive)  │    │   │
│  │   │                 │  │                 │  │                 │    │   │
│  │   │   - Hero        │  │   - Admin Panel │  │   - Catat Poin  │    │   │
│  │   │   - Features    │  │   - Rapor Mhs   │  │   - Riwayat     │    │   │
│  │   │   - Privacy     │  │   - Leaderboard │  │   - Scan QR     │    │   │
│  │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │   │
│  │            │                    │                    │              │   │
│  │            └────────────────────┼────────────────────┘              │   │
│  │                                 │                                   │   │
│  │                         ┌───────┴───────┐                           │   │
│  │                         │  API Routes   │                           │   │
│  │                         │  (Next.js)    │                           │   │
│  │                         └───────┬───────┘                           │   │
│  └─────────────────────────────────┼───────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                        BACKEND LAYER                                │   │
│  ├─────────────────────────────────┼───────────────────────────────────┤   │
│  │                                 │                                   │   │
│  │                         ┌───────┴───────┐                           │   │
│  │                         │  Middleware   │                           │   │
│  │                         │  (Edge)       │                           │   │
│  │                         │               │                           │   │
│  │                         │  - Auth check │                           │   │
│  │                         │  - Role guard │                           │   │
│  │                         │  - Channel    │                           │   │
│  │                         │    detect     │                           │   │
│  │                         └───────┬───────┘                           │   │
│  │                                 │                                   │   │
│  │                         ┌───────┴───────┐                           │   │
│  │                         │  Server       │                           │   │
│  │                         │  Actions      │                           │   │
│  │                         │               │                           │   │
│  │                         │  - requireUser│                           │   │
│  │                         │  - requireAdmin                          │   │
│  │                         │  - requirePj  │                           │   │
│  │                         │  - Zod valid  │                           │   │
│  │                         └───────┬───────┘                           │   │
│  │                                 │                                   │   │
│  │                         ┌───────┴───────┐                           │   │
│  │                         │  Prisma ORM   │                           │   │
│  │                         └───────┬───────┘                           │   │
│  └─────────────────────────────────┼───────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────┼───────────────────────────────────┐   │
│  │                        DATA LAYER                                   │   │
│  ├─────────────────────────────────┼───────────────────────────────────┤   │
│  │                                 │                                   │   │
│  │                         ┌───────┴───────┐                           │   │
│  │                         │  PostgreSQL   │                           │   │
│  │                         │  (Supabase)   │                           │   │
│  │                         │               │                           │   │
│  │                         │  - User       │                           │   │
│  │                         │  - Account    │                           │   │
│  │                         │  - PoinLog    │                           │   │
│  │                         │  - Kelas      │                           │   │
│  │                         │  - Matkul     │                           │   │
│  │                         │  - Session    │                           │   │
│  │                         └───────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js (App Router) | 15.x | React framework |
| | TypeScript | 5.x | Type safety |
| | Tailwind CSS | 4.x | Styling |
| | shadcn/ui | latest | UI components |
| | Framer Motion | 13.x | Animations |
| **Backend** | NextAuth v5 | 5.0.0-beta.25 | Authentication |
| | Prisma | 6.x | ORM |
| | Zod | 3.x | Validation |
| **Database** | PostgreSQL | 15+ | Primary database |
| | Supabase | latest | Database hosting |
| **Hosting** | Vercel | latest | Deployment |
| **Auth** | Google OAuth | - | SSO provider |
| **Email** | EmailJS | - | Form notifications |

---

## 3. Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  User    │     │  NextAuth    │     │  Google     │     │  Karsa   │
│  Browser │     │  (Karsa)     │     │  OAuth      │     │  Server  │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                  │
     │  1. Click Login  │                    │                  │
     │─────────────────>│                    │                  │
     │                  │                    │                  │
     │                  │  2. Redirect to    │                  │
     │                  │  Google OAuth      │                  │
     │                  │───────────────────>│                  │
     │                  │                    │                  │
     │                  │  3. User grants    │                  │
     │                  │  permission        │                  │
     │                  │<───────────────────│                  │
     │                  │                    │                  │
     │                  │  4. Callback with  │                  │
     │                  │  authorization     │                  │
     │                  │  code              │                  │
     │                  │─────────────────────────────────────>│
     │                  │                    │                  │
     │                  │  5. Validate domain│                  │
     │                  │  (@untidar.ac.id)  │                  │
     │                  │                    │                  │
     │                  │  6. Create/Update  │                  │
     │                  │  User in DB        │                  │
     │                  │                    │                  │
     │                  │  7. Generate JWT   │                  │
     │                  │  session token     │                  │
     │                  │                    │                  │
     │  8. Set cookie   │                    │                  │
     │<─────────────────│                    │                  │
     │                  │                    │                  │
     │  9. Redirect to  │                    │                  │
     │  home based on   │                    │                  │
     │  role            │                    │                  │
     │                  │                    │                  │
```

---

## 4. Authorization Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED ACCESS CONTROL                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐  │
│   │     ADMIN       │    │       PJ        │    │  MAHASISWA │  │
│   │                 │    │                 │    │            │  │
│   │ - Full system   │    │ - Catat poin    │    │ - Lihat    │  │
│   │   access        │    │ - Lihat riwayat │    │   rapor    │  │
│   │ - Manage users  │    │ - Hapus poin    │    │ - Lihat    │  │
│   │ - Manage kelas  │    │   sendiri       │    │   leader-  │  │
│   │ - Manage matkul │    │ - Export data   │    │   board    │  │
│   │ - View all data │    │   (kelas sendiri)│    │ - Download │  │
│   │ - Export all    │    │                 │    │   rapor    │  │
│   └─────────────────┘    └─────────────────┘    └────────────┘  │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    MIDDLEWARE GUARD                       │   │
│   │                                                          │   │
│   │   /admin/*    → requireAdmin()  → is_admin = true       │   │
│   │   /catat-poin → requirePj()     → is_pj = true          │   │
│   │   /dashboard  → requireUser()   → any logged-in user    │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐         ┌─────────────────┐                           │
│   │     User        │         │    Account      │                           │
│   ├─────────────────┤         ├─────────────────┤                           │
│   │ id (PK)         │◄────────│ userId (FK)     │                           │
│   │ name            │         │ provider        │                           │
│   │ nim (unique)    │         │ providerAcctId  │                           │
│   │ email (unique)  │         │ access_token    │                           │
│   │ is_admin        │         │ refresh_token   │                           │
│   │ kelas_id (FK)   │         │ expires_at      │                           │
│   │ image           │         └─────────────────┘                           │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            │ 1:N                                                             │
│            ▼                                                                 │
│   ┌─────────────────┐         ┌─────────────────┐                           │
│   │     Kelas       │         │   KelasMatkul   │                           │
│   ├─────────────────┤         ├─────────────────┤                           │
│   │ id (PK)         │◄────────│ kelas_id (FK)   │                           │
│   │ name            │         │ matkul_id (FK)  │                           │
│   │ prodi_id (FK)   │         │ pj_id (FK)      │                           │
│   │ semester_id(FK) │         └────────┬────────┘                           │
│   └─────────────────┘                  │                                     │
│                                         │ 1:N                                │
│                                         ▼                                     │
│                                ┌─────────────────┐                           │
│                                │    PoinLog      │                           │
│                                ├─────────────────┤                           │
│                                │ id (PK)         │                           │
│                                │ kelasMatkulId   │                           │
│                                │ mahasiswaId     │                           │
│                                │ pj_id           │                           │
│                                │ kategori_id     │                           │
│                                │ poin (1-4)      │                           │
│                                │ catatan         │                           │
│                                │ created_at      │                           │
│                                └─────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: TRANSPORT                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HTTPS/TLS 1.3 encryption for all communications        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 2: AUTHENTICATION                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Google Workspace SSO (OAuth 2.0)                       │   │
│  │  Domain restriction: @students.untidar.ac.id            │   │
│  │  JWT session tokens (httpOnly cookies)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 3: AUTHORIZATION                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Middleware: Edge-based route protection                │   │
│  │  Server Actions: requireAdmin/requirePj/requireUser     │   │
│  │  Database: Row-level security via Prisma                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 4: DATA PROTECTION                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Leaderboard masking (nama dan NIM mahasiswa lain)      │   │
│  │  Class-scoped data visibility                            │   │
│  │  Immutable audit ledger                                 │   │
│  │  Input validation (Zod + DB constraints)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 5: APPLICATION                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  IDOR prevention (server re-query for authorization)    │   │
│  │  Anti double-submit (3-second window)                   │   │
│  │  Rate limiting (Fase 5)                                 │   │
│  │  Penetration testing (Fase 5)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT TOPOLOGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌───────────────┐                              │
│                              │   Vercel      │                              │
│                              │   Edge        │                              │
│                              │   Network     │                              │
│                              └───────┬───────┘                              │
│                                      │                                       │
│                              ┌───────┴───────┐                              │
│                              │   Vercel      │                              │
│                              │   Serverless  │                              │
│                              │   Functions   │                              │
│                              └───────┬───────┘                              │
│                                      │                                       │
│              ┌───────────────────────┼───────────────────────┐              │
│              │                       │                       │              │
│      ┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐      │
│      │   Supabase    │       │   Google      │       │   EmailJS     │      │
│      │   PostgreSQL  │       │   OAuth       │       │   Email       │      │
│      │   Database    │       │   Provider    │       │   Service     │      │
│      └───────────────┘       └───────────────┘       └───────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Supabase pooled connection | `postgresql://...@aws-...pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | Supabase direct connection | `postgresql://...@aws-...pooler.supabase.com:5432/postgres` |
| `AUTH_SECRET` | NextAuth JWT secret | `openssl rand -base64 32` |
| `AUTH_URL` | App URL | `https://karsa-one.vercel.app` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | `xxxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth secret | `GOCSPX-xxxx` |
| `ALLOWED_EMAIL_DOMAINS` | Allowed login domains | `students.untidar.ac.id,untidar.ac.id` |
| `ADMIN_EMAIL` | First admin email | `admin@students.untidar.ac.id` |

---

## 9. Monitoring & Logging

| Component | Tool | Purpose |
|-----------|------|---------|
| Error tracking | Vercel Logs | Server errors, build failures |
| Auth logging | NextAuth callbacks | Login/logout events |
| Audit trail | AuditLog table | Event sistemik poin dan PJ; admin dapat memfilter kelas, aksi, aktor, dan pencarian |
| Performance | Vercel Analytics | Page load, API latency |

---

*Dokumen ini bersifat internal dan rahasia. Hanya untuk tim pengembang dan pihak berwenang di Universitas Tidar.*
