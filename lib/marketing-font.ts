/**
 * Karsa — lib/marketing-font.ts
 * ----------------------------------------------------------------------------
 * Font display serif (Instrument Serif) khusus headline halaman
 * marketing (hub brand + halaman produk), meniru pasangan serif-sans
 * khas halaman produk modern. Body dan seluruh aplikasi tetap Inter;
 * font ini hanya dimuat oleh halaman yang mengimpornya.
 */
import { Instrument_Serif } from "next/font/google";

export const marketingSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});
