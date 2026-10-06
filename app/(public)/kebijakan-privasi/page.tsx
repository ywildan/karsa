import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection, LegalShell } from "../_components/legal-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Penjelasan data yang digunakan Karsa, tujuan pemrosesan, akses pengguna, serta cara meminta koreksi atau penghapusan data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Kebijakan Privasi"
      summary="Penjelasan tentang data yang digunakan Karsa untuk menjalankan fitur akademik, grup kelas, dan Karsa Lib."
      active="privacy"
    >
      <LegalSection title="1. Data yang digunakan">
        <p>Saat kamu masuk dengan Google, Karsa menerima informasi akun yang diperlukan untuk login, seperti nama, alamat email, foto profil, dan pengenal akun Google. Sistem dapat menyimpan token autentikasi dan informasi sesi agar proses masuk berjalan. Karsa tidak meminta atau menyimpan kata sandi Google-mu.</p>
        <p>Untuk fitur akademik, kami memproses NIM bila tersedia, kelas, program studi, semester, mata kuliah, penugasan PJ, kategori dan riwayat poin, laporan, serta peringkat. Untuk Karsa Lib, kami memproses nama tampilan, fakultas, program studi, kelas opsional, permohonan penulis, artikel, komentar, dan laporan konten.</p>
        <p>Untuk grup kelas, kami menyimpan pesan, balasan, laporan, status blokir, penyematan, dan tindakan moderasi. Kami juga mencatat informasi teknis seperlunya, seperti waktu sesi, nama perangkat yang dikirim aplikasi, versi dokumen yang disetujui saat login, serta log aktivitas penting untuk keamanan dan audit.</p>
        <p>Bila Teman baca AI artikel diaktifkan dan kamu menggunakannya, Karsa memproses isi artikel, pertanyaan, jawaban AI, rujukan paragraf, dan jumlah pemakaian harian. Percakapan dicatat untuk akun dan artikel terkait, tidak ditampilkan kepada pembaca lain. Ringkasan artikel dapat dipakai bersama oleh pembaca yang berhak mengakses artikel tersebut.</p>
      </LegalSection>

      <LegalSection title="2. Tujuan penggunaan">
        <p>Data dipakai untuk memverifikasi akun, memberi akses sesuai peran dan kelas/program studi, mencatat poin, menampilkan laporan dan peringkat, menyediakan percakapan grup, menjalankan Karsa Lib, menangani laporan, serta menjaga keamanan layanan.</p>
        <p>Saat artikel dibuka, Karsa mencatat satu pembacaan untuk kombinasi akun dan artikel tersebut. Membuka artikel yang sama lagi tidak menambah jumlah pembacanya. Catatan ini digunakan untuk menampilkan jumlah pembaca artikel dan ringkasan profil penulis.</p>
      </LegalSection>

      <LegalSection title="3. Siapa yang dapat melihat data">
        <p>Pengguna hanya mendapat akses sesuai fitur dan perannya. Anggota kelas dapat melihat ruang grup kelas yang tersedia. Artikel terbit, nama penulis, komentar, dan jumlah pembaca ditampilkan kepada pengguna Karsa Lib dari program studi yang sama. Admin dapat mengakses data yang diperlukan untuk pengelolaan, peninjauan permohonan penulis, audit, dan moderasi laporan.</p>
        <p>Karsa menggunakan penyedia layanan untuk autentikasi Google, hosting aplikasi, penyimpanan database, dan—bila diaktifkan—pengiriman email pemberitahuan laporan artikel kepada pengelola. Data tidak digunakan untuk menjual profil pengguna atau menayangkan iklan yang dipersonalisasi.</p>
        <p>Saat kamu meminta ringkasan baru atau bertanya kepada Teman baca, isi artikel dan pertanyaan yang diperlukan, termasuk konteks percakapan terbaru, dikirim ke penyedia AI yang digunakan Karsa. Karsa tidak menambahkan nama akun, email, NIM, dan token login sebagai informasi akun dalam prompt. Jangan memasukkan data pribadi atau rahasia dalam pertanyaan. Pengolahan dan penyimpanan oleh penyedia AI mengikuti ketentuan penyedia yang digunakan.</p>
      </LegalSection>

      <LegalSection title="4. Penyimpanan, penghapusan, dan keamanan">
        <p>Data disimpan selama diperlukan untuk menyediakan layanan dan menyelesaikan kebutuhan keamanan, audit, atau administrasi akademik yang relevan. Artikel yang diarsipkan dan catatan laporan dapat tetap tersimpan agar riwayat moderasi dapat ditinjau. Ketika komentar dihapus, teks komentar tidak lagi ditampilkan, tetapi informasi penghapusan dan konteks balasan/laporan tertentu dapat tetap tersimpan.</p>
        <p>Kami menggunakan kontrol akses berdasarkan peran, pemeriksaan di server, dan koneksi terenkripsi untuk membatasi akses yang tidak berwenang. Tidak ada sistem yang sepenuhnya bebas risiko; jangan membagikan akun Google atau perangkat yang masih dalam keadaan masuk.</p>
      </LegalSection>

      <LegalSection title="5. Permintaan terkait data dan akun">
        <p>Kamu dapat meminta informasi, koreksi, atau penghapusan akun dan data terkait dengan mengirim email ke <a href="mailto:yuwiaffa@gmail.com?subject=Permintaan%20Data%20Karsa" className="font-semibold text-[#ad560e] underline underline-offset-4">yuwiaffa@gmail.com</a>. Sertakan alamat email akun Karsa dan jenis permintaan; pengelola dapat meminta verifikasi kepemilikan akun sebelum menindaklanjutinya.</p>
        <p>Permintaan penghapusan ditinjau untuk menentukan data yang dapat dihapus dan data yang perlu dipertahankan karena alasan keamanan, audit, atau kewajiban yang berlaku. Pengelola akan menjelaskan tindak lanjut serta alasan bila ada data yang tidak dapat langsung dihapus. Jangan kirim kata sandi atau token login melalui email.</p>
      </LegalSection>

      <LegalSection title="6. Perubahan kebijakan">
        <p>Kebijakan ini akan diperbarui jika cara Karsa memproses data berubah secara penting. Versi dan tanggal berlaku ditampilkan di atas halaman. Untuk aturan penggunaan fitur, lihat <Link href="/syarat-penggunaan" className="font-semibold text-[#ad560e] underline underline-offset-4">Syarat Penggunaan</Link>.</p>
      </LegalSection>
    </LegalShell>
  );
}
