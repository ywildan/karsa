/**
 * Karsa — components/rapor/poin-detail-popup.tsx
 * ----------------------------------------------------------------------------
 * Dialog detail riwayat poin satu matkul (Fase 4A). Radix Dialog mengelola
 * focus trap, Esc, klik backdrop, dan body scroll lock; Framer Motion hanya
 * menangani transisi backdrop serta panel.
 */
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import type { RaporPoinItem } from "@/lib/rapor";
import { formatDateTimeShortWib, formatNumber } from "@/lib/utils";

export function PoinDetailPopup({
  open,
  onOpenChange,
  kelasMatkulId,
  matkulName,
  totalPoin,
  riwayat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kelasMatkulId: string;
  matkulName: string;
  totalPoin: number;
  riwayat: RaporPoinItem[];
}) {
  const descriptionId = `poin-detail-description-${kelasMatkulId}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <React.Fragment key="poin-detail-popup">
              <DialogPrimitive.Overlay forceMount asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </DialogPrimitive.Overlay>

              <DialogPrimitive.Content forceMount asChild>
                <motion.section
                  className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card shadow-lg focus:outline-none"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  aria-describedby={descriptionId}
                >
                  <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-6">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Detail riwayat poin
                      </p>
                      <DialogPrimitive.Title className="mt-1 truncate text-xl font-semibold tracking-tight">
                        {matkulName}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description
                        id={descriptionId}
                        className="mt-1 text-sm text-muted-foreground"
                      >
                        Total {formatNumber(totalPoin)} poin pada matkul ini.
                      </DialogPrimitive.Description>
                    </div>

                    <DialogPrimitive.Close asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Tutup detail riwayat poin"
                      >
                        <X aria-hidden />
                      </Button>
                    </DialogPrimitive.Close>
                  </header>

                  <div className="min-h-0 overflow-y-auto p-6">
                    {riwayat.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                        Belum ada poin.
                      </p>
                    ) : (
                      <ol className="ml-2 border-l border-border pl-6">
                        {riwayat.map((poin, index) => {
                          const namaPj =
                            poin.pj.name?.trim() || "PJ tidak diketahui";

                          return (
                            <li
                              key={poin.id}
                              className={
                                index === 0 ? "relative pb-6" : "relative py-6"
                              }
                            >
                              <span
                                aria-hidden
                                className="absolute -left-[1.82rem] top-1 size-3 rounded-full border-2 border-card bg-primary"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {poin.kategori.name}
                                </Badge>
                                <span className="font-semibold">
                                  +{formatNumber(poin.poin)} poin
                                </span>
                              </div>
                              <time
                                dateTime={new Date(
                                  poin.created_at,
                                ).toISOString()}
                                className="mt-2 block text-xs text-muted-foreground"
                              >
                                {formatDateTimeShortWib(poin.created_at)}
                              </time>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Dicatat oleh {namaPj}
                              </p>
                              {poin.catatan ? (
                                <p className="mt-3 text-sm text-muted-foreground">
                                  {poin.catatan}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </motion.section>
              </DialogPrimitive.Content>
            </React.Fragment>
          ) : null}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
