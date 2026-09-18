/**
 * Karsa — lib/leaderboard.ts
 * ----------------------------------------------------------------------------
 * Kontrak dan utilitas murni leaderboard. Modul ini tidak bergantung pada
 * Prisma atau Next.js, sehingga ranking dan masking dapat diuji terpisah.
 */

/** Satu baris ranking leaderboard matkul. */
export interface LeaderboardRow {
  rank: number;
  userId: string;
  nama: string;
  nim: string | null;
  totalPoin: number;
  isCurrentUser: boolean;
}

/** Data baris sebelum dense rank dihitung. */
export type UnrankedLeaderboardRow = Omit<LeaderboardRow, "rank">;

/** NIM mahasiswa lain ditutup penuh dengan panjang tetap agar tidak bisa dipakai mengenali pemilik baris. */
export function maskNim(nim: string | null): string | null {
  return nim ? "••••••••" : null;
}

/**
 * Sembunyikan nama mahasiswa: dua karakter alfanumerik awal tiap kata tetap
 * terlihat, sedangkan seluruh karakter setelahnya menjadi `x`.
 *
 * Contoh:
 * - "Rizki Dermawan" → "Rixxx Dexxxxxx"
 * - "Budi" → "Buxx"
 * - "Rizki D." → "Rixxx Dx"
 */
export function maskName(nama: string | null): string {
  const namaTrimmed = nama?.trim();
  if (!namaTrimmed) return "Tanpa Nama";

  return namaTrimmed
    .split(/\s+/)
    .map((kata) => {
      const karakter = Array.from(kata);
      let jumlahTerlihat = 0;

      return karakter
        .map((huruf) => {
          if (jumlahTerlihat < 2 && /[\p{L}\p{N}]/u.test(huruf)) {
            jumlahTerlihat += 1;
            return huruf;
          }

          return "x";
        })
        .join("");
    })
    .join(" ");
}

/**
 * Terapkan dense rank pada baris yang sudah terurut menurun berdasarkan
 * `totalPoin`: 1, 1, 2, 3, 3 (bukan competition rank 1, 1, 3, 4, 4).
 */
export function denseRank(
  rows: readonly UnrankedLeaderboardRow[],
): LeaderboardRow[] {
  let rank = 0;
  let totalPoinSebelumnya: number | null = null;

  return rows.map((row) => {
    if (totalPoinSebelumnya !== row.totalPoin) {
      rank += 1;
      totalPoinSebelumnya = row.totalPoin;
    }

    return { ...row, rank };
  });
}
