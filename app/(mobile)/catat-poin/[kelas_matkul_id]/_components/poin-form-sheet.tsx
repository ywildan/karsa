/**
 * Karsa — app/(mobile)/catat-poin/[kelas_matkul_id]/_components/poin-form-sheet.tsx
 * ----------------------------------------------------------------------------
 * Bottom sheet input poin (Fase 3A, PRD §10.1):
 *   · header = nama mahasiswa
 *   · segmented control kategori (dari tabel `KategoriPoin`)
 *   · tombol besar 1–4 untuk nilai poin
 *   · catatan collapsible (opsional, maks 500 karakter)
 *   · tombol Simpan besar di bawah
 *
 * Submit lewat Server Action `createPoinLog()` — SEMUA validasi ada di server;
 * komponen ini hanya UX. Sukses → haptic 10ms + toast Sonner + sheet tertutup +
 * `router.refresh()` supaya list & revalidatePath dari server terbaca ulang.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { createPoinLog } from "@/actions/poin";
import { Button } from "@/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATATAN_MAX,
  POIN_OPTIONS,
  mahasiswaLabel,
  type KategoriItem,
  type MahasiswaItem,
} from "@/lib/poin";
import { cn } from "@/lib/utils";

/**
 * Haptic feedback (PRD §10.1). `navigator.vibrate` tidak ada di iOS Safari,
 * jadi feature-detect + try/catch — kegagalan bergetar tidak boleh membatalkan
 * pencatatan yang sudah sukses di server.
 */
function hapticSukses(): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  } catch {
    // Diabaikan sengaja: getaran hanya pemanis.
  }
}

export function PoinFormSheet({
  kelasMatkulId,
  mahasiswa,
  kategori,
  open,
  onOpenChange,
}: {
  kelasMatkulId: string;
  mahasiswa: MahasiswaItem | null;
  kategori: KategoriItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [kategoriId, setKategoriId] = React.useState("");
  const [poin, setPoin] = React.useState<number | null>(null);
  const [catatan, setCatatan] = React.useState("");
  const [catatanOpen, setCatatanOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const kategoriPertama = kategori[0]?.id ?? "";

  // Form selalu mulai bersih setiap sheet dibuka (state lama tidak terbawa).
  React.useEffect(() => {
    if (!open) return;
    setKategoriId(kategoriPertama);
    setPoin(null);
    setCatatan("");
    setCatatanOpen(false);
  }, [open, kategoriPertama]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mahasiswa) return;

    if (!kategoriId) {
      toast.error("Pilih kategori poin dulu.");
      return;
    }
    if (poin === null) {
      toast.error("Pilih nilai poin 1–4 dulu.");
      return;
    }

    const payload = {
      kelas_matkul_id: kelasMatkulId,
      mahasiswa_id: mahasiswa.id,
      kategori_id: kategoriId,
      poin,
      catatan: catatan.trim(),
    };

    startTransition(async () => {
      const result = await createPoinLog(payload);
      if (result.ok) {
        hapticSukses();
        toast.success(result.message ?? "Poin tercatat.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!mahasiswa) return null;

  const nama = mahasiswaLabel(mahasiswa);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DrawerHeader>
            <DrawerTitle>{nama}</DrawerTitle>
            <DrawerDescription>
              {mahasiswa.nim ? `NIM ${mahasiswa.nim} · ` : ""}
              catat satu poin keaktifan.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-2">
            {/* --- Kategori: segmented control (PRD §10.1) --- */}
            <div className="grid gap-2">
              <Label id="poin-kategori-label">Kategori</Label>
              <div
                role="radiogroup"
                aria-labelledby="poin-kategori-label"
                className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted p-1"
              >
                {kategori.map((item) => {
                  const aktif = item.id === kategoriId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      onClick={() => setKategoriId(item.id)}
                      className={cn(
                        "min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        aktif
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-background hover:text-foreground",
                      )}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- Nilai poin: tombol besar 1–4 (PRD §8) --- */}
            <div className="grid gap-2">
              <Label id="poin-nilai-label">Poin</Label>
              <div
                role="radiogroup"
                aria-labelledby="poin-nilai-label"
                className="grid grid-cols-4 gap-2"
              >
                {POIN_OPTIONS.map((nilai) => {
                  const aktif = nilai === poin;
                  return (
                    <button
                      key={nilai}
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      aria-label={`${nilai} poin`}
                      onClick={() => setPoin(nilai)}
                      className={cn(
                        "h-14 rounded-lg border text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        aktif
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-accent",
                      )}
                    >
                      {nilai}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* --- Catatan: collapsible + opsional --- */}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setCatatanOpen((value) => !value)}
                aria-expanded={catatanOpen}
                aria-controls="poin-catatan"
                className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary"
              >
                {catatanOpen ? (
                  <ChevronUp aria-hidden className="size-4" />
                ) : (
                  <ChevronDown aria-hidden className="size-4" />
                )}
                {catatanOpen ? "Sembunyikan catatan" : "Tambah catatan"}
                <span className="text-muted-foreground">(opsional)</span>
              </button>

              {catatanOpen ? (
                <div id="poin-catatan" className="grid gap-1.5">
                  <Textarea
                    value={catatan}
                    onChange={(event) =>
                      setCatatan(event.target.value.slice(0, CATATAN_MAX))
                    }
                    placeholder="Mis. bertanya soal kompleksitas algoritma sorting."
                    maxLength={CATATAN_MAX}
                    rows={3}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {catatan.length}/{CATATAN_MAX}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending || poin === null || kategoriId.length === 0}
            >
              {pending ? "Menyimpan..." : "Simpan poin"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
