/**
 * Karsa — components/marketing/sikarsa-sections.tsx
 * ----------------------------------------------------------------------------
 * Section isi untuk halaman produk `/product/sikarsa`. Struktur dan isi
 * diadaptasi dari landing SiKarsa, ditampilkan dengan design system
 * sikarsa.id (token warna, kartu, Inter) agar satu keluarga dengan
 * aplikasinya. Semua klaim bersifat struktural (cara produk bekerja),
 * bukan statistik pemakaian.
 */
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  EyeOff,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  MessageCircle,
  MessageSquare,
  NotebookPen,
  Presentation,
  ScrollText,
  Shapes,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

function Section({
  id,
  children,
  muted = false,
}: {
  id?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section id={id} className={muted ? "border-y border-border bg-muted/40" : undefined}>
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">{children}</div>
    </section>
  );
}

function SectionHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}

type CardItem = { icon: LucideIcon; title: string; description: string };

function CardGrid({ items, columns = "sm:grid-cols-3" }: { items: CardItem[]; columns?: string }) {
  return (
    <div className={`mt-8 grid gap-4 ${columns}`}>
      {items.map(({ icon: Icon, title, description }) => (
        <article key={title} className="rounded-3xl border border-border bg-card p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <h3 className="mt-4 font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </article>
      ))}
    </div>
  );
}

export function ProblemSection() {
  return (
    <Section>
      <SectionHeading
        label="Masalah"
        title="Poin keaktifan terlalu penting untuk dicatat seadanya"
        description="Di banyak kelas, poin keaktifan masih dicatat manual sambil perkuliahan berjalan. Hasilnya mudah tercecer dan baru terasa masalahnya di akhir semester."
      />
      <CardGrid
        items={[
          {
            icon: NotebookPen,
            title: "Tercatat di kertas atau chat",
            description:
              "Catatan tersebar dan mudah hilang. Saat dibutuhkan lagi, sulit memastikan siapa mencatat apa dan kapan.",
          },
          {
            icon: Calculator,
            title: "Rekap akhir semester merepotkan",
            description:
              "Menghitung ulang poin satu per satu dari catatan yang tidak rapi menyita waktu dan rawan salah hitung.",
          },
          {
            icon: EyeOff,
            title: "Mahasiswa tidak tahu posisinya",
            description:
              "Tanpa catatan yang bisa dilihat, mahasiswa baru mengetahui nilai keaktifannya setelah semuanya terlambat.",
          },
        ]}
      />
    </Section>
  );
}

const CATEGORIES = [
  { icon: HelpCircle, label: "Bertanya" },
  { icon: MessageSquare, label: "Menjawab" },
  { icon: Presentation, label: "Presentasi" },
  { icon: Shapes, label: "Lainnya" },
] as const;

export function IdeaSection() {
  return (
    <Section muted>
      <SectionHeading
        label="Idenya"
        title="Satu karsa, satu poin"
        description="Setiap kontribusi mahasiswa di kelas dicatat sebagai karsa. Satu karsa bernilai 1 sampai 4 poin mengikuti bobot kontribusinya, dan selalu terikat pada mata kuliah serta kelas tempat kontribusi itu terjadi."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-3xl border border-border bg-card p-5"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">Kategori keaktifan</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  {
    icon: Smartphone,
    title: "PJ mencatat dari HP",
    description:
      "Penanggung jawab kelas membuka aplikasi, memilih kelas dan mata kuliah, memilih mahasiswa, lalu menentukan kategori dan nilai karsanya.",
  },
  {
    icon: Zap,
    title: "Poin tersimpan seketika",
    description:
      "Tidak ada berkas terpisah dan tidak ada rekap ulang. Setiap catatan tersimpan lengkap dengan waktu dan siapa yang mencatatnya.",
  },
  {
    icon: TrendingUp,
    title: "Mahasiswa memantau live",
    description:
      "Mahasiswa membuka rapor poin per mata kuliah kapan pun dan melihat posisinya saat itu juga, bukan menunggu akhir semester.",
  },
] as const;

export function StepsSection() {
  return (
    <Section>
      <SectionHeading
        label="Cara Kerja"
        title="Tiga langkah, tanpa kertas"
        description="Alurnya sengaja pendek supaya mencatat poin tidak mengganggu jalannya perkuliahan."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <article key={title} className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function FeaturesSection() {
  return (
    <Section muted>
      <SectionHeading
        label="Fitur"
        title="Lengkap untuk satu siklus kelas"
        description="Dari pencatatan di kelas sampai rekap akhir, semuanya berada di satu tempat dengan akun yang sama."
      />
      <CardGrid
        columns="sm:grid-cols-2 lg:grid-cols-3"
        items={[
          {
            icon: Smartphone,
            title: "Catat poin dari HP",
            description:
              "Aplikasi Android SiKarsa dirancang untuk PJ: cepat dibuka di kelas dan poin tercatat dalam beberapa ketukan.",
          },
          {
            icon: Zap,
            title: "Rapor live mahasiswa",
            description:
              "Setiap mahasiswa melihat poin per mata kuliah secara langsung, lengkap dengan riwayat catatannya.",
          },
          {
            icon: FileSpreadsheet,
            title: "Rekap & ekspor",
            description:
              "Admin dan pengelola merekap poin per kelas atau mata kuliah dan mengekspornya tanpa menghitung manual.",
          },
          {
            icon: MessageCircle,
            title: "Grup chat kelas",
            description:
              "Setiap kelas punya ruang diskusinya sendiri di aplikasi, dengan moderasi oleh PJ kelas.",
          },
          {
            icon: BookOpen,
            title: "Karsa Lib & Teman Baca",
            description:
              "Rak bacaan bersama se-program studi, dilengkapi Teman Baca, pendamping AI yang meringkas artikel dan menjawab pertanyaan dari isinya.",
          },
          {
            icon: ScrollText,
            title: "Jejak audit",
            description:
              "Setiap perubahan penting tercatat dalam log audit, sehingga riwayat sebuah poin selalu bisa ditelusuri.",
          },
        ]}
      />
    </Section>
  );
}

const FACTS = [
  { value: "1–4", label: "Nilai poin untuk setiap karsa" },
  { value: "4", label: "Kategori keaktifan tetap" },
  { value: "2", label: "Platform: web dan Android" },
  { value: "1", label: "Akun Google UNTIDAR untuk semua akses" },
] as const;

export function FactsSection() {
  return (
    <Section>
      <SectionHeading label="Fakta" title="Sederhana aturannya, jelas datanya" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {FACTS.map((fact) => (
          <div key={fact.label} className="rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-4xl font-semibold tracking-tight text-primary">{fact.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{fact.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function SecuritySection() {
  return (
    <Section muted>
      <SectionHeading
        label="Keamanan"
        title="Hanya untuk lingkungan UNTIDAR"
        description="SiKarsa bukan aplikasi publik. Aksesnya dibatasi sejak dari pintu masuknya."
      />
      <CardGrid
        items={[
          {
            icon: KeyRound,
            title: "Login Google domain UNTIDAR",
            description:
              "Masuk hanya dengan akun resmi @students.untidar.ac.id atau @untidar.ac.id. Akun di luar domain itu ditolak.",
          },
          {
            icon: Users,
            title: "Hak akses sesuai peran",
            description:
              "Admin, pengelola, PJ, dan mahasiswa masing-masing hanya melihat dan mengubah data dalam lingkup tugasnya.",
          },
          {
            icon: ShieldCheck,
            title: "Tercatat dan tertelusur",
            description:
              "Perubahan penting menulis jejak audit dalam transaksi yang sama, sehingga tidak ada perubahan yang senyap.",
          },
        ]}
      />
    </Section>
  );
}

const LIVE_ITEMS = [
  "Pencatatan poin web & Android",
  "Rapor mahasiswa live",
  "Rekap & ekspor poin",
  "Grup chat kelas",
  "Karsa Lib & Teman Baca AI",
  "Dashboard langganan AI",
] as const;

export function RoadmapSection() {
  return (
    <Section>
      <SectionHeading
        label="Perjalanan"
        title="Sudah berjalan, terus bertumbuh"
        description="SiKarsa dipakai dalam lingkungan UNTIDAR sebagai pilot terkendali, dan dikembangkan bertahap dari umpan balik penggunanya."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
            Sudah live
          </h3>
          <ul className="mt-4 space-y-2.5">
            {LIVE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-dashed border-border p-6">
          <h3 className="flex items-center gap-2 font-semibold text-muted-foreground">
            <Wrench className="h-5 w-5" aria-hidden />
            Berikutnya
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Penyempurnaan dari umpan balik pilot, lalu produk Karsa berikutnya
            yang akan tinggal di domain ini juga, pada alamat{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/product/</code> yang sama,
            dengan satu akun untuk semua produk.
          </p>
        </article>
      </div>
    </Section>
  );
}
