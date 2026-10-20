/**
 * Karsa — lib/permohonan.ts
 * ----------------------------------------------------------------------------
 * Kontrak kecil untuk permohonan materi: status, label, dan tipe baris yang
 * dipakai UI.
 *
 * Sengaja terpisah dari `actions/permohonan.ts` karena berkas action ber-"
 * use server" hanya boleh mengekspor fungsi async — konstanta dan tipe harus
 * tinggal di modul biasa.
 */

export const STATUS_PERMOHONAN = ["MENUNGGU", "DISETUJUI", "DITOLAK"] as const;

export type StatusPermohonan = (typeof STATUS_PERMOHONAN)[number];

export const LABEL_STATUS_PERMOHONAN: Record<StatusPermohonan, string> = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
};

/** Baris permohonan seperti yang dikirim server ke komponen klien. */
export type PermohonanAdmin = {
  id: string;
  nama: string;
  email: string;
  fakultas: string | null;
  prodi: string | null;
  matkul: string;
  jenis: string;
  pertemuan: string | null;
  ringkasan: string;
  tautan: string | null;
  izin: boolean;
  status: StatusPermohonan;
  catatan: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export function formatTanggalPermohonan(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
