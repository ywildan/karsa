"use client";

import * as React from "react";

import { assignPengelola } from "@/actions/pengelola";
import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function PengelolaAssignForm({
  prodis,
  kelasOptions,
  activeSemesterName,
}: {
  prodis: { id: string; name: string }[];
  kelasOptions: { id: string; name: string; prodi_name: string; semester_name: string }[];
  activeSemesterName: string | null;
}) {
  const [scopeType, setScopeType] = React.useState<"PRODI" | "KELAS">("PRODI");

  return (
    <form action={assignPengelola} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengelola-email">Email calon pengelola</Label>
        <Input
          id="pengelola-email"
          name="email"
          type="email"
          required
          placeholder="nama@untidar.ac.id"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Boleh belum pernah login — penunjukan tersimpan sebagai PENDING dan
          aktif otomatis saat login Google pertamanya.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengelola-scope">Lingkup penunjukan</Label>
        <Select
          id="pengelola-scope"
          name="scope_type"
          value={scopeType}
          onValueChange={(value) => setScopeType(value as "PRODI" | "KELAS")}
        >
          <option value="PRODI">Satu prodi (semua kelasnya)</option>
          <option value="KELAS">Satu kelas</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          Berlaku untuk semester aktif{activeSemesterName ? ` (${activeSemesterName})` : ""} dan
          berhenti saat semester berganti.
        </p>
      </div>

      {scopeType === "PRODI" ? (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="pengelola-prodi">Prodi</Label>
          <Select id="pengelola-prodi" name="prodi_id" required defaultValue="">
            <option value="" disabled>
              Pilih prodi…
            </option>
            {prodis.map((prodi) => (
              <option key={prodi.id} value={prodi.id}>
                {prodi.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="pengelola-kelas">Kelas</Label>
          <Select id="pengelola-kelas" name="kelas_id" required defaultValue="">
            <option value="" disabled>
              Pilih kelas…
            </option>
            {kelasOptions.map((kelas) => (
              <option key={kelas.id} value={kelas.id}>
                {kelas.name} · {kelas.prodi_name} · {kelas.semester_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit">Tunjuk pengelola</Button>
      </div>
    </form>
  );
}
