/**
 * Karsa — lib/prisma.ts
 * ----------------------------------------------------------------------------
 * Prisma Client singleton.
 *
 * Kenapa singleton?
 *   Next.js dev mode melakukan hot-reload. Kalau setiap reload membuat
 *   `new PrismaClient()`, koneksi ke Postgres/Supabase akan menumpuk dan
 *   akhirnya kena limit. Instance disimpan di `globalThis` supaya dipakai ulang.
 *
 * Pemakaian:
 *   import { prisma } from "@/lib/prisma";
 *   const semester = await prisma.semester.findFirst({ where: { is_active: true } });
 *
 * Catatan: Prisma Client dihasilkan oleh `npx prisma generate`
 * (`@prisma/client`). Perintah itu di-skip di sandbox; jalankan di lokal
 * setelah `npm install`.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
