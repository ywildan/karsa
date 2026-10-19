/**
 * Karsa — components/marketing/sikarsa-sections.tsx
 * ----------------------------------------------------------------------------
 * Section isi untuk halaman produk `/product/sikarsa`. Struktur dan isi
 * diadaptasi dari landing SiKarsa, ditampilkan dengan design system
 * sikarsa.id (token warna, Inter untuk isi, serif display khusus
 * headline) agar satu keluarga dengan aplikasinya. Ritme section
 * divariasikan: pernyataan, daftar kapabilitas bernomor, kartu peran,
 * band fakta, dan FAQ. Semua klaim bersifat struktural (cara produk
 * bekerja), bukan statistik pemakaian.
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

import { marketingSerif } from "@/lib/marketing-font";
import { cn } from "@/lib/utils";

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
    <section id={id} className={cn("scroll-mt-24", muted && "border-y border-border bg-muted/40")}>
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">{children}</div>
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
      <h2 className={cn(marketingSerif.className, "mt-3 text-4xl leading-tight sm:text-[2.75rem]")}>
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

type CardItem = { icon: LucideIcon; title: string; description: string };

function CardGrid({ items, columns = "sm:grid-cols-3" }: { items: CardItem[]; columns?: string }) {
  return (
    <div className={`mt-10 grid gap-4 ${columns}`}>
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
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <Section id="cara-kerja">
      <SectionHeading
        label="Cara Kerja"
        title="Tiga langkah, tanpa kertas"
        description="Alurnya sengaja pendek supaya mencatat poin tidak mengganggu jalannya perkuliahan."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
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

const CAPABILITIES = [
  {
    title: "Mencatat tanpa mengganggu kuliah",
    description:
      "Form catat poin dirancang untuk beberapa ketukan saja: kelas, mahasiswa, kategori, nilai. PJ bisa kembali memperhatikan kelas dalam hitungan detik.",
  },
  {
    title: "Transparan untuk semua pihak",
    description:
      "PJ, mahasiswa, pengelola, dan admin melihat data yang sama dari sumber yang sama. Tidak ada versi catatan yang berbeda-beda di tangan yang berbeda.",
  },
  {
    title: "Rekap tanpa kerja dua kali",
    description:
      "Karena setiap poin tercatat sejak awal, rekap per kelas dan per mata kuliah tinggal dibaca dan diekspor, bukan dihitung ulang dari nol.",
  },
] as const;

export function CapabilitiesSection() {
  return (
    <Section muted>
      <SectionHeading
        label="Kapabilitas"
        title="Dibangun untuk ritme kelas yang sebenarnya"
      />
      <div className="mt-6 divide-y divide-border border-y border-border">
        {CAPABILITIES.map((capability, index) => (
          <div key={capability.title} className="grid gap-2 py-7 sm:grid-cols-[64px_1fr_1.6fr] sm:gap-6">
            <span className={cn(marketingSerif.className, "text-3xl text-primary")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-semibold">{capability.title}</h3>
            <p className="leading-relaxed text-muted-foreground">{capability.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function AudienceSection() {
  return (
    <Section>
      <SectionHeading
        label="Untuk Siapa"
        title="Satu produk, peran yang berbeda"
        description="Setiap peran masuk dengan akun yang sama, tetapi melihat dan mengerjakan hal yang sesuai dengan tugasnya."
      />
      <CardGrid
        items={[
          {
            icon: Smartphone,
            title: "PJ Kelas",
            description:
              "Mencatat poin dari aplikasi Android di kelas, memoderasi grup chat kelasnya, dan memastikan tidak ada kontribusi yang terlewat.",
          },
          {
            icon: TrendingUp,
            title: "Mahasiswa",
            description:
              "Memantau rapor poin per mata kuliah secara live lewat web atau aplikasi, membaca materi Karsa Lib, dan bertanya ke Teman Baca.",
          },
          {
            icon: Users,
            title: "Admin & Pengelola",
            description:
              "Mengelola kelas, mata kuliah, dan penunjukan PJ dari web, merekap serta mengekspor poin, dan menelusuri jejak audit bila ada yang dipertanyakan.",
          },
        ]}
      />
    </Section>
  );
}

export function FeaturesSection() {
  return (
    <Section id="fitur" muted>
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
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="text-center">
              <p className={cn(marketingSerif.className, "text-5xl sm:text-6xl")}>{fact.value}</p>
              <p className="mt-2 text-sm text-primary-foreground/85">{fact.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SecuritySection() {
  return (
    <Section id="keamanan">
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
    <Section muted>
      <SectionHeading
        label="Perjalanan"
        title="Sudah berjalan, terus bertumbuh"
        description="SiKarsa dipakai dalam lingkungan UNTIDAR sebagai pilot terkendali, dan dikembangkan bertahap dari umpan balik penggunanya."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
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

const FAQS = [
  {
    question: "Siapa saja yang bisa memakai SiKarsa?",
    answer:
      "Sivitas akademika Universitas Tidar: mahasiswa, penanggung jawab kelas (PJ), pengelola, dan admin. Masuk memakai akun Google resmi berdomain @students.untidar.ac.id atau @untidar.ac.id; akun di luar domain itu tidak bisa masuk.",
  },
  {
    question: "Bagaimana cara PJ mencatat poin?",
    answer:
      "PJ masuk ke aplikasi Android SiKarsa dengan akunnya, memilih kelas dan mata kuliah yang ia ampu, memilih mahasiswa, lalu menentukan kategori keaktifan dan nilai karsanya. Poin tersimpan seketika dan langsung terlihat di rapor mahasiswa.",
  },
  {
    question: "Apakah poin yang sudah tercatat bisa dikoreksi?",
    answer:
      "Bisa, melalui peran yang berwenang sesuai alur koreksi yang tersedia. Setiap perubahan, termasuk koreksi, menulis jejak audit sehingga riwayat sebuah poin selalu bisa ditelusuri siapa mengubah apa dan kapan.",
  },
  {
    question: "Apakah mahasiswa wajib memasang aplikasi Android?",
    answer:
      "Tidak wajib. Rapor poin bisa dibuka lewat web dengan akun yang sama. Aplikasi Android memberi pengalaman penuh di HP, termasuk grup chat kelas dan Karsa Lib, sedangkan pencatatan poin oleh PJ memang dilakukan dari aplikasi.",
  },
  {
    question: "Apa itu Teman Baca, dan apakah SiKarsa berbayar?",
    answer:
      "Teman Baca adalah pendamping baca AI di dalam Karsa Lib yang dapat meringkas artikel dan menjawab pertanyaan berdasarkan isi artikelnya, dengan kuota pemakaian per tier yang diatur admin. SiKarsa sendiri gratis untuk sivitas UNTIDAR dan tidak memiliki pembelian di dalam aplikasi.",
  },
] as const;

export function FaqSection() {
  return (
    <Section id="faq">
      <SectionHeading label="FAQ" title="Pertanyaan yang sering muncul" />
      <div className="mt-8 divide-y divide-border border-y border-border">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium marker:hidden [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span
                aria-hidden
                className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-6 leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
