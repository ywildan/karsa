/**
 * Karsa — lib/karsa-lib/ai-usage.ts
 * ----------------------------------------------------------------------------
 * Fungsi murni untuk analitik usage Teman Baca: parsing harga USD, estimasi
 * biaya dalam nano-USD (agar biaya gateway yang sangat kecil tidak hilang
 * karena pembulatan), dan format tampilan dashboard admin.
 *
 * Harga selalu berarti USD per 1 juta token. Nano-USD dipakai sebagai
 * integer (BigInt) supaya penjumlahan banyak request tetap eksak:
 * 1 USD = 1.000.000.000 nano-USD.
 */

export const NANO_USD_PER_USD = BigInt(1000000000);
const TOKENS_PER_PRICE_UNIT = BigInt(1000000);

/**
 * Parse harga desimal USD menjadi nano-USD per 1 juta token.
 * Mengembalikan null bila kosong/tidak valid. Maksimal 9 angka desimal
 * supaya nilai yang disimpan tetap eksak.
 */
export function parseAiPriceToNano(value: string | undefined | null): bigint | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,9})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const nano = BigInt(whole) * NANO_USD_PER_USD + BigInt(fraction.padEnd(9, "0"));
  return nano >= BigInt(0) ? nano : null;
}

/** Estimasi biaya satu request; null bila token atau harga belum diketahui. */
export function estimateAiCostNanoUsd(input: {
  promptTokens: number | null | undefined;
  completionTokens: number | null | undefined;
  inputPriceNanoPerMillion: bigint | null | undefined;
  outputPriceNanoPerMillion: bigint | null | undefined;
}): bigint | null {
  const { promptTokens, completionTokens, inputPriceNanoPerMillion, outputPriceNanoPerMillion } = input;
  if (
    promptTokens == null || completionTokens == null ||
    inputPriceNanoPerMillion == null || outputPriceNanoPerMillion == null ||
    !Number.isSafeInteger(promptTokens) || !Number.isSafeInteger(completionTokens) ||
    promptTokens < 0 || completionTokens < 0
  ) {
    return null;
  }
  const numerator =
    BigInt(promptTokens) * inputPriceNanoPerMillion +
    BigInt(completionTokens) * outputPriceNanoPerMillion;
  // Bagi per 1 juta token dengan pembulatan setengah ke atas.
  return (numerator + TOKENS_PER_PRICE_UNIT / BigInt(2)) / TOKENS_PER_PRICE_UNIT;
}

/** Format nano-USD untuk dashboard; nilai sangat kecil tetap terlihat. */
export function formatNanoUsd(nano: bigint | number | null | undefined): string {
  if (nano == null) return "—";
  const value = typeof nano === "bigint" ? nano : BigInt(Math.trunc(nano));
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / NANO_USD_PER_USD;
  const fraction = absolute % NANO_USD_PER_USD;

  let rendered: string;
  if (whole > BigInt(0) || fraction === BigInt(0)) {
    const decimals = (fraction.toString().padStart(9, "0").slice(0, 4)).replace(/0+$/, "");
    rendered = decimals ? `${whole.toString()}.${decimals}` : whole.toString();
  } else if (absolute >= BigInt(1000)) {
    // $0,000001-$0,999999: tampilkan sampai 6 desimal agar tidak menjadi $0.
    const decimals = fraction.toString().padStart(9, "0").slice(0, 6).replace(/0+$/, "");
    rendered = `0.${decimals || "0"}`;
  } else if (absolute > BigInt(0)) {
    return `${negative ? "-" : ""}<$0.000001`;
  } else {
    rendered = "0";
  }
  return `${negative ? "-" : ""}$${rendered}`;
}

/** Persentase request selesai dari seluruh request tercatat. */
export function aiSuccessRate(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Tampilan mata uang dashboard. Data biaya SELALU disimpan dalam nano-USD;
// IDR hanyalah konversi tampilan memakai kurs yang sedang terpasang, jadi
// mengganti kurs tidak mengubah data historis USD-nya.
// ---------------------------------------------------------------------------

export type AiCurrency = "usd" | "idr";

/** Cookie pilihan mata uang, mengikuti pola cookie tema `karsa_theme`. */
export const AI_CURRENCY_COOKIE = "karsa_ai_currency";

/** Kurs bawaan bila env `AI_USD_IDR_RATE` belum diisi (rupiah per 1 USD). */
export const DEFAULT_USD_IDR_RATE = 17900;

export function parseAiCurrency(value: string | undefined | null): AiCurrency {
  return value === "idr" ? "idr" : "usd";
}

/** Parse kurs dari env; null bila kosong/tidak valid. */
export function parseUsdIdrRate(value: string | undefined | null): number | null {
  if (value == null) return null;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) return null;
  return parsed;
}

/** Kurs efektif: env `AI_USD_IDR_RATE` menang, selain itu kurs bawaan. */
export function aiUsdIdrRate(env: Record<string, string | undefined> = process.env): number {
  return parseUsdIdrRate(env.AI_USD_IDR_RATE) ?? DEFAULT_USD_IDR_RATE;
}

/** Format nano-USD sebagai rupiah memakai kurs tampilan yang diberikan. */
export function formatNanoIdr(nano: bigint | number | null | undefined, rate: number): string {
  if (nano == null) return "—";
  const value = typeof nano === "bigint" ? Number(nano) : nano;
  const idr = (value / 1_000_000_000) * rate;
  if (idr === 0) return "Rp0";
  if (idr < 1) return "<Rp1";
  if (idr < 1000) {
    return `Rp${idr.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
  }
  return `Rp${idr.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

/** Format biaya sesuai mata uang tampilan terpilih. */
export function formatAiCost(
  nano: bigint | number | null | undefined,
  currency: AiCurrency,
  usdIdrRate: number,
): string {
  return currency === "idr" ? formatNanoIdr(nano, usdIdrRate) : formatNanoUsd(nano);
}
