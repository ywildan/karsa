# Karsa Lib — Rangkuman Rencana Build

**Status:** implementasi awal Karsa Lib telah dibangun; perlu konfigurasi email laporan dan penerapan skema database sebelum dipakai  
**Tanggal:** 30 September 2026

Dokumen ini merangkum lingkup produk dan implementasi awal. Demo visual saat ini ada di [`karsa-lib/demo.html`](../karsa-lib/demo.html); prospek awal ada di [`karsa-lib/PROSPEK.md`](../karsa-lib/PROSPEK.md).

## Ringkasan produk

Karsa Lib menjadi bagian dari Karsa Mobile, bukan aplikasi terpisah. Mahasiswa membaca feed artikel dalam aplikasi Flutter Karsa Mobile. Pengelolaan artikel dan akses penulis dilakukan melalui web admin Karsa pada domain yang sama, di halaman `/admin/karsalib`. Fitur menggunakan backend/API Karsa dan database Supabase Karsa yang sudah ada.

Semua pengguna yang berhasil masuk dengan akun Google `@students.untidar.ac.id` dapat membaca feed prodi mereka, termasuk pengguna yang belum mendapat penugasan kelas atau PJ. Hak menulis artikel diberikan terpisah melalui permohonan dan persetujuan admin.

## Alur pengguna

### Masuk dan profil

1. Pengguna masuk dengan akun Google `@students.untidar.ac.id`.
2. Pengguna yang belum memiliki profil Karsa Lib mengisi setup profil: nama, fakultas, dan prodi. Kelas opsional.
3. Fakultas dan prodi dipilih dari data resmi Karsa. Keduanya dikunci setelah setup disimpan dan halaman memberi peringatan sebelum penyimpanan.
4. Setelah setup, pengguna masuk ke feed artikel untuk prodinya.

Karsa Mobile saat ini hanya mengizinkan akun dengan akses kelas atau PJ. Implementasi Karsa Lib perlu memperluas otorisasi mobile supaya akun domain mahasiswa yang valid dapat masuk tanpa penugasan kelas/PJ, sementara data fitur Karsa lainnya tetap mengikuti aturan masing-masing.

### Membaca artikel

- Beranda Karsa Lib menampilkan feed artikel prodi pengguna, bergaya linimasa.
- Urutan tersedia sebagai Terbaru, Trending 7 hari, dan Trending 30 hari. Trending dihitung di server dari jumlah pembaca unik yang pertama kali membuka artikel dalam periode berjalan; artikel lama tanpa pembaca baru tidak mendominasi. Hasil tetap terbatas pada prodi pengguna.
- Pencarian judul artikel dilakukan di server dalam prodi yang sama dan dapat dipakai bersama setiap pilihan urutan. Feed menampilkan maksimal 30 hasil teratas.
- Artikel menampilkan judul, ringkasan teks, penulis, waktu terbit, dan jumlah pembaca unik.
- Nama penulis dapat dibuka untuk melihat profil Karsa Lib-nya. Profil menampilkan identitas penulis, fakultas/prodi, artikel yang sudah terbit, dan jumlah pembaca pada setiap artikel. Profil hanya terlihat bagi pengguna yang dapat mengakses prodi tersebut.
- Feed dan halaman artikel hanya menyajikan artikel dengan prodi yang sama dengan profil pembaca. Server memeriksa batas ini pada setiap permintaan.
- Penulis tidak memilih prodi tujuan. Prodi artikel diambil dari profil penulis yang dikunci saat setup.
- Tahap awal mendukung teks saja; tidak ada unggah foto atau gambar.

### Menghitung pembaca

Pembaca dihitung satu kali per pengguna untuk setiap artikel. Pembukaan pertama membuat catatan pembacaan; membuka artikel yang sama lagi tidak menambah hitungan. Rekomendasi penyimpanan adalah catatan unik berdasarkan pasangan artikel dan pengguna (`article_id + user_id`).

Di profil penulis, tampilkan jumlah pembaca tiap artikel terbit dan **total pembaca artikel** yang merupakan penjumlahan jumlah pembaca unik pada seluruh artikel terbit penulis tersebut. Pengguna yang membaca beberapa artikel penulis yang berbeda tetap dihitung sekali pada setiap artikel; angka total adalah akumulasi per artikel, bukan jumlah orang unik lintas semua artikel. Draf tidak ditampilkan di profil publik.

### Mengajukan akses penulis

- Semua pembaca dapat membuka form permohonan penulis.
- Identitas, fakultas, dan prodi diisi otomatis dari profil. Pemohon mengisi alasan serta jenis/topik artikel yang ingin ditulis dan menyetujui panduan komunitas.
- Permohonan berstatus menunggu sampai admin meninjaunya di `/admin/karsalib`.
- Admin dapat menyetujui atau menolak permohonan. Persetujuan memberi akses buat artikel dan vault; pencabutan akses menghentikan kemampuan membuat dan mengedit artikel.
- Pengguna tanpa akses penulis tetap masuk ke beranda feed, tanpa menu buat artikel atau vault.

### Menulis dan mengelola artikel

- Penulis menyimpan tulisan sebagai draf di vault pribadi.
- Draf dapat diedit atau dihapus.
- Artikel dapat diterbitkan untuk prodi penulis, lalu isinya dapat diedit langsung tanpa riwayat versi.
- Artikel terbit dapat diarsipkan dan diterbitkan kembali. Artikel terbit tidak dihapus permanen oleh penulis; arsip mempertahankan catatan pembaca dan konteks moderasi.

### Komentar dan balasan

- Pengguna yang berhak membaca artikel dapat menulis komentar dan membalas komentar.
- Balasan dibatasi satu tingkat pada versi awal.
- Komentar tidak dapat diedit. Pemilik komentar boleh menghapus komentarnya sendiri.
- Komentar yang dilaporkan menunggu pemeriksaan dan persetujuan admin melalui dashboard sebelum dihapus/disembunyikan.

### Laporan artikel

- Setiap halaman artikel menyediakan tombol Laporkan yang membuka form pop-up.
- Laporan artikel maupun komentar memuat konten terkait, kategori/alasan, keterangan, waktu, dan identitas pelapor.
- Laporan tersimpan untuk audit dan tersedia untuk ditinjau di dashboard admin. Jika Resend dikonfigurasi, pemberitahuan laporan juga dikirim ke email pengelola.
- Laporan komentar ditangani melalui dashboard dan memerlukan persetujuan admin sebelum komentar dihapus/disembunyikan.

## Halaman admin web

Tambahkan halaman yang dilindungi admin pada web Karsa, di antaranya `/admin/fakultas`, `/admin/prodi`, dan `/admin/karsalib`, dengan bagian:

- Permohonan penulis: daftar permohonan, detail, setujui/tolak.
- Penulis: cari pengguna, lihat status, beri atau cabut akses.
- Artikel: daftar dan detail artikel, status terbit/arsip, tindakan moderasi.
- Profil penulis menampilkan daftar artikel terbit dan statistik pembacanya; draf hanya terlihat di vault pribadi penulis.
- Laporan: tinjau laporan artikel dan komentar; persetujuan admin diperlukan sebelum komentar yang dilaporkan dihapus/disembunyikan.
- Fakultas dan Prodi: kelola master fakultas dan hubungkan setiap prodi ke fakultas yang tepat. Prodi yang belum terhubung tidak ditawarkan pada setup profil Karsa Lib.

Dashboard tetap berada dalam aplikasi web dan domain Karsa yang sama; mahasiswa mengakses fitur pembaca/penulis dari Karsa Mobile.

## Arsitektur yang direncanakan

- **Aplikasi mahasiswa:** Flutter, ditambahkan sebagai bagian/tab Karsa Lib di Karsa Mobile.
- **Backend:** API mobile Next.js yang sudah digunakan Karsa. Flutter tidak mengakses database secara langsung.
- **Database:** Supabase Karsa yang sama, dengan tabel/modul khusus Karsa Lib.
- **Autentikasi:** akun Google `@students.untidar.ac.id` dan sesi Karsa yang sudah ada, dengan aturan eligibility yang diperluas untuk Karsa Lib.
- **Otorisasi:** server menentukan profil prodi, akses penulis, kepemilikan artikel/komentar, dan visibilitas konten.

### Konfigurasi email laporan

Atur variabel server berikut pada environment deployment agar laporan mengirim email melalui Resend:

- `RESEND_API_KEY`
- `KARSA_LIB_REPORT_EMAIL` — alamat penerima laporan
- `KARSA_LIB_REPORT_FROM` — alamat pengirim yang sudah diverifikasi di Resend

Tanpa ketiganya, laporan tetap tersimpan dan dapat dikelola di `/admin/karsalib`, tetapi email tidak dikirim.

Model data mencakup master Fakultas, relasi Fakultas–Prodi, profil Karsa Lib; permohonan dan akses penulis; artikel; pembacaan unik; komentar/balasan; serta laporan dan keputusan moderasi.

## Cakupan bukan untuk tahap awal

- Aplikasi atau database terpisah untuk Karsa Lib.
- Foto dan gambar di artikel.
- Balasan komentar bertingkat tanpa batas.
- Riwayat versi isi artikel.
- Penghitungan pembaca berulang untuk pengguna yang sama.

## Hal implementasi yang perlu ditangani

- Migrasi menambahkan master Fakultas dan relasi opsional pada Prodi agar data lama tetap utuh. Admin perlu mengisi master Fakultas dan menghubungkan semua Prodi lama melalui `/admin/fakultas` lalu `/admin/prodi`; hanya Prodi yang sudah terhubung tersedia bagi setup Karsa Lib.
- Akses baca Karsa Lib harus dapat diberikan kepada akun mahasiswa berdomain kampus meskipun `kelas_id` kosong; jangan memperluas izin fitur lain secara tidak sengaja.
- Email penerima laporan perlu disediakan melalui konfigurasi server, bukan ditanam di Flutter atau kode publik.
- Penghapusan komentar yang disetujui admin sebaiknya menyimpan status moderasi agar catatan laporan dan jumlah pembaca tetap konsisten.

## Status implementasi awal

Implementasi awal telah menambahkan model Prisma dan SQL idempoten di `prisma/init.sql`, API mobile, tab dan layar Karsa Lib di Flutter, dashboard admin `/admin/karsalib`, serta pengelolaan Fakultas dan relasi Prodi. Skema belum diterapkan ke Supabase; terapkan melalui proses migrasi yang disetujui proyek setelah meninjau SQL. Jangan menganggap penambahan berkas SQL otomatis mengubah database deployment.

Pilihan fakultas dan prodi Karsa Lib bersumber dari master yang dikelola admin. Flutter SDK tidak tersedia pada lingkungan implementasi ini sehingga analyzer/build Flutter belum dijalankan.
