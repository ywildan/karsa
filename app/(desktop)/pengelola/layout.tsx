import { PengelolaNav } from "@/components/pengelola-nav";
import { requirePengelola } from "@/lib/auth-helpers";

export default async function PengelolaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Guard server lapis kedua setelah middleware: hanya admin penuh atau
  // pemegang penunjukan pengelola aktif yang boleh membuka area ini.
  await requirePengelola();

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      <PengelolaNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
