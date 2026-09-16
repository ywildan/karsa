/**
 * Karsa — prisma/seed.ts
 * ----------------------------------------------------------------------------
 * Seed minimal sesuai PRD §5: 4 KategoriPoin + 1 Semester aktif.
 *
 * Jalankan:  npm run db:seed      (butuh DIRECT_URL di .env)
 *
 * Sifat:
 *  - Idempoten (upsert / updateMany) — aman dijalankan ulang.
 *  - Tidak membuat user palsu. Kalau `ADMIN_EMAIL` diisi dan user-nya
 *    sudah pernah login, user itu otomatis dipromosikan jadi admin.
 *
 * Override opsional lewat .env:
 *  SEED_SEMESTER_NAME, SEED_SEMESTER_START, SEED_SEMESTER_END, ADMIN_EMAIL
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Kategori poin tetap (PRD §3). Jangan tambah/hapus tanpa update PRD. */
const KATEGORI_POIN = ["Bertanya", "Menjawab", "Presentasi", "Lainnya"] as const;

const SEMESTER_NAME = process.env.SEED_SEMESTER_NAME?.trim() || "Ganjil 2026/2027";
const SEMESTER_START = process.env.SEED_SEMESTER_START?.trim() || "2026-09-01";
const SEMESTER_END = process.env.SEED_SEMESTER_END?.trim() || "2027-01-31";

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

  const semester = await prisma.semester.upsert({
    where: { name: SEMESTER_NAME },
    update: { start_date, end_date, is_active: true },
    create: { name: SEMESTER_NAME, start_date, end_date, is_active: true },
  });
  console.log(`  · Semester aktif: ${semester.name} (${semester.id})`);

  // PRD §9: hanya 1 semester aktif pada satu waktu.
  const dimatikan = await prisma.semester.updateMany({
    where: { name: { not: SEMESTER_NAME }, is_active: true },
    data: { is_active: false },
  });
  if (dimatikan.count > 0) {
    console.log(`  · ${dimatikan.count} semester lain dinonaktifkan (is_active = false).`);
  }
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

async function main(): Promise<void> {
  console.log("🌱 Seed Karsa dimulai...");
  await seedKategoriPoin();
  await seedSemester();
  await promoteAdmin();
  console.log("✅ Seed selesai.");
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
