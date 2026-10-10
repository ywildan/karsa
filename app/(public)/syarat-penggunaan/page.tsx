import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection, LegalShell } from "../_components/legal-shell";

export const metadata: Metadata = {
  title: "Syarat Penggunaan",
  description: "Syarat penggunaan aplikasi Karsa untuk mahasiswa, PJ mata kuliah, penulis Karsa Lib, dan admin.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Syarat Penggunaan"
      summary="Aturan sederhana agar pencatatan poin, percakapan kelas, dan berbagi pengetahuan di Karsa tetap dapat dipercaya."
      active="terms"
    >
      <LegalSection title="1. Tentang Karsa dan akun">
        <p>Karsa adalah layanan pendukung kegiatan mahasiswa yang menyediakan pencatatan poin keaktifan, laporan, peringkat, grup kelas, dan Karsa Lib. Informasi di Karsa bukan pengganti dokumen akademik resmi universitas.</p>
        <p>Untuk masuk ke aplikasi mobile, gunakan akun Google mahasiswa UNTIDAR milikmu sendiri dengan alamat <strong>@students.untidar.ac.id</strong>. Akses ke fitur tertentu bergantung pada data kelas, penugasan PJ, program studi, dan izin penulis yang tercatat di sistem. Jangan meminjamkan akun atau mencoba memakai identitas orang lain.</p>
      </LegalSection>

      <LegalSection title="2. Poin, laporan, dan grup kelas">
        <p>PJ mata kuliah hanya boleh mencatat poin berdasarkan kegiatan yang benar-benar terjadi untuk kelas dan mata kuliah yang ditugaskan. Dilarang membuat catatan palsu, menggandakan poin, atau memanipulasi laporan dan peringkat.</p>
        <p>Grup dipakai untuk komunikasi yang relevan dengan kelas. Jangan mengirim spam, ancaman, pelecehan, data pribadi orang lain tanpa izin, atau materi yang melanggar hak pihak lain. Pesan dapat dilaporkan dan ditinjau oleh pengelola. Beberapa tindakan pada grup, termasuk penguncian, penyematan, dan moderasi, tersedia sesuai peran pengguna.</p>
      </LegalSection>

      <LegalSection title="3. Karsa Lib dan konten pengguna">
        <p>Artikel Karsa Lib ditampilkan kepada pengguna dari program studi yang sama dengan penulis saat artikel diterbitkan. Pengguna yang memperoleh akses penulis dapat membuat draf, menerbitkan, memperbarui, dan mengarsipkan artikel teks. Akses penulis diberikan atau dicabut oleh admin setelah peninjauan.</p>
        <p>Penulis bertanggung jawab atas keakuratan tulisan dan hak untuk membagikannya. Jangan memuat plagiarisme, ujaran kebencian, pelecehan, spam, atau informasi pribadi orang lain tanpa izin. Penulis tetap bertanggung jawab atas kontennya dan memberi Karsa izin untuk menyimpan serta menampilkannya selama konten tersedia di layanan.</p>
        <p>Pembaca dapat berkomentar dan membalas komentar sesuai fitur yang tersedia. Komentar tidak dapat diedit, tetapi dapat dihapus oleh pemiliknya. Artikel atau komentar dapat dilaporkan; laporan ditinjau oleh admin sebelum tindakan moderasi. Mengarsipkan artikel menghentikan tampilnya artikel di beranda program studi.</p>
        <p>Bila Teman baca AI tersedia, fitur ini membantu merangkum dan menjelaskan materi artikel. Jawaban AI dapat keliru dan tidak menjamin isi artikel benar. Periksa kembali artikel serta sumber belajar yang relevan. Pemakaian dibatasi dengan kuota harian; jangan mencoba mengakali pembatasan atau memasukkan data pribadi dan rahasia ke dalam pertanyaan.</p>
      </LegalSection>

      <LegalSection title="4. Moderasi dan pembatasan akses">
        <p>Pengelola dapat meninjau laporan, menghapus atau menyembunyikan konten yang melanggar ketentuan, mengarsipkan artikel, serta membatasi akses fitur ketika diperlukan untuk keamanan layanan. Kami berupaya menilai laporan secara wajar, tetapi keputusan moderasi dapat bergantung pada konteks yang tersedia.</p>
        <p>Jika kamu menemukan kesalahan data atau keberatan atas tindakan moderasi, hubungi pengelola melalui alamat kontak di bawah halaman ini dengan penjelasan yang relevan.</p>
      </LegalSection>

      <LegalSection title="5. Ketersediaan dan perubahan layanan">
        <p>Karsa dapat mengalami gangguan jaringan, pemeliharaan, atau perubahan fitur. Data dan tampilan dapat berubah ketika ada pembetulan atau pengembangan layanan. Kami akan memperbarui dokumen ini bila aturan penggunaan berubah secara penting dan menampilkan tanggal berlakunya.</p>
        <p>Informasi mengenai data yang diproses, pembagian akses, dan permintaan terkait data pribadi tersedia dalam <Link href="/kebijakan-privasi" className="font-semibold text-primary underline underline-offset-4">Kebijakan Privasi</Link>.</p>
      </LegalSection>
    </LegalShell>
  );
}
