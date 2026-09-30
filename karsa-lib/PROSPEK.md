# Prospek Karsa Lib

**Status:** gagasan awal, belum menjadi spesifikasi implementasi  
**Tanggal rangkuman:** 30 September 2026

## Ringkasan

Karsa Lib adalah perpustakaan artikel mahasiswa yang terintegrasi dengan Karsa Mobile. Mahasiswa dapat menulis dan menyimpan artikel di vault pribadi, lalu menerbitkannya agar dapat dibaca mahasiswa dari program studi yang sama.

Contoh artikel: *Cara membaca jurnal umum*. Pada tahap awal, artikel berupa teks saja; penulis belum dapat menyertakan foto atau gambar.

## Pengalaman yang dibayangkan

1. Pengguna masuk dengan akun Google Karsa.
2. Pengguna yang belum memiliki profil Karsa Lib mengisi setup: nama, fakultas, dan prodi. Kelas bersifat opsional. Halaman memberi peringatan bahwa fakultas dan prodi tidak dapat diubah setelah disimpan.
3. Setelah setup, semua pengguna yang bisa login masuk ke beranda Karsa Lib berupa feed artikel bergaya linimasa seperti Threads. Feed hanya menampilkan artikel untuk prodi pengguna.
4. Hak membaca feed diberikan kepada semua pengguna Karsa Lib yang lolos login. Hak membuat dan mengelola artikel adalah akses terpisah: pengguna mengajukan permohonan melalui form, lalu pemilik/admin meninjau dan menetapkan pemohon sebagai penulis jika disetujui.
5. Pengguna yang belum ditetapkan sebagai penulis tetap berada di beranda feed dan tidak dapat membuka fitur buat artikel atau vault penulis.
6. Penulis menulis artikel dan menyimpannya sebagai draf di vault. Saat diterbitkan, artikel ditujukan kepada prodi penulis. Penulis tidak memilih prodi audiens lain; prodi artikel berasal dari profil setup yang dikunci.
7. Mahasiswa dari prodi yang sama membaca artikel dari feed. Artikel menampilkan nama penulis dan jumlah pembaca.

## Pembaca unik

Jumlah pembaca bertambah saat pengguna login membuka artikel untuk pertama kalinya. Membuka artikel yang sama lagi setelah keluar dari halaman tidak menambah jumlah.

Model data yang disarankan adalah satu catatan pembacaan untuk setiap pasangan artikel dan pengguna, dengan batas unik `artikel_id + user_id`. Dengan demikian, angka yang ditampilkan adalah jumlah pengguna unik yang telah membaca artikel, bukan jumlah seluruh pembukaan.

## Edit dan arsip

Alur sederhana yang disarankan:

- **Draf:** dapat diedit atau dihapus kapan saja dan belum terlihat oleh pembaca lain.
- **Terbit:** penulis dapat memperbarui judul dan isi. Perubahan memperbarui isi artikel saat ini; riwayat versi tidak diperlukan pada tahap awal. Simpan waktu pembaruan agar perubahan bisa dikenali.
- **Diarsipkan:** tidak lagi muncul di daftar artikel prodi, tetapi tetap tersimpan di vault penulis dan dapat diterbitkan kembali.
- **Hapus permanen:** sediakan untuk draf. Untuk artikel yang pernah terbit, arsip lebih aman agar riwayat pembaca dan penanganan laporan tidak hilang.

Ini merupakan rekomendasi awal untuk menjaga alur tetap mudah dipahami; aturan final belum ditetapkan.

## Laporan artikel

Setiap halaman artikel menyediakan tombol **Laporkan**. Tombol membuka formulir pop-up; setelah dikirim, laporan diteruskan ke email pemilik Karsa Lib untuk diaudit dan ditindaklanjuti secara manual. Laporan sebaiknya menyertakan artikel yang dilaporkan, kategori/alasan, keterangan pembaca, waktu laporan, dan identitas pelapor agar dapat ditinjau.

## Komentar dan balasan

Artikel direncanakan memiliki ruang komentar untuk diskusi dan balasan. Untuk versi awal, balasan dibatasi satu tingkat. Komentar tidak dapat diedit; pemilik komentar dapat menghapus komentarnya sendiri. Komentar yang dilaporkan tidak langsung dihapus: admin meninjau laporan dan menyetujui penghapusan melalui dashboard Karsa Lib.

## Kesesuaian dengan Karsa saat ini

Karsa Mobile sudah memiliki autentikasi akun Karsa dan berkomunikasi dengan backend melalui API mobile. Data akademik Karsa saat ini menghubungkan pengguna ke kelas dan kelas ke prodi. Karena itu, integrasi Karsa Lib dapat menggunakan fondasi backend dan sesi yang sudah ada, lalu menambahkan API, model data artikel, dan halaman baru di aplikasi mobile.

Audiens artikel bersifat lintas kelas dalam satu prodi, sehingga artikel tidak sebaiknya dimodelkan sebagai pesan grup kelas/mata kuliah yang sudah ada. Karsa Lib membutuhkan model artikel dan aturan aksesnya sendiri. Profil Karsa Lib akan menjadi sumber fakultas dan prodi yang dipilih pengguna saat setup; prodi dan fakultas dikunci setelah setup. Perlu diputuskan apakah dan bagaimana profil tersebut dicocokkan dengan data akademik Karsa.

Login Karsa Lib menggunakan akun Google berdomain `@students.untidar.ac.id`, sama dengan domain mahasiswa yang dipakai Karsa saat ini. Pengguna dengan domain tersebut dapat masuk dan membaca feed meskipun belum memiliki penugasan kelas atau PJ di data akademik Karsa.

## Cakupan awal yang disarankan

- Masuk menggunakan akun Karsa yang sama.
- Setup profil setelah login Google: nama, fakultas, dan prodi; kelas opsional. Fakultas dan prodi dikunci setelah disimpan.
- Semua pengguna yang dapat login boleh membaca feed prodinya; hanya pengguna yang ditetapkan pemilik/admin sebagai penulis boleh membuat dan mengelola artikel.
- Pengguna mengajukan akses penulis melalui form; pemilik/admin meninjau permohonan dan memutuskan persetujuan.
- Vault pribadi berisi draf dan artikel milik penulis.
- Buat, edit, terbitkan, arsipkan, dan terbitkan kembali artikel.
- Feed serta halaman baca artikel yang hanya dapat diakses anggota prodi yang sama.
- Identitas penulis dan jumlah pembaca unik.
- Konten teks saja; tanpa unggah foto atau gambar.
- Validasi akses di backend, bukan hanya menyembunyikan konten di tampilan aplikasi.

## Akses penulis

Pengguna mengajukan akses penulis melalui form. Pemilik/admin Karsa Lib meninjau permohonan dan memberikan status penulis secara manual jika disetujui. Pengguna tanpa status penulis tetap dapat membaca feed sesuai prodi, tetapi API dan tampilan aplikasi tidak memberi akses untuk membuat artikel atau membuka vault penulis. Jika status penulis dicabut, pengguna kehilangan kemampuan membuat dan mengedit artikel. Artikel yang sudah terbit tetap mengikuti kebijakan arsip dan moderasi.

## Pengelolaan melalui dashboard admin

Karsa Lib tetap menjadi bagian dari Karsa, bukan aplikasi admin terpisah. Dashboard admin Karsa di web/domain yang sama direncanakan memiliki bagian **Kelola Karsa Lib** untuk mencari pengguna dan memberi atau mencabut akses penulis, melihat artikel, serta meninjau laporan artikel dan komentar. Laporan artikel juga diteruskan ke email pemilik untuk audit dan tindak lanjut manual.

## Hal yang perlu diputuskan sebelum implementasi

- Detail form permohonan penulis, status yang terlihat bagi pemohon, dan apakah permohonan yang ditolak boleh diajukan kembali.
- Detail kategori laporan dan format email laporan.

## Kesimpulan

Semua akun Google `@students.untidar.ac.id` dapat masuk dan membaca feed, termasuk akun tanpa penugasan kelas/PJ. Saat setup, pengguna memilih fakultas dan prodi dari data resmi Karsa; pilihan dikunci setelah disimpan. Hak menulis dan mengelola vault diberikan setelah pengguna mengajukan permohonan melalui form dan admin menyetujuinya. Artikel ditujukan kepada satu prodi pada profil penulis. Karsa Lib layak dikembangkan sebagai perluasan Karsa Mobile. Fondasi akun sudah tersedia, tetapi pengalaman artikel memerlukan penyimpanan, API, pengelolaan permohonan penulis, dan kebijakan moderasi khusus. Batas awal berupa teks saja, audiens satu prodi, pembaca unik, dan pengarsipan untuk artikel terbit memberi ruang untuk memulai dengan lingkup yang terkendali.
