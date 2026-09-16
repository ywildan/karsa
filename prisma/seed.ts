/**
 * Karsa — prisma/seed.ts
 * ----------------------------------------------------------------------------
 * Seed data Karsa. Dua bagian:
 *
 *   A. DATA PRODUKSI  (selalu dijalankan)
 *      · 4 KategoriPoin  (Bertanya · Menjawab · Presentasi · Lainnya)
 *      · 1 Semester aktif
 *
 *   B. DATA UJI (test users) — dijalankan kecuali SEED_TEST_DATA=false
 *      · 1 Prodi TI · 2 Matkul · 1 Kelas TI-01
 *      · 5 test user @students.untidar.ac.id (admin, PJ, 2 mahasiswa,
 *        1 user tanpa kelas)
 *      · 2 KelasMatkul (Budi sebagai PJ) · 2 sample PoinLog
 *
 *      Data uji ini dipakai Dev Quick Login (Fase 1) supaya bisa ganti role
 *      tanpa akun Google asli. JANGAN dijalankan di database produksi —
 *      set SEED_TEST_DATA="false".
 *
 * Jalankan:  npm run db:seed        (butuh DIRECT_URL di .env)
 *
 * Sifat: idempoten (upsert dengan id eksplisit / updateMany) — aman diulang.
 * Catatan: kalau seed dijalankan dua kali (sekali lewat file ini, sekali lewat
 * blok SEED di `prisma/init.sql`), tidak ada baris ganda — id-nya sama.
 *
 * Hasilnya identik dengan blok SEED di `prisma/init.sql`. Kalau salah satu
 * diubah, update keduanya.
 *
 * Override opsional lewat .env:
 *   SEED_SEMESTER_NAME, SEED_SEMESTER_START, SEED_SEMESTER_END,
 *   SEED_TEST_DATA, ADMIN_EMAIL
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------------

/** Kategori poin tetap (PRD §3). Jangan tambah/hapus tanpa update PRD. */
const KATEGORI_POIN = ["Bertanya", "Menjawab", "Presentasi", "Lainnya"] as const;

const SEMESTER_NAME = process.env.SEED_SEMESTER_NAME?.trim() || "Ganjil 2026/2027";
const SEMESTER_START = process.env.SEED_SEMESTER_START?.trim() || "2026-09-01";
const SEMESTER_END = process.env.SEED_SEMESTER_END?.trim() || "2027-01-31";

/** Data uji dinyalakan secara default; matikan dengan SEED_TEST_DATA=false. */
const SEED_TEST_DATA = process.env.SEED_TEST_DATA?.trim().toLowerCase() !== "false";

const DOMAIN_UJI = "@students.untidar.ac.id";

// Id eksplisit — biar sama persis dengan prisma/init.sql dan mudah
// direferensikan di Fase 1 (Dev Quick Login).
const PRODI_TI_ID = "prodi_ti";
const MATKUL_ALGO_ID = "matkul_algo";
const MATKUL_PWEB_ID = "matkul_pweb";
const KELAS_TI01_ID = "kelas_ti01";
const KM_ALGO_TI01_ID = "km_algo_ti01";
const KM_PWEB_TI01_ID = "km_pweb_ti01";

/** Tanggal seed disimpan UTC-naive (kolom TIMESTAMP(3) tanpa timezone). */
function toUtcDate(value: string, endOfDay = false): Date {
  const jam = endOfDay ? "23:59:59.000Z" : "00:00:00.000Z";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${jam}` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Tanggal tidak valid: "${value}". Pakai format YYYY-MM-DD.`);
  }
  return date;
}

/** Berapa hari ke belakang dari sekarang — untuk created_at PoinLog contoh. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// A. Data produksi
// ---------------------------------------------------------------------------

async function seedKategoriPoin(): Promise<void> {
  for (const name of KATEGORI_POIN) {
    await prisma.kategoriPoin.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  · KategoriPoin siap: ${name}`);
  }
}

async function seedSemester(): Promise<void> {
  const start_date = toUtcDate(SEMESTER_START);
  const end_date = toUtcDate(SEMESTER_END, true);

  if (end_date <= start_date) {
    throw new Error("SEED_SEMESTER_END harus setelah SEED_SEMESTER_START.");
  }

  // PRD §9: hanya 1 semester aktif. URUTAN PENTING — matikan semester lain
  // DULU, baru nyalakan semester ini. Kalau dibalik, partial unique index
  // "Semester_satu_aktif_key" akan menolak (P2002) saat ada semester lain
  // yang sedang aktif.
  const dimatikan = await prisma.semester.updateMany({
    where: { name: { not: SEMESTER_NAME }, is_active: true },
    data: { is_active: false },
  });
  if (dimatikan.count > 0) {
    console.log(`  · ${dimatikan.count} semester lain dinonaktifkan (is_active = false).`);
  }

  const semester = await prisma.semester.upsert({
    where: { name: SEMESTER_NAME },
    update: { start_date, end_date, is_active: true },
    create: { name: SEMESTER_NAME, start_date, end_date, is_active: true },
  });
  console.log(`  · Semester aktif: ${semester.name} (${semester.id})`);
}

async function promoteAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log("  · ADMIN_EMAIL tidak diisi — lewati promosi admin.");
    return;
  }

  const hasil = await prisma.user.updateMany({
    where: { email },
    data: { is_admin: true },
  });

  if (hasil.count > 0) {
    console.log(`  · ${email} dijadikan admin.`);
  } else {
    console.log(
      `  · ${email} belum ada di tabel User — login dulu lewat Google, lalu jalankan seed sekali lagi.`,
    );
  }
}

// ---------------------------------------------------------------------------
// B. Data uji (Fase 1 — Dev Quick Login)
// ---------------------------------------------------------------------------

async function seedProdi(): Promise<void> {
  const prodi = await prisma.prodi.upsert({
    where: { id: PRODI_TI_ID },
    update: {},
    create: { id: PRODI_TI_ID, name: "Teknik Informatika" },
  });
  console.log(`  · Prodi: ${prodi.name} (${prodi.id})`);
}

async function seedMatkul(): Promise<void> {
  const daftar = [
    { id: MATKUL_ALGO_ID, name: "Algoritma dan Pemrograman", code: "TIF1101" },
    { id: MATKUL_PWEB_ID, name: "Pemrograman Web", code: "TIF1102" },
  ];

  for (const matkul of daftar) {
    const hasil = await prisma.matkul.upsert({
      where: { id: matkul.id },
      update: { name: matkul.name, code: matkul.code },
      create: matkul,
    });
    console.log(`  · Matkul: ${hasil.name} (${hasil.id})`);
  }
}

async function seedKelas(): Promise<void> {
  // Ambil semester aktif — bisa dibuat di atas, atau sudah ada sebelumnya.
  const semester =
    (await prisma.semester.findFirst({ where: { is_active: true } })) ??
    (await prisma.semester.findUnique({ where: { name: SEMESTER_NAME } }));

  if (!semester) {
    throw new Error("Semester aktif tidak ditemukan — jalankan seedSemester() lebih dulu.");
  }

  const kelas = await prisma.kelas.upsert({
    where: { id: KELAS_TI01_ID },
    update: { name: "TI-01", prodi_id: PRODI_TI_ID, semester_id: semester.id },
    create: {
      id: KELAS_TI01_ID,
      name: "TI-01",
      prodi_id: PRODI_TI_ID,
      semester_id: semester.id,
    },
  });
  console.log(`  · Kelas: ${kelas.name} — semester ${semester.name} (${kelas.id})`);
}

/**
 * 5 test user. NIM hanya untuk mahasiswa; admin boleh kosong.
 * `is_admin` / `kelas_id` / `nim` di-set eksplisit supaya role-nya pasti —
 * login Google tidak akan menimpanya.
 */
async function seedTestUsers(): Promise<void> {
  const users = [
    {
      id: "usr_admin",
      name: "Admin Karsa",
      nim: null,
      email: `admin${DOMAIN_UJI}`,
      is_admin: true,
      kelas_id: null,
    },
    {
      id: "usr_pj_budi",
      name: "Budi Santoso",
      nim: "2310501001",
      email: `pj.budi${DOMAIN_UJI}`,
      is_admin: false,
      kelas_id: KELAS_TI01_ID,
    },
    {
      id: "usr_siti",
      name: "Siti Aminah",
      nim: "2310501002",
      email: `siti.aminah${DOMAIN_UJI}`,
      is_admin: false,
      kelas_id: KELAS_TI01_ID,
    },
    {
      id: "usr_agus",
      name: "Agus Santoso",
      nim: "2310501003",
      email: `agus.santoso${DOMAIN_UJI}`,
      is_admin: false,
      kelas_id: KELAS_TI01_ID,
    },
    {
      id: "usr_user_baru",
      name: "User Baru",
      nim: "2310501099",
      email: `user.baru${DOMAIN_UJI}`,
      is_admin: false,
      kelas_id: null,
    },
  ] as const;

  for (const user of users) {
    // Kasus: user sudah terlanjur dibuat NextAuth saat login Google —
    // email sama, tapi id-nya cuid acak. `upsert` by id akan gagal dengan
    // unique violation pada email. Deteksi lebih dulu supaya pesannya jelas.
    const emailTerpakai = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (emailTerpakai && emailTerpakai.id !== user.id) {
      console.warn(
        `  ⚠️  ${user.email} sudah ada dengan id "${emailTerpakai.id}" — dilewati.\n` +
          `      Perbaiki dengan menghapus baris itu (beserta Account/Session-nya),\n` +
          `      atau set manual:\n` +
          `      UPDATE "User" SET is_admin = ${user.is_admin}, ` +
          `kelas_id = ${user.kelas_id ? `'${user.kelas_id}'` : "NULL"}, ` +
          `nim = ${user.nim ? `'${user.nim}'` : "NULL"} WHERE email = '${user.email}';`,
      );
      continue;
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        nim: user.nim,
        is_admin: user.is_admin,
        kelas_id: user.kelas_id,
      },
      create: user,
    });
    const peran = user.is_admin ? "admin" : user.kelas_id ? "mahasiswa/PJ" : "tanpa kelas";
    console.log(`  · User: ${user.email} — ${peran} (${user.id})`);
  }
}

/** Budi sebagai PJ untuk 2 matkul di TI-01. */
async function seedKelasMatkul(): Promise<void> {
  const daftar = [
    { id: KM_ALGO_TI01_ID, matkul_id: MATKUL_ALGO_ID },
    { id: KM_PWEB_TI01_ID, matkul_id: MATKUL_PWEB_ID },
  ];

  for (const item of daftar) {
    const hasil = await prisma.kelasMatkul.upsert({
      where: { id: item.id },
      update: {
        kelas_id: KELAS_TI01_ID,
        matkul_id: item.matkul_id,
        pj_id: "usr_pj_budi",
      },
      create: {
        id: item.id,
        kelas_id: KELAS_TI01_ID,
        matkul_id: item.matkul_id,
        pj_id: "usr_pj_budi",
      },
    });
    console.log(`  · KelasMatkul: ${hasil.id} — PJ usr_pj_budi`);
  }
}

/**
 * 2 sample PoinLog supaya Fase 4A (rapor mahasiswa) punya data hidup.
 * Invarian: `pj_id` = pemegang KelasMatkul, `mahasiswa_id` anggota kelas
 * pemilik KelasMatkul tersebut.
 */
async function seedSamplePoinLog(): Promise<void> {
  const daftar = [
    {
      id: "pl_sample_001",
      kelas_matkul_id: KM_ALGO_TI01_ID,
      mahasiswa_id: "usr_siti",
      kategori_id: "kat_bertanya",
      poin: 3,
      catatan: "Bertanya soal kompleksitas waktu algoritma sorting.",
      created_at: daysAgo(2),
    },
    {
      id: "pl_sample_002",
      kelas_matkul_id: KM_PWEB_TI01_ID,
      mahasiswa_id: "usr_agus",
      kategori_id: "kat_presentasi",
      poin: 4,
      catatan: "Presentasi demo CRUD sederhana dengan Next.js.",
      created_at: daysAgo(1),
    },
  ];

  for (const log of daftar) {
    const hasil = await prisma.poinLog.upsert({
      where: { id: log.id },
      update: {},
      create: { ...log, pj_id: "usr_pj_budi" },
    });
    console.log(`  · PoinLog: ${hasil.id} — ${hasil.poin} poin`);
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("🌱 Seed Karsa dimulai...");

  console.log("\n[A] Data produksi");
  await seedKategoriPoin();
  await seedSemester();
  await promoteAdmin();

  if (SEED_TEST_DATA) {
    console.log("\n[B] Data uji (Dev Quick Login Fase 1)");
    await seedProdi();
    await seedMatkul();
    await seedKelas();
    await seedTestUsers();
    await seedKelasMatkul();
    await seedSamplePoinLog();
    console.log(
      "\n   ⚠️  Data uji dipakai HANYA untuk development. " +
        "Di produksi set SEED_TEST_DATA=\"false\".",
    );
  } else {
    console.log("\n[B] Data uji dilewati (SEED_TEST_DATA=false).");
  }

  console.log("\n✅ Seed selesai.");
}

main()
  .catch((error: unknown) => {
    // P2002 = unique constraint violation. Biasanya karena baris dengan nilai
    // unik yang sama sudah ada tapi id-nya berbeda (mis. prodi/matkul/kelas
    // dibuat lewat panel admin, atau user dibuat NextAuth saat login Google).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      console.error(
        "❌ Seed gagal: ada data dengan nilai unik yang sama tapi id berbeda.\n" +
          "   Hapus baris lama itu (atau sesuaikan id di prisma/seed.ts), lalu jalankan ulang.",
      );
    } else {
      console.error("❌ Seed gagal:", error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
