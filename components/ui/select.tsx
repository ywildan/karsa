/**
 * Karsa — components/ui/select.tsx
 * ----------------------------------------------------------------------------
 * Select bergaya shadcn/ui di atas <select> native (Fase 2B). Tanpa dependency
 * baru — cukup untuk dropdown prodi & semester di form kelas. API meniru
 * komponen `Select` shadcn: `value` + `onValueChange`, opsi sebagai anak
 * (`<option>`).
 */
"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Nilai terpilih (controlled). */
  value?: string;
  /** Dipanggil saat pilihan berubah dengan `event.target.value`. */
  onValueChange?: (value: string) => void;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => (
    <select
      ref={ref}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
