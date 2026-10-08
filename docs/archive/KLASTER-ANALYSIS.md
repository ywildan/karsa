# Karsa — Analisis Klaster Kompleks

**Dokumen referensi untuk diskusi strategis & roadmap jangka panjang**

> Dokumen ini melacak 10 klaster topik kompleks yang perlu dibahas/dikerjakan sepanjang siklus hidup Karsa. Setiap klaster punya urgensi berbeda dan akan diselesaikan secara bertahap, terutama di Fase 6 (Hardening) dan seterusnya.

---

## Daftar Klaster

| Kode | Nama Klaster | Urgensi | Status Bahasan |
|---|---|---|---|
| **A** | Legal & Compliance (UU PDP) | 🔴 Tinggi (kirim kampus) | ⬜ Belum |
| **B** | Ownership & Handover | 🟡 Sedang (jangka panjang) | ⬜ Belum |
| **C** | Scale & Operational Cost | 🟡 Sedang | ⬜ Belum |
| **D** | Integration (SIAKAD, SSO, multi-tenant) | 🟢 Rendah (future) | ⬜ Belum |
| **E** | Etika & Fairness Akademik | 🟡 Sedang | ⬜ Belum |
| **F** | Adopsi & Change Management | 🟡 Sedang (pilot) | ⬜ Belum |
| **G** | Multi-Role Conflict of Interest | 🔴 Tinggi (integritas) | ✅ Sudah dibahas |
| **H** | Exit Strategy & Sustainability | 🟢 Rendah (jangka panjang) | ⬜ Belum |
| **I** | Failure Mode & Incident Response | 🔴 Tinggi (preventif) | ⬜ Belum |
| **J** | Testing & QA Strategy | 🟡 Sedang (scaling) | ⬜ Belum |

---

## Legenda

| Simbol | Arti |
|---|---|
| 🔴 **Tinggi** | Blocker untuk pilot / kirim kampus / integritas sistem |
| 🟡 **Sedang** | Penting untuk pilot atau scaling, tapi bukan blocker |
| 🟢 **Rendah** | Jangka panjang, tidak urgent |
| ⬜ **Belum** | Belum dibahas |
| 🟡 **Sedang dibahas** | Sedang dalam diskusi |
| ✅ **Sudah** | Sudah dibahas, action items teridentifikasi |

---

## Ringkasan Per Klaster

### 🔴 A — Legal & Compliance (UU PDP)
Data mahasiswa (nama, NIM, email, poin) termasuk **data pribadi** menurut UU PDP No. 27/2022. Perlu audit: persetujuan mahasiswa, penyimpanan di server luar negeri (Supabase Singapore), data controller, incident response plan.

**Target:** Sebelum kirim surat ke kampus.

---

### 🟡 B — Ownership & Handover
Siapa pemilik Karsa? Kamu pribadi atau kampus? Bagaimana kalau kamu lulus? Handover code ke kampus formal atau informal? Pilihan lisensi (MIT, Apache 2.0, proprietary).

**Target:** Sebelum launch resmi semester Genap.

---

### 🟡 C — Scale & Operational Cost
Kapasitas Supabase free tier (500MB), Vercel hobby tier (100GB bandwidth), biaya bulanan kalau user naik, monitoring & alerting, migration path kalau pindah ke server kampus.

**Target:** Sebelum 1000+ user.

---

### 🟢 D — Integration (SIAKAD, SSO, Multi-Tenant)
Integrasi SIAKAD UNTIDAR untuk tarik data mahasiswa otomatis, SSO kampus (ganti Google OAuth), multi-tenant architecture kalau kampus lain mau adopsi.

**Target:** Fase jangka panjang (2027+).

---

### 🟡 E — Etika & Fairness Akademik
Poin Karsa bagian dari nilai akhir atau tidak? PJ pilih kasih? Konflik kepentingan PJ = mahasiswa di kelasnya? Mekanisme banding kalau mahasiswa komplain? Gamification ethics (leaderboard bisa bikin kompetisi tidak sehat).

**Target:** Sebelum PJ real pakai.

---

### 🟡 F — Adopsi & Change Management
Dosen senior gaptek, PJ tidak mau pakai HP, mahasiswa tidak peduli, sosialisasi awal lewat apa, champion strategy, kurva belajar UI.

**Target:** Fase pilot (Nov-Des 2026).

---

### 🔴 G — Multi-Role Conflict of Interest ✅
**Status:** Sudah dibahas. Ringkasan:
- Self-dealing poin → sudah ada guard server
- Manipulasi DB manual → butuh transfer ownership saat launch
- Admin tanpa audit → butuh admin kedua + audit trail
- Multi-role UX bingung → butuh fix redirect rule
- Tidak ada audit trail → butuh tabel `AuditLog`

**Action items untuk Fase 6:** Audit trail, fix redirect, admin kedua (opsional), transfer ownership (saat launch).

---

### 🟢 H — Exit Strategy & Sustainability
Kamu lulus 2027/2028 → siapa maintain? Vercel/Supabase free tier berubah policy → siapa bayar? Handover kapan & bagaimana? Succession plan (cari junior)? Domain ownership setelah lulus?

**Target:** Jangka panjang, tapi mulai dokumentasi sejak sekarang.

---

### 🔴 I — Failure Mode & Incident Response
Semester ganti tengah input, PJ internet putus tengah submit, server down jam 8 pagi, DB corrupt, mahasiswa dihapus padahal sudah punya poin, PJ di-replace tengah semester, salah input poin, double-submit.

**Target:** Sebelum pilot (preventif).

---

### 🟡 J — Testing & QA Strategy
Belum ada automated test, regression testing manual, staging environment, monitoring & alerting, UAT, fuzz testing, load testing.

**Target:** Sebelum scaling.

---

## Kaitan dengan Fase 6 (Hardening)

Fase 6 di PRD aslinya sempit. Setelah analisis klaster, **Fase 6 diperluas** jadi 6 sub-fase tematik:

| Sub-Fase | Fokus | Dari Klaster |
|---|---|---|
| **6A** | Audit Trail & Multi-Role Governance | G |
| **6B** | Rate Limiting & Input Hardening | G, I |
| **6C** | Failure Mode & Incident Response | I |
| **6D** | Performance & Scale | C |
| **6E** | Accessibility & UX Polish | F, G |
| **6F** | Testing & Documentation | H, J |

**Klaster A (Legal/PDP)** ditangani **di luar Fase 6** — lewat dokumen terpisah (`COMPLIANCE.md`) sebelum kirim ke kampus.

**Klaster B, D, E** ditangani saat/atau setelah launch — bukan scope Fase 6.

---

## Prioritas Eksekusi
