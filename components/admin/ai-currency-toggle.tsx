"use client";

import { useRouter } from "next/navigation";

import { AI_CURRENCY_COOKIE, type AiCurrency } from "@/lib/karsa-lib/ai-usage";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AiCurrency; label: string }[] = [
  { value: "usd", label: "USD" },
  { value: "idr", label: "IDR" },
];

/**
 * Toggle mata uang tampilan biaya AI (USD/IDR). Pilihan disimpan di cookie
 * `karsa_ai_currency` (pola yang sama dengan cookie tema), lalu halaman
 * di-refresh agar komponen server (kartu beranda admin) ikut berubah.
 * Data biaya sendiri selalu tersimpan dalam USD; ini murni tampilan.
 */
export function AiCurrencyToggle({
  value,
  onChange,
}: {
  value: AiCurrency;
  onChange?: (currency: AiCurrency) => void;
}) {
  const router = useRouter();

  function select(currency: AiCurrency) {
    if (currency === value) return;
    document.cookie = `${AI_CURRENCY_COOKIE}=${currency}; path=/; max-age=31536000; samesite=lax`;
    onChange?.(currency);
    router.refresh();
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-border bg-card p-0.5"
      role="group"
      aria-label="Mata uang tampilan biaya"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => select(option.value)}
          className={cn(
            "min-h-7 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
