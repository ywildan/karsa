/**
 * Karsa — app/(mobile)/poin-saya/page.tsx
 * ----------------------------------------------------------------------------
 * Rute lama tab "Poin Saya" dialihkan ke hub aktivitas PJ.
 */
import { redirect } from "next/navigation";

export default function PoinSayaPage() {
  redirect("/aktivitas");
}
