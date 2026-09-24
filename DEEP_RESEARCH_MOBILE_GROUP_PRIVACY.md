# Deep Research: Privasi Grup Mobile Karsa
> Dibuat 24 September 2026 | Kedalaman: standard | Sumber eksternal: 18

## TL;DR

Karsa sebaiknya memulai dengan grup teks per `KelasMatkul` yang hanya tersedia di aplikasi mobile, memakai penyimpanan server biasa dan kontrol akses ketat—bukan end-to-end encryption (E2EE). Pilihan ini membuat pengguna tetap dapat login kembali secara normal dan melihat riwayat dari perangkat baru, sambil mencegah admin web menjelajah percakapan karena tidak ada halaman, endpoint admin, atau izin produk untuk melakukannya.

Privasi tersebut harus dijelaskan secara tepat: anggota grup adalah satu-satunya pembaca yang diizinkan dalam penggunaan normal, tetapi operator infrastruktur/database secara teknis masih dapat mengakses data jika menggunakan kredensial administratif. Untuk keselamatan, laporan harus dibuat dari mobile dan hanya membagikan pesan yang sengaja dipilih pelapor; bila tidak ada peninjau selain PJ, laporan terhadap PJ memerlukan mekanisme tindakan otomatis atau kanal eskalasi sukarela.

## Executive Summary

Tujuan Karsa bukan membangun messenger publik atau direct message, melainkan ruang diskusi tertutup per mata kuliah untuk satu kelas. Setiap grup berisi seluruh mahasiswa kelas dan seluruh PJ mata kuliah di kelas tersebut; hanya PJ penanggung jawab grup yang memperoleh hak kelola tambahan. Identitas anggota sudah terverifikasi, relasi kelas dan penugasan PJ sudah berada di database, aplikasi native sudah memakai bearer session dengan token yang disimpan sebagai hash di server, serta admin tetap berada di dashboard web. Kondisi ini mendukung model closed-group authorization: setiap permintaan membaca atau menulis pesan harus memverifikasi sesi, kelas pengguna, `KelasMatkul`, dan status keanggotaan terkini. OWASP merekomendasikan least privilege, deny by default, serta validasi izin pada setiap permintaan, bukan mengandalkan layar aplikasi untuk menyembunyikan data [1][2].

E2EE memberi perlindungan lebih tinggi terhadap operator server dan pencurian database, tetapi memperkenalkan manajemen kunci per perangkat, rotasi saat anggota berubah, recovery, sinkronisasi perangkat baru, serta masalah moderasi. MLS memang dirancang untuk pengelolaan kunci grup asynchronous dengan forward secrecy dan post-compromise security, tetapi kompleksitasnya tidak sebanding dengan ancaman yang dinyatakan untuk MVP Karsa [12]. Karena kekhawatiran utama adalah agar admin web tidak memperoleh fungsi membaca/moderasi seluruh percakapan, batas produk dan otorisasi server sudah menjawab kebutuhan tersebut tanpa mengorbankan pemulihan riwayat.

Fitur mobile-only tidak berarti fitur keselamatan boleh dihilangkan. Google Play menyatakan bahwa aplikasi dengan user-generated content, termasuk aplikasi tertutup untuk sekolah atau perusahaan, harus memiliki pelaporan dalam aplikasi; Apple juga mensyaratkan mekanisme pelaporan, respons, pemblokiran pengguna abusif, dan kontak yang dapat dihubungi [13][14]. Karena itu rekomendasi final adalah: PJ memoderasi ruangnya dari mobile; setiap anggota dapat mute, block, dan report; laporan normal masuk ke PJ; laporan terhadap PJ memicu penyembunyian berbasis ambang dan menawarkan eskalasi sukarela yang hanya membagikan pesan terpilih. Tidak ada browser percakapan di dashboard web.

Supabase Free saat ini mencantumkan kuota database 500 MB, 200 koneksi Realtime bersamaan, dan dua juta pesan Realtime per bulan [9]. Karena satu event Realtime dihitung per penerima, fan-out grup beranggotakan 50 orang dapat mengonsumsi puluhan event dari satu pesan ketika semua anggota aktif [10]. MVP sebaiknya memakai pagination dan refresh/polling ringan saat layar terbuka. Realtime dapat menyusul setelah metrik penggunaan nyata tersedia dan integrasi authorization-nya dirancang khusus.

## 1. Pertanyaan dan Batas Sistem [Confidence: High]

Pertanyaan keputusan adalah: bagaimana menyediakan grup percakapan per mata kuliah yang hanya terlihat di mobile, menjaga percakapan dari akses admin web dalam penggunaan normal, tetap memungkinkan login dan pemulihan riwayat, mematuhi kebutuhan keselamatan UGC, serta bertahan di Supabase Free?

Batas produk yang sudah disepakati:

- Satu grup mewakili satu `KelasMatkul`.
- Anggota setiap grup adalah seluruh mahasiswa pada `kelas_id` tersebut, termasuk semua PJ dari mata kuliah lain di kelas yang sama.
- Semua anggota boleh membaca dan mengirim pesan di kedelapan grup; hanya kecocokan `KelasMatkul.pj_id` yang mengaktifkan hak pin, lock, dan moderasi pada satu grup terkait.
- Satu PJ secara operasional hanya memegang satu mata kuliah, tetapi aturan ini tidak dibuat sebagai unique constraint database.
- Tidak ada direct message, chat anonim, lampiran, gambar, HTML, preview tautan, typing indicator, presence, atau read receipt pada MVP.
- Forum/grup tidak muncul di web, termasuk dashboard admin.
- Identitas nama asli dan peran ditampilkan.
- Pesan dapat diedit selama 15 menit dan dihapus secara soft delete.
- PJ dapat pin, lock, dan melakukan tindakan moderasi hanya pada grup yang ditugaskan kepadanya.

Repositori lokal memperlihatkan bahwa aplikasi mobile Karsa dibuat dengan Flutter dan memakai `flutter_secure_storage`; backend memakai Next.js, Prisma, PostgreSQL Supabase, serta model `MobileSession` dengan access dan refresh token berbentuk hash. Relasi `User.kelas_id` dan `KelasMatkul.pj_id` sudah menyediakan sumber kebenaran keanggotaan. Fakta ini berasal dari `karsa-mobile/pubspec.yaml`, `prisma/schema.prisma`, dan `docs/SECURITY-HARDENING-LOG.md` yang diperiksa pada tanggal laporan.

## 2. Jawaban tentang Login Ulang [Confidence: High]

Ya, pengguna tetap dapat login kembali secara normal. Pada desain yang direkomendasikan, autentikasi dan penyimpanan pesan adalah dua hal terpisah: login Google/native menghasilkan sesi baru, lalu server memeriksa identitas serta keanggotaan kelas dan mengirim riwayat yang masih berhak dibaca pengguna. Kehilangan atau mengganti perangkat tidak menghilangkan chat karena riwayat berada di database, bukan hanya pada kunci lokal perangkat.

Ada tiga variasi yang perlu dibedakan:

1. **Tanpa E2EE (rekomendasi MVP).** Login ulang mengembalikan seluruh riwayat yang masih berada dalam masa retensi. Token baru disimpan secara aman di perangkat, sementara server memvalidasi expiration dan status revoke. OWASP menekankan token/session harus memiliki masa berlaku dan invalidasi server-side [7]; MASVS memisahkan kontrol storage, auth, crypto, dan network sebagai area yang seluruhnya perlu diuji [6].
2. **E2EE device-bound.** Login Google tetap berhasil, tetapi perangkat baru tidak dapat membaca pesan lama apabila private key tidak ditransfer atau dipulihkan. Jadi benar: akun tidak hilang, tetapi chat lama dapat hilang secara praktis.
3. **E2EE dengan key recovery.** Riwayat dapat dipulihkan bila private key dicadangkan memakai recovery key/passphrase. Jika server memegang kunci pemulihan yang dapat langsung dibuka setelah login biasa, server pada akhirnya juga memiliki jalur dekripsi dan janji “bahkan operator tidak bisa membaca” menjadi lebih lemah.

Karena kebutuhan privasi Anda adalah membatasi fungsi admin web, bukan meniadakan kemampuan teknis operator database, variasi pertama memberi hasil paling sederhana dan dapat dipulihkan.

## 3. Empat Skenario Arsitektur [Confidence: High]

### Skenario A — Mobile-only sebagai batas tampilan

Admin tidak melihat menu forum di web, tetapi endpoint forum tidak memiliki aturan eksplisit yang menolak admin atau runtime database memiliki akses terlalu luas. Ini cepat dibangun, tetapi bukan batas privasi yang kuat. Seseorang dapat menambahkan halaman admin di kemudian hari atau memanggil endpoint secara langsung. Menyembunyikan UI bukan authorization; akses perlu ditolak di endpoint dan database [1][2].

**Keputusan:** ditolak.

### Skenario B — Mobile-only dengan server authorization dan riwayat recoverable

Pesan disimpan di PostgreSQL. Semua akses berjalan melalui `/api/mobile/v1/forum/*` menggunakan bearer session Karsa. Server mengambil user terkini dari database, lalu memverifikasi bahwa user berada pada `kelas_id` yang memiliki `KelasMatkul` tersebut. Seluruh PJ mata kuliah lain di kelas yang sama tetap dapat chat karena mereka juga anggota kelas; server memeriksa kecocokan `pj_id` hanya ketika operasi pin, lock, atau moderasi diminta. Admin tidak mendapat pengecualian; `is_admin = true` sendiri tidak memberikan akses forum. Tidak dibuat route `/admin/forum`, server action web, export, atau browser pesan.

Setiap operasi memiliki hak terpisah: anggota kelas boleh membaca/mengirim; penulis boleh mengedit 15 menit dan soft-delete miliknya; hanya PJ yang ditunjuk pada grup tersebut boleh pin/lock/hide; PJ dari mata kuliah lain tetap menjadi anggota biasa pada grup itu; dan tidak seorang pun memperoleh hard delete melalui API rutin. Aturan ini mengikuti deny-by-default dan permission check per request [1][2]. RLS dan grant database dapat menjadi defense in depth, dengan policy terpisah untuk SELECT/INSERT/UPDATE/DELETE sebagaimana disarankan dokumentasi Supabase [3][4].

Kelebihan: login ulang normal, riwayat lintas perangkat, backup sederhana, pencarian/pagination mudah, dan cocok dengan arsitektur Karsa sekarang. Kekurangan: pemilik kredensial database administratif atau operator server masih dapat membaca teks; kebocoran database dapat mengekspos pesan bila lapisan penyimpanan berhasil ditembus.

**Keputusan:** rekomendasi MVP.

### Skenario C — Encryption at application layer dengan kunci server

Mobile mengirim pesan melalui TLS, lalu server mengenkripsi isi sebelum menyimpannya. Kunci berada di secret hosting, bukan database. Pencuri dump database/backup hanya memperoleh ciphertext; aplikasi tetap dapat memulihkan riwayat di perangkat baru karena server dapat mendekripsi setelah autentikasi. OWASP menekankan bahwa lokasi enkripsi harus dipilih berdasarkan threat model dan bahwa enkripsi tidak menggantikan access control [5].

Kelebihan: perlindungan tambahan jika yang bocor hanya database atau artifact backup. Kekurangan: server compromise yang juga memperoleh secret tetap dapat mendekripsi, rotasi kunci dan pencarian menjadi lebih rumit, serta kesalahan implementasi crypto dapat lebih berbahaya daripada manfaatnya. Ini juga bukan E2EE dan tidak boleh dipasarkan demikian.

**Keputusan:** kandidat hardening setelah MVP, bukan syarat awal.

### Skenario D — E2EE grup penuh

Perangkat anggota mengelola kunci grup; server hanya mengirim dan menyimpan ciphertext. Protokol grup modern seperti MLS menangani perubahan keanggotaan, forward secrecy, dan post-compromise security melalui epoch/key updates [12]. Model ini paling kuat terhadap operator dan kebocoran database.

Kelemahan operasionalnya besar: perangkat baru memerlukan transfer/recovery key; anggota baru secara prinsip tidak otomatis memperoleh riwayat lama; pengeluaran anggota membutuhkan rotasi; perangkat offline lama perlu ditangani; pencarian server dan moderasi isi tidak tersedia. Membangun kriptografi grup sendiri tidak layak; harus menggunakan implementasi yang teruji.

**Keputusan:** tidak direkomendasikan untuk pilot Karsa karena tidak menjawab kebutuhan tambahan yang benar-benar diminta, tetapi menambah risiko kehilangan data dan kompleksitas tinggi.

### Perbandingan keputusan

| Kriteria | A: UI-only | B: Authorized server | C: Server encryption | D: E2EE |
|---|---:|---:|---:|---:|
| Login ulang normal | Ya | Ya | Ya | Ya |
| Riwayat langsung tersedia di HP baru | Ya | Ya | Ya | Tidak selalu |
| Admin web tidak memiliki fitur baca | Ya | Ya | Ya | Ya |
| Penolakan admin ditegakkan server | Tidak pasti | Ya | Ya | Ya |
| Dump database tidak mengungkap body | Tidak | Tidak | Ya | Ya |
| Server Karsa dapat membaca body | Ya | Ya | Ya | Tidak |
| Pencarian/pagination sederhana | Ya | Ya | Lebih rumit | Sulit |
| Moderasi dan report sederhana | Ya | Ya | Ya | Sulit |
| Kompleksitas untuk pilot | Rendah | Rendah–sedang | Sedang–tinggi | Sangat tinggi |
| Rekomendasi | Tolak | **Pilih** | Evaluasi nanti | Tunda |

### Skenario penggunaan nyata

**Skenario 1 — Mahasiswa mengganti ponsel.** Yusuf kehilangan ponsel, memasang ulang Karsa, lalu login menggunakan akun kampus. Pada skenario B server menerbitkan sesi baru, memeriksa bahwa Yusuf masih berada di kelas yang sama, dan mengirim riwayat grup sesuai pagination. Sesi pada perangkat lama dapat dicabut. Tidak ada key transfer atau recovery phrase karena pesan tidak dienkripsi end-to-end.

**Skenario 2 — PJ diganti di tengah semester.** Setelah `KelasMatkul.pj_id` berubah, PJ lama kehilangan hak pin/lock/moderasi pada grup tersebut, tetapi tetap dapat membaca dan chat sebagai mahasiswa kelas. PJ baru langsung memperoleh hak pengelola dan tetap dapat membaca riwayat karena ruang melekat pada mata kuliah. Pergantian sebaiknya menghasilkan event sistem yang terlihat oleh anggota. Tidak ada unique constraint yang melarang seseorang menjadi PJ dua mata kuliah; aturan satu PJ satu mata kuliah tetap menjadi kebijakan operasional.

**Skenario 3 — Mahasiswa melaporkan spam mahasiswa lain.** Pelapor menekan message, memilih alasan, dan melihat preview tepat tentang data yang akan dibagikan. PJ menerima hanya pesan yang dilaporkan beserta konteks terbatas, bukan akses baru karena PJ memang sudah anggota ruang. PJ dapat hide, dismiss, atau lock room; tindakan dan alasan dicatat tanpa menduplikasi seluruh body ke audit log.

**Skenario 4 — Mahasiswa melaporkan PJ.** Laporan tidak boleh kembali hanya kepada PJ yang dilaporkan. Jika Karsa mempertahankan larangan peninjau lain, sejumlah laporan unik dapat memicu auto-hide sementara. Untuk kasus serius, aplikasi menawarkan eskalasi sukarela dengan disclosure yang jelas. Bila pengguna menolak eskalasi, tidak ada pihak lain yang menerima isi, tetapi Karsa juga harus jujur bahwa tidak akan ada adjudikasi independen.

**Skenario 5 — Admin web penasaran dan mencoba membuka forum.** Tidak ada menu maupun endpoint web untuk daftar room/message. Jika admin memanggil API mobile dengan session web, request ditolak karena bukan bearer mobile yang valid; bila admin memiliki bearer mobile, `is_admin` tetap bukan bukti membership. Pengujian negatif ini harus menjadi test otomatis agar fitur admin baru di masa depan tidak tanpa sengaja memperluas akses.

**Skenario 6 — Database dump tersebar.** Pada skenario B isi pesan dapat terekspos, walaupun token sesi tetap lebih terlindungi karena server menyimpan hash. Backup terenkripsi dan role read-only mengurangi peluang kejadian, tetapi tidak mengubah dampak setelah dump berhasil didekripsi. Bila threat ini kemudian dinilai tinggi, scenario C dapat diterapkan pada body pesan tanpa mengubah pengalaman login; label produk tetap “encrypted by Karsa”, bukan E2EE.

## 4. Moderasi tanpa Browser Admin [Confidence: High]

Masalah inti bukan apakah web digunakan, tetapi siapa yang berwenang bertindak ketika terjadi pelecehan, spam, atau penyalahgunaan. Store policy tidak menentukan bahwa harus ada dashboard web, tetapi mewajibkan pelaporan dan tindakan yang sesuai. Google Play secara khusus memasukkan aplikasi sekolah/perusahaan terverifikasi ke kewajiban report; Apple menambahkan filtering, report, block, respons, dan informasi kontak [13][14].

Model yang paling konsisten dengan preferensi Anda adalah moderasi berlapis yang sepenuhnya dimulai dari mobile:

1. **Kontrol pribadi:** mute grup, mute user, dan block user. Block tidak boleh melemahkan kewajiban akademik; pesan dari user terblokir dapat disembunyikan dengan placeholder yang dapat dibuka manual.
2. **PJ sebagai pengelola ruang:** PJ dapat lock grup, pin pesan, dan hide pesan mahasiswa dengan alasan terstruktur. Semua tindakan hanya menyimpan ID, aktor, waktu, dan alasan—bukan menyalin seluruh percakapan ke audit log.
3. **Report eksplisit:** pelapor memilih satu pesan dan opsional beberapa pesan konteks. Hanya konten yang dipilih itu yang masuk objek laporan. Ini bukan penyadapan keseluruhan ruang; ini disclosure yang dilakukan pengguna secara sadar.
4. **Konflik PJ:** bila yang dilaporkan adalah PJ, PJ tersebut tidak boleh menjadi satu-satunya hakim. Tanpa pihak peninjau lain, pilihan yang tersisa adalah tindakan otomatis berbasis ambang laporan unik, misalnya menyembunyikan pesan setelah sejumlah anggota berbeda melapor, disertai pencegahan kolusi dan rate limit.
5. **Eskalasi sukarela:** untuk ancaman serius, pengguna diberi tombol menghubungi kanal resmi. Aplikasi harus menjelaskan bahwa menekan eskalasi membagikan pesan terpilih kepada penerima. Tidak ada percakapan lain yang ikut dikirim.

Ada trade-off yang tidak bisa dihapus secara teknis: jika tidak ada manusia selain PJ yang boleh menerima laporan, laporan terhadap PJ tidak dapat diadili secara independen. Sistem hanya dapat melakukan auto-hide berdasarkan aturan. Rekomendasi pilot adalah memakai auto-hide untuk laporan terhadap PJ dan menyediakan eskalasi sukarela; setelah universitas menyetujui Karsa, peran penangan keselamatan formal dapat ditentukan bersama institusi.

## 5. Model Data dan Retensi yang Meminimalkan Privasi [Confidence: Medium]

Tanpa menentukan SQL, bentuk konseptual minimum adalah grup yang terikat satu-ke-satu dengan `KelasMatkul`, message dengan optional `reply_to`, status pin/hidden/deleted, dan report yang menunjuk message. Membership tidak perlu diduplikasi sebagai daftar bebas karena seluruh mahasiswa dan seluruh PJ di kelas yang sama adalah anggota semua grup kelas. `KelasMatkul.pj_id` menentukan otoritas pengelola untuk satu grup, bukan keanggotaan chat. Jika snapshot membership dibutuhkan untuk riwayat semester, snapshot harus memiliki tanggal mulai/akhir dan tidak boleh otomatis memberi akses setelah pengguna keluar.

Retensi yang proporsional untuk pilot:

- Pesan aktif disimpan sampai semester berakhir ditambah 90 hari.
- Soft-deleted body dipertahankan paling lama 30 hari untuk undo/sengketa, lalu body dihapus permanen dan tersisa tombstone minimal.
- Isi yang secara eksplisit masuk laporan dapat dipertahankan 90 hari sejak laporan selesai.
- Audit aktivitas hanya menyimpan metadata tindakan; jangan menyalin body pesan.
- Tidak ada analytics isi, indexing untuk iklan, training model, atau export massal.

NIST menempatkan data minimization, lifecycle, deletion, dan dokumentasi audit sebagai bagian dari pengelolaan risiko privasi [15][16]. Angka retensi di atas adalah rekomendasi produk, bukan angka yang diwajibkan sumber; angka final perlu diselaraskan dengan kebijakan universitas bila Karsa menjadi sistem resmi.

## 6. Skenario Ancaman [Confidence: High]

### Pengguna menebak ID grup lain

Endpoint tidak boleh percaya `kelas_matkul_id` dari client. Setelah token diverifikasi, server mengambil user dan relasi kelas/PJ terkini, lalu menolak bila tidak cocok. Respons 404 dapat dipakai agar keberadaan ruang lain tidak bocor. Pengujian harus mencakup mahasiswa kelas A meminta message kelas B, PJ meminta matkul yang bukan tanggung jawabnya, dan admin web mencoba endpoint mobile [1][2].

### Token ponsel dicuri

Access token berumur singkat membatasi jendela serangan; refresh token harus berotasi dan dapat dicabut. Logout serta revoke perlu berlaku server-side [7]. Karsa sudah menyimpan hash token, sehingga dump database tidak langsung memberikan bearer token yang dapat dipakai.

### Mahasiswa pindah kelas atau PJ diganti

Hak akses dihitung dari database pada setiap request penting. Setelah relasi berubah, sesi tidak perlu menunggu claim lama kedaluwarsa untuk kehilangan akses. Cache lokal percakapan harus dibersihkan saat server mengembalikan forbidden, logout, atau pergantian identitas. Data yang pernah dibaca atau di-screenshot tentu tidak bisa ditarik kembali; ini batas alami semua sistem pesan.

### Admin web atau akun admin dibajak

Karena admin bukan anggota forum, `is_admin` tidak memberi izin forum. Tidak ada endpoint/list/export forum pada web. Namun compromised deployment atau database owner masih merupakan ancaman infrastruktur; scenario C dapat mengurangi dampak dump database, sedangkan hanya E2EE yang secara kuat mengurangi kemampuan server membaca isi.

### Spam dan banjir pesan

Batasi panjang judul/pesan, jumlah request per user/room, dan ukuran body; validasi dilakukan server-side. OWASP merekomendasikan validasi tipe/range/length serta request size limit [2]. Idempotency key mencegah pesan ganda ketika retry. Grup yang locked menolak insert kecuali oleh PJ.

### PJ menyalahgunakan kekuasaan

PJ tidak memperoleh hard delete. Hide selalu membutuhkan alasan, terlihat sebagai tombstone, dan tercatat sebagai metadata. Laporan terhadap PJ memakai ambang pengguna unik dan opsi eskalasi sukarela. Ini tidak sempurna, tetapi lebih jujur daripada memberi admin akses tersembunyi.

### Database atau backup bocor

Backup Karsa yang ada sudah terenkripsi dan diuji restore. Role backup hanya read-only, tetapi karena memiliki cakupan seluruh tabel, backup akan berisi pesan. Skenario B mengandalkan proteksi credential dan encryption platform/backup; scenario C membuat body di dump menjadi ciphertext. Supabase sendiri merekomendasikan ekspor off-site berkala untuk Free plan [17].

## 7. Free Tier dan Realtime [Confidence: High]

Supabase Free mencantumkan database 500 MB; dokumentasinya menyatakan project masuk read-only ketika ukuran database melewati kuota tersebut [9][18]. Karsa terakhir dilaporkan sekitar 12 MB, sehingga masih longgar, tetapi chat menghasilkan pertumbuhan terus-menerus dan index/bloat ikut memakai ruang.

Perkiraan kapasitas harus diukur setelah implementasi, bukan diasumsikan dari panjang teks saja. Sebagai budget konservatif, tetapkan alarm internal pada 60%, 75%, dan 85% dari kuota, ukur `pg_database_size`, ukuran tabel/index forum, jumlah pesan per hari, dan rata-rata byte per row. Retensi semester adalah kontrol biaya paling efektif.

Realtime Free menyediakan 200 koneksi puncak dan dua juta messages per bulan [9]. Satu database change dihitung sekali untuk setiap client yang menerima; satu broadcast dihitung sebagai event pengirim ditambah setiap penerima [10]. Artinya grup berisi 50 orang dapat menghasilkan sekitar 50 event untuk satu pesan ketika semuanya tersambung. Empat kelas yang aktif bersamaan juga dapat mendekati 200 koneksi.

Karena mobile Karsa memakai custom bearer session, sedangkan Supabase Realtime Authorization mengandalkan JWT claims dan policy channel, menyambungkan app langsung ke Realtime menambah jalur auth baru [8]. MVP yang lebih aman adalah API pagination ditambah refresh manual atau polling adaptif hanya saat layar grup terlihat. Realtime baru ditambahkan setelah kontrak JWT/channel private, revocation, quota monitoring, dan reconnect cleanup diuji. Supabase menyatakan Broadcast adalah opsi yang direkomendasikan untuk scalability/security dibanding Postgres Changes, dan private channel membutuhkan authorization [8][11].

## 8. Rekomendasi Final [Confidence: High]

Pilih **Skenario B** dengan definisi privasi berikut:

> Percakapan grup Karsa hanya tersedia bagi seluruh mahasiswa dan seluruh PJ mata kuliah dalam kelas yang sama melalui aplikasi mobile. Setiap PJ hanya memiliki hak kelola tambahan pada grup mata kuliah yang menjadi tanggung jawabnya. Karsa tidak menyediakan pembacaan percakapan melalui dashboard admin. Isi tertentu hanya dibagikan di luar grup bila pengguna secara sadar membuat laporan atau eskalasi. Data tetap diproses dan disimpan pada infrastruktur Karsa/Supabase dan karena itu bukan end-to-end encrypted.

Desain MVP:

- Stream pesan teks per `KelasMatkul`, dengan reply-to dan pin.
- Mobile-only; tidak ada route, component, navigation, search, export, atau analytics forum di web.
- Admin ditolak eksplisit oleh forum API kecuali admin tersebut juga merupakan anggota kelas biasa; rekomendasi lebih aman adalah akun admin tidak pernah menjadi anggota.
- Keanggotaan kelas diverifikasi dari database untuk setiap read/write penting; kecocokan `pj_id` diverifikasi lagi untuk pin, lock, dan moderasi.
- Kebijakan satu PJ satu mata kuliah tidak diwujudkan sebagai unique constraint database.
- Pagination berbasis cursor; belum Realtime.
- Edit 15 menit; soft delete; body terhapus dibuang setelah 30 hari.
- PJ dapat lock/pin/hide di room sendiri.
- Mute/block/report tersedia di mobile.
- Report mahasiswa ditangani PJ; report terhadap PJ menggunakan auto-hide threshold dan escalation opt-in.
- Audit hanya metadata, tidak menduplikasi message body.
- Retensi sampai akhir semester + 90 hari.
- Tidak ada upload, link preview, rich HTML, typing, presence, read receipt, DM, atau notifikasi push pada MVP.

Pilihan ini tidak membuat klaim privasi berlebihan, menjaga pemulihan login/riwayat, sesuai dengan arsitektur saat ini, dan dapat ditingkatkan ke application-layer encryption atau E2EE nanti jika threat model berubah.

## 9. Action Plan

- [ ] Setujui pernyataan privasi dan model report terhadap PJ sebelum schema dibuat.
- [ ] Jalankan backup production dan verifikasi artifact sebelum migrasi.
- [ ] Buat progress log khusus fitur grup dan update per milestone.
- [ ] Rancang schema, constraint, index, retention, dan grant/RLS tanpa menjalankan migrasi dahulu.
- [ ] Implementasikan API mobile dengan membership check serta denial eksplisit untuk admin.
- [ ] Implementasikan UI grup Flutter text-only dengan pagination.
- [ ] Implementasikan mute, block, report, PJ lock/pin/hide, dan auto-hide conflict path.
- [ ] Tambahkan Terms/Community Rules dan disclosure privasi sebelum pengguna pertama mengirim pesan.
- [ ] Uji IDOR lintas kelas, PJ lama, token revoke, spam, edit window, soft delete, dan report conflict.
- [ ] Deploy preview, jalankan migrasi terkontrol, lalu uji restore sebelum production.
- [ ] Ukur pertumbuhan database dan usage; evaluasi Realtime setelah pilot.

## 10. Open Questions & Caveats

1. Ambang auto-hide untuk laporan terhadap PJ belum ditentukan. Angka terlalu rendah mudah disalahgunakan; angka terlalu tinggi tidak melindungi korban.
2. Belum ada keputusan apakah message dari user yang diblokir disembunyikan penuh atau tampil sebagai placeholder. Untuk konteks akademik, placeholder yang dapat dibuka lebih aman terhadap kehilangan informasi penting.
3. Masa retensi semester + 90 hari adalah rekomendasi awal, bukan kebijakan universitas.
4. Jika aplikasi akan masuk App Store/Play Store, Terms, contact path, report response, dan block behavior harus diuji terhadap kebijakan store saat tanggal rilis karena kebijakan dapat berubah.
5. “Tidak ada akses admin web” adalah properti produk dan authorization, bukan jaminan bahwa operator database tidak pernah bisa membaca. Hanya E2EE yang menargetkan ancaman operator server secara langsung.

## Methodology

Riset dilakukan pada kedalaman standard. Area yang ditinjau adalah threat model, authorization, mobile session/storage, E2EE group messaging, UGC safety policy, Supabase Free/Realtime, backup, serta kondisi arsitektur lokal Karsa. Sumber diprioritaskan dari OWASP, IETF, NIST, PostgreSQL, Supabase, Apple, dan Google. Klaim keputusan utama diperiksa silang dengan dokumentasi resmi dan source lokal.

Rencana awal memisahkan “mobile-only” dari “cryptographically inaccessible” karena keduanya sering disamakan. Bukti kemudian menambahkan satu bagian yang lebih kuat mengenai UGC policy: closed school group tetap memerlukan report, sehingga desain tanpa mekanisme keselamatan sama sekali tidak dapat direkomendasikan. Tidak digunakan subagent karena batas orkestrasi sesi; verifikasi dilakukan langsung pada halaman sumber utama.

## Bibliography

[1] OWASP — Authorization Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html — Diakses 2026-09-24 — Tier 1

[2] OWASP — REST Security Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html — Diakses 2026-09-24 — Tier 1

[3] Supabase — Securing your API — https://supabase.com/docs/guides/api/securing-your-api — Diakses 2026-09-24 — Tier 1

[4] Supabase — Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security — Diakses 2026-09-24 — Tier 1

[5] OWASP — Cryptographic Storage Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html — Diakses 2026-09-24 — Tier 1

[6] OWASP — Mobile Application Security Verification Standard — https://mas.owasp.org/MASVS/ — Diakses 2026-09-24 — Tier 1

[7] OWASP — Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — Diakses 2026-09-24 — Tier 1

[8] Supabase — Realtime Authorization — https://supabase.com/docs/guides/realtime/authorization — Diakses 2026-09-24 — Tier 1

[9] Supabase — Pricing & Fees — https://supabase.com/pricing — Diakses 2026-09-24 — Tier 1

[10] Supabase — Manage Realtime Messages usage — https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages — Diakses 2026-09-24 — Tier 1

[11] Supabase — Subscribing to Database Changes — https://supabase.com/docs/guides/realtime/subscribing-to-database-changes — Diakses 2026-09-24 — Tier 1

[12] IETF/RFC Editor — RFC 9420: The Messaging Layer Security Protocol — https://www.rfc-editor.org/rfc/rfc9420.html — Diakses 2026-09-24 — Tier 1, foundational

[13] Google Play — User-generated content policy — https://support.google.com/googleplay/android-developer/answer/9876937 — Diakses 2026-09-24 — Tier 1

[14] Apple Developer — App Review Guidelines, Guideline 1.2 — https://developer.apple.com/app-store/review/guidelines/ — Diakses 2026-09-24 — Tier 1

[15] NIST — Privacy Framework — https://www.nist.gov/privacy-framework — Diakses 2026-09-24 — Tier 1, foundational

[16] NIST — Privacy Framework Getting Started — https://www.nist.gov/privacy-framework/getting-started-0 — Diakses 2026-09-24 — Tier 1, foundational

[17] Supabase — Database Backups — https://supabase.com/docs/guides/platform/backups — Diakses 2026-09-24 — Tier 1

[18] Supabase — Understanding Database and Disk Size — https://supabase.com/docs/guides/platform/database-size — Diakses 2026-09-24 — Tier 1

## Source Extracts

### [1]–[4] Authorization

- OWASP merekomendasikan least privilege, deny-by-default, dan validasi izin pada setiap request.
- REST endpoint nonpublik harus melakukan access control di setiap endpoint dan membatasi/validasi input.
- Supabase menjelaskan grants dan RLS sebagai lapisan terpisah; policy per operasi membuat maksud izin lebih jelas.

### [5]–[7] Crypto, mobile, dan session

- Pemilihan lokasi enkripsi harus mengikuti threat model; enkripsi tidak menggantikan access control.
- MASVS memisahkan secure storage, cryptography, authentication, network, platform, code, resilience, dan privacy.
- Session harus memiliki expiration dan invalidation server-side.

### [8]–[11] Realtime dan kuota

- Private Realtime channels dapat diotorisasi memakai RLS dan JWT claims.
- Free plan saat diakses mencantumkan 500 MB database, 200 concurrent Realtime connections, dan dua juta Realtime messages per bulan.
- Fan-out dihitung per client penerima sehingga group chat dapat mengonsumsi quota lebih cepat daripada jumlah pesan yang dikirim user.

### [12] E2EE grup

- MLS menargetkan asynchronous group key establishment dengan forward secrecy dan post-compromise security.
- Perubahan anggota serta perangkat memerlukan pengelolaan epoch dan key update; ini bukan sekadar mengenkripsi string dengan satu shared key statis.

### [13]–[14] User-generated content

- Google Play mewajibkan in-app reporting bahkan untuk UGC pada lingkungan sekolah/perusahaan dengan user terverifikasi.
- Apple mensyaratkan filtering, reporting, blocking abusive users, timely response, dan contact information untuk aplikasi UGC.

### [15]–[18] Privacy lifecycle dan backup

- NIST menempatkan privacy risk dalam seluruh lifecycle data dan mendorong data minimization serta pengelolaan deletion/audit.
- Supabase menyarankan free-tier melakukan logical export/off-site backup secara berkala.
- Dokumentasi Supabase menyatakan database Free masuk read-only setelah melewati kuota 500 MB.
