# 📘 PRD — Karsa

### Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR

> **Versi:** 2.0 · **Brand:** Karsa · **Codename teknis:** `karsa` / `sipoin`
> **Dokumen ini adalah sumber kebenaran tunggal untuk pengembangan Karsa.**
> Dibaca ulang sebelum setiap fase. Diperbarui setelah setiap fase selesai.

---

## 0. ATURAN MAIN UNTUK AI AGENT

1. **Kode aktual = sumber kebenaran.** Jika dokumen ini bertentangan dengan repo, **kode menang**. Laporkan perbedaan, jangan ikut dokumen buta.
2. **Jangan overhaul** struktur folder, schema Prisma, atau konfigurasi NextAuth yang sudah jalan tanpa perintah eksplisit.
3. **Jangan operasi destruktif:** tidak ada `db push`, `migrate`, `seed` ke Neon, `git push`, atau hapus file tanpa perintah.
4. **Jangan tampilkan secret** (`.env`, token, connection string) di dokumen/log/jawaban.
5. **Verifikasi sebelum klaim selesai:** `npx tsc --noEmit` + `npm run lint` + `npm run build`.
6. **Otorisasi di server.** UI hanya UX, bukan keamanan.
7. **Satu fase per sesi.** Selesai → verifikasi → lapor → berhenti.
8. **Jangan mengarang.** Kalau belum diputuskan → tandai `BUTUH KEPUTUSAN`.
9. **Bahasa:** prosa Indonesia, istilah teknis tetap aslinya.

---

## 1. RINGKASAN PRODUK

**Karsa** (dari bahasa Sanskerta: *kehendak, daya, semangat untuk berkarya*) adalah web app internal Universitas Tidar untuk mencatat dan menampilkan poin keaktifan mahasiswa per mata kuliah per kelas.

**Tagline:** *"Setiap karsa, satu poin."*

**Masalah yang diselesaikan:**
- Nilai keaktifan (bertanya, menjawab, presentasi) dicatat manual di kertas/Excel per PJ → hilang, tidak konsisten, tidak bisa direkap.
- Mahasiswa tidak tahu posisi poinnya sampai akhir semester.
- Admin tidak punya rekap terpusat per kelas/matkul/semester.

**Filosofi produk:** setiap usaha kecil mahasiswa (bertanya, menjawab, presentasi) adalah *karsa* — dan Karsa merekamnya.

**Tiga aktor, dua channel:**

```
📱 MOBILE (locked)     →  PJ input poin
💻 DESKTOP (web only)  →  Mahasiswa lihat rapor + leaderboard
                       →  Admin kelola data + rekap
```

**Filosofi UX:**
- **Mobile = tools.** Cepat, fokus, sekali pakai. Buka → tap → simpan → tutup.
- **Desktop = showcase + kontrol.** Personal, enak dipandang, dan (untuk admin) fungsional.

**Bukan:** LMS, sistem akademik, aplikasi publik.
**Batas domain:** hanya `@students.untidar.ac.id`.

---

## 2. BRAND IDENTITY

### 2.1 Nama

| Aspek | Nilai |
|---|---|
| **Nama produk** | Karsa |
| **Ejaan** | Satu kata, kapital di awal saja: `Karsa` |
| **Bukan** | `KARSA`, `karsa`, `KarsaApp`, `SiKarsa` |
| **Asal kata** | Sanskerta — kehendak, daya, semangat untuk berkarya |
| **Codename teknis** | `karsa` (folder/repo boleh tetap `sipoin` kalau sudah ada) |

### 2.2 Tagline

**Utama:**
> *"Setiap karsa, satu poin."*

**Alternatif:**
- *"Rekam karsamu, ukir prestasimu."*
- *"Karsamu, jejakmu."*
- *"Setiap usaha, punya nilai."*

### 2.3 Suara Brand

- **Hangat, tidak kaku.** Menyapa dengan "Halo, [Nama]" bukan "Selamat datang, user."
- **Ringkas.** Tidak bertele-tele di UI.
- **Mengayakan mahasiswa.** "Karsamu tercatat." bukan "Poin berhasil disimpan."
- **Tidak menggurui.** Bahasa setara, bukan formal birokratis.

### 2.4 Yang Berubah Karena Branding

| Diubah | Tidak Diubah |
|---|---|
| Judul UI, header, login page | Nama tabel Prisma (`PoinLog`, `KelasMatkul`, dst.) |
| Meta title Next.js | Nama server action (`createPoinLog`) |
| Favicon & logo | Nama folder repo (boleh tetap `sipoin`) |
| Tagline & copywriting | Nama field schema |
| Warna aksen (opsional) | API routes / internal function names |

> **Prinsip:** branding = lapisan UI. Logic tetap pakai istilah domain asli.

---

## 3. DEFINISI ISTILAH

| Istilah | Arti |
|---|---|
| **Prodi** | Program studi. |
| **Semester** | Periode akademik. Hanya **1 aktif** pada satu waktu. |
| **Kelas / Rombel** | Rombongan belajar. Unique `(name, prodi_id, semester_id)`. |
| **Matkul** | Mata kuliah (master, lintas kelas). |
| **KelasMatkul** | Matkul yang diajarkan di kelas tertentu + PJ. Unique `(kelas_id, matkul_id)`. |
| **PJ** | Penanggung Jawab input poin untuk 1 `KelasMatkul`. Bisa merangkap mahasiswa di kelas yang sama. |
| **Kategori Poin** | Bertanya · Menjawab · Presentasi · Lainnya. |
| **Poin Log** | 1 baris pencatatan: `(kelas_matkul, mahasiswa, pj, kategori, poin, catatan)`. |
| **Karsa** | Sebutan untuk satu baris poin log di UI (satu aksi = satu karsa). |
| **User tanpa kelas** | Login valid tapi `kelas_id = null`. |

> **Aturan inti:** Tidak ada poin lepas. Setiap `PoinLog` wajib terikat `kelas_matkul_id`. Mahasiswa yang bisa dinilai **hanya** mahasiswa di kelas milik `kelas_matkul` tersebut.

---

## 4. ARSITEKTUR & STACK

```
Framework   : Next.js App Router
Bahasa      : TypeScript (strict)
Styling     : Tailwind CSS + shadcn/ui
Animasi     : Framer Motion (popup overlay & micro-interaction)
Notif       : Sonner
ORM         : Prisma 6
Database    : PostgreSQL (Neon serverless)
Auth        : NextAuth v5 (Google OAuth, JWT)
Excel       : xlsx
PWA         : manifest + icon (minimal, no offline mode)
```

### 4.1 Dual Channel Architecture

```
app/
  (auth)/
    login/
  (mobile)/              ← route group mobile-locked (PJ only)
    layout.tsx           ← bottom nav
    catat-poin/
    riwayat-poin/
    poin-saya/
  (desktop)/             ← route group desktop
    layout.tsx           ← header/nav, responsive
    dashboard/           ← single-page rapor mahasiswa
    leaderboard/
    admin/
      dashboard/
      semester/
      prodi/
      matkul/
      kelas/[id]/
      rekap/
```

### 4.2 Device Detection & Routing

Middleware menentukan channel dengan auto-detect via User-Agent saja:

```
1. Mobile UA → channel = mobile
2. Desktop UA → channel = desktop
3. Simpan hasil deteksi ke cookie `karsa_channel` (session-only)
   untuk kebutuhan redirect saja
```

Tidak ada tombol switch manual. Cookie `karsa_channel` bukan pengganti layout;
layout ditentukan oleh path route group.

**Aturan redirect:**

| User | Channel mobile | Channel desktop |
|---|---|---|
| **PJ** | ✅ Semua route `(mobile)` | ❌ Redirect ke `(mobile)/catat-poin` |
| **Mahasiswa** | ❌ Redirect ke `(desktop)/dashboard` | ✅ Semua route `(desktop)` |
| **Admin** | ❌ Redirect ke `(desktop)/admin` | ✅ Semua route `(desktop)` |
| **User tanpa kelas** | ❌ Redirect ke `(desktop)/dashboard` | ✅ `(desktop)/dashboard` (empty state) |

> PJ **locked mobile-only**. Buka dari desktop → tetap render mobile layout (sempit), dengan hint *"Buka di HP untuk pengalaman terbaik."*

---

## 5. DATA MODEL (REFERENSI)

> Sumber asli: `prisma/schema.prisma`. **Schema menang** jika berbeda.

```
User         →  nim? (unique, nullable — NIM mahasiswa; NULL untuk admin)
                kelas_id (FK Kelas, nullable), is_admin
Kelas        →  prodi_id, semester_id
                @@unique([name, prodi_id, semester_id])
KelasMatkul  →  kelas_id, matkul_id, pj_id (FK User)
                @@unique([kelas_id, matkul_id])
PoinLog      →  kelas_matkul_id, mahasiswa_id, pj_id, kategori_id,
                poin (1–4), catatan?
KategoriPoin →  name (unique)
```

**Seed minimal:** 4 KategoriPoin + 1 Semester aktif.

**Guard di level database (`prisma/init.sql`):** di luar schema Prisma ada 2 `CHECK`
(`poin` 1–4, `end_date > start_date`) dan 1 partial unique index
`Semester_satu_aktif_key` yang menjaga "hanya 1 semester aktif" (§9) walaupun ada
jalur tulis di luar aplikasi. Karena `prisma migrate` tidak dipakai, objek ini
tidak menimbulkan drift — kalau nanti pindah ke `migrate`, hapus ketiganya.

---

## 6. AKTOR & MATRIKS HAK AKSES

| Aksi | Admin | PJ (di `kelas_matkul`-nya) | Mahasiswa | Tanpa Kelas |
|---|:---:|:---:|:---:|:---:|
| Kelola master (semester/prodi/kelas/matkul) | ✅ | ❌ | ❌ | ❌ |
| Assign/hapus mahasiswa dari kelas | ✅ | ❌ | ❌ | ❌ |
| Assign/edit PJ | ✅ | ❌ | ❌ | ❌ |
| **Input poin** | ✅ (via desktop) | ✅ (via mobile, kelasnya saja) | ❌ | ❌ |
| Hapus poin sendiri | ✅ | ✅ (hanya buatannya) | ❌ | ❌ |
| Lihat rapor pribadi | ✅ | ✅ | ✅ | empty state |
| Lihat leaderboard kelas | ✅ | ✅ | ✅ (kelasnya) | ❌ |
| Rekap & export | ✅ | ❌ | ❌ | ❌ |
| Akses `/admin/*` | ✅ | ❌ | ❌ | ❌ |

**Guard route:**
- `/admin/*` → wajib `is_admin === true`
- `/dashboard/*`, `/leaderboard` → wajib login
- `(mobile)/*` → wajib login **dan** user adalah PJ (punya ≥1 `KelasMatkul`)
- `/login` → jika sudah login, redirect ke home channel masing-masing

---

## 7. ALUR UTAMA

### 7.1 Admin (Desktop)

1. Login → `/admin/dashboard` (ringkasan).
2. Kelola master: Semester → Prodi → Matkul → Kelas.
3. Detail Kelas → tab Mahasiswa (tambah manual / import Excel) + tab Matkul & PJ (assign).
4. Rekap & export (Fase 5).

**Tidak ada perubahan dari Fase 2** kecuali gaya visual boleh di-refresh.

### 7.2 PJ (Mobile Only — Locked)

1. Login dari HP → middleware deteksi UA → redirect ke `/catat-poin`.
2. **Bottom nav 3 tab:**
   - `➕ Input` → daftar `KelasMatkul` yang ia pegang → pilih → list mahasiswa → tap `+ Poin` → **bottom sheet** → simpan.
   - `📋 Riwayat` → input-nya sendiri, filter per matkul, bisa hapus (konfirmasi).
   - `👤 Poin Saya` → rapor versi mobile. Isi: total + list matkul + poin. Tap matkul → popup overlay riwayat.

### 7.3 Mahasiswa (Desktop Only)

1. Login dari desktop → `/dashboard`.
2. **Single-page rapor personal:**
   - Header: foto profil, nama, NIM, kelas · prodi · semester
   - **Total poin semester aktif** — angka besar, animasi count-up
   - **List matkul** sebagai card: nama matkul, PJ, total poin user, progress bar
3. **Klik matkul** → **popup overlay smooth** (Framer Motion):
   - Detail riwayat: tanggal | kategori | poin | catatan | PJ
   - Total poin di matkul tersebut
   - Posisi ranking user di matkul itu
4. Link ke `/leaderboard` di header.

### 7.4 User Tanpa Kelas

1. Login valid tapi `kelas_id = null`.
2. `/dashboard` menampilkan empty state:
   > *"Kamu belum terdaftar di kelas manapun. Hubungi admin."*
3. Tidak bisa akses `/leaderboard`.

### 7.5 Leaderboard

- **Route terpisah:** `/leaderboard`.
- **Scope:** hanya kelas user. Tidak bisa lihat kelas lain.
- **Filter:** pilih matkul dari kelas user (pill toggle).
- **Nama disensor:**
  - Contoh: `Rizki Dermawan` → `Rixxx Dexxxxxx`
  - Aturan: pertahankan **2 karakter pertama** setiap kata, sisanya ganti `x`
  - Nama 1 kata → `Rixxx`
  - User yang login → barisnya highlighted + nama **full** (unmasked)
- **Rank:** dense (1, 1, 2, 3, 3).
- **Empty state:** jika matkul belum ada poin.

---

## 8. ATURAN BISNIS PENCATATAN POIN

**Sudah jelas:**
- PJ hanya input untuk mahasiswa di kelas milik `kelas_matkul` yang `pj_id = dirinya`.
- `poin`: integer **1–4** (validasi server, radio di UI).
- `kategori_id` wajib ada di tabel `KategoriPoin`.
- `catatan`: opsional.
- Setiap input → insert 1 baris `PoinLog` dengan `pj_id = session.user.id`.
- **Koreksi:** hapus permanen oleh PJ pembuat / admin, dengan dialog konfirmasi.
- **Tidak ada batas waktu koreksi.**
- **Tidak ada bulk input** dulu.
- **Double-submit prevention:** disable tombol saat loading + guard server (cek duplikat dalam 3 detik dengan payload sama → skip).

**Default untuk keputusan minor:**
| Topik | Default |
|---|---|
| PJ input poin untuk dirinya sendiri? | **Tidak** |
| Admin input poin? | **Ya** (via desktop) |
| Soft delete poin? | **Tidak** (hard delete) |
| Catatan wajib? | **Tidak** |
| Nilai poin fixed 1–4? | **Ya** |

---

## 9. ATURAN SEMESTER & HISTORI

- **1 semester aktif** pada satu waktu. Set aktif = transaksi.
- `Kelas` & `KelasMatkul` terikat semester via `Kelas.semester_id`.
- Ganti semester tidak mengubah data lama.
- Rapor & leaderboard default: **semester aktif**.
- Pindah mahasiswa antar kelas → `PoinLog` lama tidak diubah (tetap terikat `kelas_matkul` lama). **Dokumentasikan di UI:** *"Poin dari kelas sebelumnya tetap tersimpan."*
- Rapor mahasiswa menampilkan **hanya semester aktif** dulu.

---

## 10. DESIGN SYSTEM (DUAL CHANNEL)

### 10.1 Mobile Shell (PJ)

**Prinsip:** satu tangan, satu jempol, satu menit.

- **Layout:** full-width, no sidebar. Header tipis + konten + bottom nav fixed.
- **Bottom nav:** 3 tab (Input · Riwayat · Poin Saya), ikon besar, label kecil.
- **Card:** sudut rounded besar (16–20px), shadow lembut, tap target ≥ 44px.
- **Bottom sheet:** bukan modal tengah. Pakai `vaul` (kalau sudah ada) atau custom Framer Motion.
- **Form:** segmented control untuk kategori, tombol besar 1–4 untuk poin, textarea collapsible.
- **Feedback:** toast Sonner di atas bottom nav + haptic feedback (vibrate 10ms) saat simpan sukses.
- **PWA:** manifest + icon + splash. Installable.
- **Warna:** pakai CSS variable dari `tailwind.config` existing.

### 10.2 Desktop Shell — Mahasiswa (Showcase)

**Prinsip:** satu halaman personal yang enak dilihat.

- **Layout:** single column, max-width ~720px, center. Tidak ada sidebar.
- **Header:** foto profil + nama + NIM + kelas · prodi · semester. Toggle dark mode + tombol "Leaderboard".
- **Hero section:** total poin semester ini, angka besar (48–64px), animasi count-up saat mount.
- **List matkul:** card grid vertical, tiap card:
  - Nama matkul (bold)
  - PJ (muted)
  - Total poin user + progress bar kecil
  - Chevron → klik → popup overlay
- **Popup overlay:**
  - Backdrop blur + fade in
  - Panel scale-in dari 0.95 → 1 dengan spring
  - Konten: riwayat poin (timeline vertical, bukan tabel kaku)
  - Klik backdrop / Esc → close dengan animasi reverse
- **Micro-interaction:** hover scale 1.02 pada card, transition 200ms.
- **Animasi:** Framer Motion untuk mount & popup.

### 10.3 Desktop Shell — Admin

**Prinsip:** fungsional > dekoratif.

- **Tetap seperti Fase 2** (sidebar + tabel + form).
- Boleh refresh visual nanti (bukan prioritas).

### 10.4 Token Visual

- **Warna:** CSS variable dari `tailwind.config` existing. Jangan tambah palet baru.
- **Radius:** mobile card 20px, desktop card 16px, tombol 12px.
- **Spacing:** 4px grid.
- **Motion:** `duration-200` untuk hover, `duration-300` untuk popup, `spring` untuk sheet.

---

## 11. PETA ROUTE

### Sudah ada (Fase 1, 1.5, & 2)
```
/login
/dashboard                 (placeholder → diisi Fase 4A)
/admin/*
/catat-poin                (placeholder shell → diisi Fase 3A)
/riwayat-poin              (placeholder shell → diisi Fase 3B)
/poin-saya                 (placeholder shell → diisi Fase 3C)
```

### Akan dibangun
```
MOBILE (route group (mobile)):
  /catat-poin                        ← isi Fase 3A (shell sudah ada)
  /catat-poin/[kelas_matkul_id]      ← Fase 3A
  /riwayat-poin                      ← isi Fase 3B (shell sudah ada)
  /poin-saya                         ← isi Fase 3C (shell sudah ada)

DESKTOP (route group (desktop)):
  /dashboard                         ← Fase 4A
  /leaderboard                       ← Fase 4C
  /admin/rekap                       ← Fase 5
```

### Server Actions
```
actions/semester.ts    ✅
actions/prodi.ts       ✅
actions/kelas.ts       ✅
actions/matkul.ts      ✅
actions/poin.ts        ❌ ← Fase 3A
actions/rekap.ts       ❌ ← Fase 5
```

---

## 12. STATUS FITUR

| Fitur | Status | Catatan |
|---|---|---|
| Auth NextAuth v5 + filter domain | `SEBAGIAN` | Fase 1: Google OAuth + filter domain lewat `callbacks.signIn` (`auth.config.ts`). Alur Google **belum diuji end-to-end** (butuh kredensial OAuth asli) — sisanya teruji. |
| Dev Quick Login (4 tombol, guard produksi) | `SELESAI` | Fase 1: provider Credentials `dev-login` + Server Action. 3 lapis guard `NODE_ENV`: UI, pendaftaran provider, `authorize()`/action. Teruji 17 assertion lewat HTTP. |
| JWT refresh `is_admin` / `kelas_id` | `SELESAI` | Fase 1: `callbacks.jwt` me-refresh dari DB tiap pembacaan session (id, `nim`, `is_admin`, `kelas_id`, `is_pj`). Teruji per role. |
| Middleware guard route | `SELESAI` | Fase 1.5: `/admin/*` (is_admin), `/dashboard/*` (login; PJ → `/catat-poin`), path mobile (wajib PJ), `/login` + `/` (redirect home channel). Channel auto-detect dari UA; cookie `karsa_channel` hanya untuk redirect. |
| Halaman `/login` + `/dashboard` placeholder | `SELESAI` | Fase 1: logo + tagline, tombol Google, blok dev (dev-only), pesan error role/domain; `/dashboard` menampilkan nama + role + `kelas_id` + logout + empty state §7.4. Rapor penuh = Fase 4A. |
| CRUD Semester / Prodi / Matkul / Kelas | `BELUM` | **Koreksi §12 lama:** folder `actions/` belum punya modul CRUD (hanya `actions/auth.ts` dari Fase 1). Perlu dikerjakan sebelum Fase 3A/5 atau dicatat sebagai hutang teknis. |
| Detail Kelas — Mahasiswa + Matkul & PJ | `BELUM` | **Koreksi §12 lama:** belum ada halaman `admin/kelas/[id]` di repo. |
| **Rebranding SiPoin → Karsa** | `SELESAI` | Terverifikasi di repo Fase 1: tidak ada lagi teks "SiPoin" di kode/UI (hanya tersisa di dokumen ini sebagai catatan nama lama). |
| **Dual channel routing** | `SELESAI` | Fase 1.5: route group `(mobile)` / `(desktop)` tanpa mengubah URL, `lib/channel.ts`, middleware auto-detect UA + cookie untuk redirect. Tidak ada tombol switch. Isi halaman mobile = Fase 3. |
| **PWA manifest** | `SELESAI` | Minimal: `public/manifest.json` + `icon.svg`. Tanpa offline mode. |
| **Fase 3A — Input poin PJ (mobile)** | `BELUM` | Prioritas #1 |
| **Fase 3B — Riwayat input PJ** | `BELUM` | — |
| **Fase 3C — Rapor mobile (PJ dual role)** | `BELUM` | — |
| **Fase 4A — Rapor mahasiswa (desktop)** | `BELUM` | — |
| **Fase 4C — Leaderboard (masked)** | `BELUM` | — |
| **Fase 5 — Rekap & export admin** | `BELUM` | — |
| Schema push ke Supabase/Postgres | `SELESAI` | Dikonfirmasi user: Supabase live, 11 tabel. Skema yang sama (`prisma/init.sql`) direplikasi di Postgres lokal saat verifikasi Fase 1. |
| Seed di Supabase/Postgres | `SELESAI` | Dikonfirmasi user: 5 test user + data uji lengkap. Idempoten, teruji ulang Fase 1. |

**Label:** `SELESAI` · `SEBAGIAN` · `BELUM` · `BUTUH VERIFIKASI`.

> **Catatan verifikasi Fase 1 (Auth + Dev Quick Login).** Repo diverifikasi ulang,
> dan ada dua klaim §12 lama yang tidak sesuai kondisi kode saat itu: tidak ada
> `auth.ts`/`middleware.ts` sama sekali, dan tidak ada modul CRUD di `actions/`
> (lihat baris "Koreksi §12 lama"). Yang sudah teruji di Fase 1: 51 assertion
> HTTP (matriks guard role × route, klaim session per role, jalur tombol Dev
> Quick Login, penolakan dev login saat `NODE_ENV=production`). Yang **belum**
> teruji: alur Google OAuth asli (butuh kredensial OAuth kampus) dan perilaku
> multi-device (Fase 1.5).

---

## 13. KEPUTUSAN YANG SUDAH DIKUNCI

### 13.1 Keputusan Produk (Q1–Q10)

| # | Topik | Keputusan |
|---|---|---|
| Q1 | PJ akses | **Mobile-only (locked)** |
| Q2 | Mahasiswa akses | **Web-only (desktop)** |
| Q3 | PJ dual role | **Bottom nav punya tab "Poin Saya"** |
| Q4 | PWA | **Ya (minimal: manifest + icon)** |
| Q5 | Device detection | **Auto-detect via UA saja; tidak ada tombol switch** |
| Q6 | Halaman mahasiswa | **Single-page rapor personal** |
| Q7 | Detail matkul mahasiswa | **Popup overlay, Framer Motion** |
| Q8 | Leaderboard | **Halaman terpisah, nama masked, class-scoped** |
| Q9 | Admin | **Panel dashboard dipertahankan** |
| Q10 | Rapor mobile untuk PJ | **Full rapor mobile** |

### 13.2 Default Keputusan Minor

| Topik | Default |
|---|---|
| PJ input untuk diri sendiri | Tidak |
| Admin input poin | Ya (via desktop) |
| Bulk input | Tidak dulu |
| Batas waktu koreksi | Tidak ada |
| Catatan wajib | Tidak |
| Nilai poin | Fixed 1–4 |
| Nama masked user login | Ditampilkan **full** |
| Rank seri | Dense rank |
| PDF export | Tidak |
| Timezone | WIB (Asia/Jakarta) |
| Rapor mahasiswa lihat semester lama | Tidak dulu |

---

## 14. ROADMAP & INSTRUKSI PER-FASE

> Setiap fase: **Tujuan → Scope → File → Urutan → Acceptance → Test → Risiko**.
> Satu fase per sesi.

### FASE 0 — Verifikasi & Stabilisasi

**Tujuan:** pastikan Fase 1 & 2 valid sebelum menambah fitur.

**Scope:**
- Audit struktur repo vs §12.
- Jalankan `tsc`, `lint`, `build`.
- Cek `.env.example` lengkap.
- Cek schema Neon sinkron (baca saja).
- Cek seed ada.

**Acceptance:**
- [ ] `tsc` · `lint` · `build` bersih
- [ ] Laporan tertulis: kondisi aktual vs klaim
- [ ] Daftar file belum di-commit (jika ada)

**Test:** `npx tsc --noEmit && npm run lint && npm run build`

---

### FASE 0.5 — Rebranding SiPoin → Karsa

**Tujuan:** ganti branding di UI tanpa menyentuh logic.

**Scope:**
- Update meta title Next.js → `Karsa — Sistem Poin UNTIDAR`
- Update header/login page/sidebar copywriting
- Buat favicon & logo Karsa (SVG sederhana)
- Update tagline
- **JANGAN** ubah nama tabel, field, folder, atau function.

**Acceptance:**
- [ ] Tidak ada teks "SiPoin" yang tersisa di UI
- [ ] Meta title baru
- [ ] Logo & favicon terpasang
- [ ] `tsc` · `lint` · `build` bersih

---

### FASE 1.5 — Fondasi Dual Channel

**Tujuan:** siapkan infrastruktur dua channel sebelum fitur.

**Scope:**
- Refactor route: pindahkan `admin/*` ke `(desktop)/admin/*`. Pindahkan `/dashboard` ke `(desktop)/dashboard`.
- Buat route group `(mobile)` dengan layout bottom nav.
- Middleware: auto-detect via UA + role-based redirect + cookie hasil deteksi untuk redirect.
- Tidak ada tombol switch channel.
- PWA: `manifest.json` + icon set.

**File terdampak:**
- `middleware.ts` (edit)
- `app/(desktop)/layout.tsx` (baru/pindahan)
- `app/(mobile)/layout.tsx` (baru)
- `public/manifest.json` + icons (baru)

**Acceptance:**
- [ ] Akses dari mobile UA + login PJ → masuk `(mobile)`
- [ ] Akses dari desktop UA + login PJ → redirect ke `(mobile)/catat-poin` (dengan hint)
- [ ] Akses mahasiswa dari mobile UA → redirect ke `(desktop)/dashboard`
- [ ] Cookie `karsa_channel` ditulis dari hasil UA dan dipakai untuk redirect
- [ ] Tidak ada tombol switch channel
- [ ] PWA installable
- [ ] `tsc` · `lint` · `build` bersih

**Risiko:** middleware routing bisa memblok route yang tidak seharusnya → test semua kombinasi role × UA.

---

### FASE 3A — Input Poin PJ (Mobile) `[PRIORITAS #1]`

**Tujuan:** PJ bisa input poin dari HP dalam ≤3 tap.

**Scope:**
- `actions/poin.ts`: `getMatkulsAsPJ`, `getMahasiswaInKelasMatkul`, `createPoinLog`, `getPoinLogsByKelasMatkul`.
- Route `(mobile)/catat-poin` + `(mobile)/catat-poin/[kelas_matkul_id]`.
- Bottom sheet input: segmented kategori, tombol poin 1–4, catatan collapsible.
- Haptic feedback saat simpan.
- Guard server: cek `session.user.id === kelas_matkul.pj_id` sebelum insert.

**File terdampak:**
- `actions/poin.ts` (baru)
- `app/(mobile)/catat-poin/page.tsx` + `[kelas_matkul_id]/page.tsx` (baru)
- `app/(mobile)/catat-poin/_components/*.tsx` (baru)
- `components/bottom-sheet.tsx` (baru, kalau belum ada)

**Acceptance:**
- [ ] PJ lihat hanya matkul yang ia pegang
- [ ] Mahasiswa yang tampil hanya dari kelas terkait
- [ ] Submit sukses → toast + haptic + list refresh
- [ ] Non-PJ panggil `createPoinLog` via devtools → ditolak server
- [ ] PJ kirim `mahasiswa_id` dari kelas lain → ditolak server
- [ ] Nilai poin di luar 1–4 → ditolak server
- [ ] Nyaman di layar ≥360px
- [ ] `tsc` · `lint` · `build` bersih

**Risiko:** IDOR jika `kelas_matkul_id` dipercaya dari client → re-query di server dengan `session.user.id`.

---

### FASE 3B — Riwayat Input PJ (Mobile)

**Tujuan:** PJ lihat & hapus input-nya sendiri.

**Scope:**
- Route `(mobile)/riwayat-poin`.
- Filter per matkul, sortir terbaru.
- Hapus via swipe-to-delete atau tombol hapus + dialog konfirmasi.
- Guard server: hanya `pj_id = dirinya` yang bisa hapus.

**Acceptance:**
- [ ] Hanya input milik PJ sendiri yang tampil
- [ ] Hapus hanya untuk poin buatannya
- [ ] Konfirmasi sebelum hapus, toast setelah
- [ ] `tsc` · `lint` · `build` bersih

---

### FASE 3C — Rapor Mobile untuk PJ

**Tujuan:** PJ (yang juga mahasiswa) bisa lihat rapor pribadinya dari HP.

**Scope:**
- Route `(mobile)/poin-saya`.
- Reuse komponen dari Fase 4A (rapor mahasiswa), versi mobile (single column, card compact).
- Popup overlay untuk detail matkul (reuse pola Fase 4A).

**Acceptance:**
- [ ] Total poin & list matkul tampil benar
- [ ] Popup overlay berfungsi, animasi smooth
- [ ] Konsisten secara visual dengan versi desktop
- [ ] `tsc` · `lint` · `build` bersih

---

### FASE 4A — Rapor Mahasiswa (Desktop Single-Page)

**Tujuan:** mahasiswa buka `/dashboard` → langsung lihat rapor lengkap.

**Scope:**
- Isi `(desktop)/dashboard/page.tsx`.
- Query: total poin semester aktif, list matkul kelasnya, total per matkul.
- Hero section: total poin, animasi count-up.
- List matkul sebagai card.
- Popup overlay detail matkul: riwayat poin + ranking di matkul itu.
- Empty state untuk user tanpa kelas.

**File terdampak:**
- `app/(desktop)/dashboard/page.tsx` (edit)
- `app/(desktop)/dashboard/_components/*.tsx` (baru)
- `components/poin-detail-popup.tsx` (baru, reusable untuk Fase 3C)

**Acceptance:**
- [ ] User dengan kelas: total + list matkul + popup detail
- [ ] User tanpa kelas: empty state informatif
- [ ] Popup smooth (Framer Motion), bisa close via backdrop/Esc
- [ ] Tidak ada N+1 (pakai `groupBy` atau `include` dengan `_count`/`sum`)
- [ ] Responsif minimal tablet
- [ ] `tsc` · `lint` · `build` bersih

**Risiko:** query berat jika mahasiswa ambil banyak matkul → pakai `groupBy` sekali, hindari loop query.

---

### FASE 4C — Leaderboard (Desktop)

**Tujuan:** ranking per matkul, class-scoped, nama masked.

**Scope:**
- Route `(desktop)/leaderboard`.
- Filter: pilih matkul dari kelas user.
- Query: `groupBy mahasiswa_id, sum(poin), orderBy desc`.
- Masking nama: 2 huruf pertama + `x` sisanya. User login ditampilkan full.
- Dense rank (1, 1, 2, 3, 3).
- Empty state.

**File terdampak:**
- `app/(desktop)/leaderboard/page.tsx` (baru)
- `lib/mask-name.ts` (baru)

**Acceptance:**
- [ ] Hanya matkul kelas user yang bisa dipilih
- [ ] Nama ter-mask sesuai aturan (`Rizki Dermawan` → `Rixxx Dexxxxxx`)
- [ ] Baris user login: nama full + highlight
- [ ] Rank dense
- [ ] Tidak bisa akses kelas lain via manipulasi URL/query
- [ ] `tsc` · `lint` · `build` bersih

---

### FASE 5 — Rekap & Export Admin

**Tujuan:** admin rekap poin per kelas + export Excel.

**Scope:**
- Route `(desktop)/admin/rekap`.
- `actions/rekap.ts`: `getRekapByKelas`, `exportRekapExcel`.
- Filter hierarkis: semester → prodi → kelas → matkul (opsional).
- Tabel kolom dinamis per matkul.
- Generate `.xlsx` di server, stream ke client.
- Nama file: `rekap_<kelas>_<semester>_<yyyyMMdd>.xlsx`.

**Acceptance:**
- [ ] Filter di server (bukan client-only)
- [ ] Tabel kolom dinamis
- [ ] Excel ter-download, kolom & urutan sesuai spec
- [ ] Non-admin tidak bisa akses
- [ ] `tsc` · `lint` · `build` bersih

---

### FASE 6 — Hardening

- Rate limit Server Action kritis.
- Index DB untuk query leaderboard & rekap (audit dulu).
- Error boundary + `loading.tsx` untuk route utama.
- Audit aksesibilitas dasar.
- Audit log perubahan poin (jika diputuskan).

---

## 15. DEFINITION OF DONE (Per Fase)

- [ ] Semua acceptance criteria tercentang
- [ ] `tsc` · `lint` · `build` bersih
- [ ] Smoke test manual (list skenario)
- [ ] Guard otorisasi diuji via request manual (bukan UI saja)
- [ ] Tidak ada `console.log` debug tertinggal
- [ ] Dokumen ini di-update (§12 status)
- [ ] Laporan: file diubah, hasil test, yang belum terverifikasi

---

## 16. STRATEGI PENGUJIAN

**Authorization (wajib tiap fase):**
- Login PJ-A → coba akses resource PJ-B → tolak.
- Login mahasiswa → akses `/admin/*` → redirect.
- Login mahasiswa → akses `/leaderboard` kelas lain → tolak.
- User tanpa kelas → akses `/catat-poin` → redirect.
- PJ buka `/catat-poin` dari desktop UA → tetap tampil (locked), dengan hint.

**Device routing:**
- Emulasi mobile UA + role PJ → masuk `(mobile)`.
- Emulasi mobile UA + role mahasiswa → redirect ke `(desktop)`.
- Cookie `karsa_channel` mengikuti hasil auto-detect UA dan hanya dipakai untuk redirect.

**Smoke test UI (manual):**
- Happy path.
- Empty state.
- Error state (matikan network → toast/fallback).

---

## 17. FILE YANG TIDAK DISENTUH

- `prisma/schema.prisma` (kecuali diminta)
- `auth.config.ts` / `auth.ts`
- `middleware.ts` → **kecuali** untuk Fase 1.5 (device detection)
- `tailwind.config.*`, `components.json` (kecuali menambah token)
- `package.json` dependencies (kecuali menambah `framer-motion` & `vaul` — **minta izin dulu**)

---

## 18. FORMAT LAPORAN PER FASE

Balas dengan urutan ini, lalu **berhenti**:

1. **Fase yang dikerjakan** + scope singkat.
2. **File diubah/dibuat** (path).
3. **Perubahan kunci** (1–3 baris per file).
4. **Hasil test:** `tsc`, `lint`, `build`, smoke test.
5. **Yang belum terverifikasi** (jujur).
6. **Blocker / pertanyaan** (jika ada).
7. **Update §12 status.**

---

## 19. PERTANYAAN TERBUKA (Minor)

| # | Topik | Default jika tidak dijawab |
|---|---|---|
| D1 | Batas waktu koreksi poin | Tidak ada |
| D2 | Tambah `framer-motion` + `vaul` | **Perlu izin** |
| D3 | Index DB tambahan | Audit dulu di Fase 6 |
| D4 | Empty state saat matkul PJ kosong | Kartu abu-abu + pesan |
| D5 | Rapor mahasiswa lihat semester lama | Tidak dulu |
| D6 | Warna aksen Karsa | Pakai existing theme dulu |
| D7 | Logo Karsa final | Placeholder SVG dulu |

---

## 20. PERINTAH MULAI

Setelah §19 dijawab (atau default disetujui):

> **"Kerjakan FASE 0. Verifikasi kondisi repo, lapor temuan. Jangan coding fitur."**

Setelah Fase 0 lapor bersih:

> **"Kerjakan FASE 0.5 (rebranding Karsa)."** → dst.

---

*Versi 2.0 · Brand: Karsa · Update terakhir: [isi tanggal] · Maintainer: Yusuf Wildan Affandi*
