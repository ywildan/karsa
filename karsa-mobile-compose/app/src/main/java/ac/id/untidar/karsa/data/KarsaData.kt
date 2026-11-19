package ac.id.untidar.karsa.data

import ac.id.untidar.karsa.Role
import ac.id.untidar.karsa.ui.Tone
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

private const val DAY = 86_400_000L
private val idLocale = Locale("id", "ID")

/* ───────────── Identitas ───────────── */

data class Me(
    val id: String,
    val name: String,
    val email: String,
    val nim: String,
    val fakultas: String,
    val prodi: String,
    val kelas: String,
    val semester: Int,
)

val ME = Me(
    id = "me",
    name = "Nadia Putri Maharani",
    email = "nadia.putri@student.karsa.ac.id",
    nim = "2310114028",
    fakultas = "Fakultas Ilmu Komputer",
    prodi = "Sistem Informasi",
    kelas = "SI-4B",
    semester = 4,
)

fun maskNim(nim: String): String =
    nim.take(2) + "•".repeat(max(nim.length - 5, 0)) + nim.takeLast(3)

/* ───────────── Waktu ───────────── */

fun startOfToday(): Long = Calendar.getInstance().apply {
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
}.timeInMillis

fun at(daysAgo: Int, hhmm: String): Long {
    val (hour, minute) = hhmm.split(":").map { it.toInt() }
    return startOfToday() - daysAgo * DAY + (hour * 60 + minute) * 60_000L
}

fun ago(minutes: Long): Long = System.currentTimeMillis() - minutes * 60_000L

fun fmtTime(ts: Long): String = SimpleDateFormat("HH.mm", idLocale).format(Date(ts))
fun fmtDate(ts: Long): String = SimpleDateFormat("d MMM yyyy", idLocale).format(Date(ts))
fun fmtDayShort(ts: Long): String = SimpleDateFormat("d MMM", idLocale).format(Date(ts))

fun dayKey(ts: Long): Long = Calendar.getInstance().apply {
    timeInMillis = ts
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
}.timeInMillis

fun dayLabel(ts: Long): String {
    val diff = ((startOfToday() - dayKey(ts)) / DAY).toInt()
    if (diff <= 0) return "Hari ini"
    if (diff == 1) return "Kemarin"
    return SimpleDateFormat("EEEE, d MMM", idLocale).format(Date(ts))
}

fun relTime(ts: Long): String {
    val diff = System.currentTimeMillis() - ts
    val min = (diff / 60_000).toInt()
    if (min < 1) return "Baru saja"
    if (min < 60) return "$min mnt lalu"
    val hr = min / 60
    if (hr < 24) return "$hr jam lalu"
    val d = hr / 24
    if (d == 1) return "Kemarin"
    if (d < 7) return "$d hari lalu"
    return fmtDayShort(ts)
}

fun chatStamp(ts: Long): String {
    val diff = System.currentTimeMillis() - ts
    val min = (diff / 60_000).toInt()
    if (min < 1) return "Baru saja"
    if (min < 60) return "$min mnt"
    val hr = min / 60
    if (hr < 24) return "$hr j"
    val d = hr / 24
    if (d == 1) return "Kemarin"
    return fmtDayShort(ts)
}

/* ───────────── Mata kuliah & kelas ───────────── */

data class Course(
    val id: String,
    val name: String,
    val kelas: String,
    val members: Int,
    val locked: Boolean,
    val pjMe: Boolean,
    val pjOther: String,
    val tone: Tone,
)

val COURSES: List<Course> = listOf(
    Course("c1", "Basis Data Lanjut", "SI-4B", 38, locked = false, pjMe = true, pjOther = "Dimas Aryo", tone = Tone.Brand),
    Course("c2", "Pemrograman Web", "SI-4B", 38, locked = false, pjMe = true, pjOther = "Salsabila Nur", tone = Tone.Tide),
    Course("c3", "Interaksi Manusia & Komputer", "SI-4B", 36, locked = true, pjMe = false, pjOther = "Raka Pratama", tone = Tone.Plum),
    Course("c4", "Statistika Terapan", "SI-4A", 41, locked = false, pjMe = false, pjOther = "Salsabila Nur", tone = Tone.Leaf),
    Course("c5", "Etika Profesi TI", "SI-4B", 38, locked = true, pjMe = true, pjOther = "Raka Pratama", tone = Tone.Butter),
)

fun courseById(id: String): Course = COURSES.first { it.id == id }

fun pjLabel(course: Course, role: Role): String =
    if (role == Role.Pj && course.pjMe) "Kamu PJ" else "PJ ${course.pjOther}"

fun isPjOf(course: Course, role: Role): Boolean = role == Role.Pj && course.pjMe

fun myCourses(role: Role): List<Course> = COURSES.filter { role == Role.Pj && it.pjMe }

/* ───────────── Mahasiswa ───────────── */

data class Student(val id: String, val name: String, val nim: String)

val STUDENTS: List<Student> = listOf(
    Student("s1", "Aulia Rahmawati", "2310114002"),
    Student("s2", "Bagas Setiawan", "2310114007"),
    Student("s3", "Cahya Ningrum", "2310114011"),
    Student("s4", "Dimas Aryo Wibowo", "2310114015"),
    Student("s5", "Eka Fitriani", "2310114019"),
    Student("s6", "Fajar Nugroho", "2310114023"),
    Student("s7", "Gita Permata Sari", "2310114031"),
    Student("s8", "Hanif Maulana", "2310114036"),
    Student("s9", "Intan Kusuma Dewi", "2310114040"),
    Student("s10", "Jihan Aprilia", "2310114044"),
    Student("s11", "Kevin Santoso", "2310114047"),
    Student("s12", "Laras Wulandari", "2310114052"),
    Student("s13", "Muhammad Rizky", "2310114058"),
    Student("s14", "Nabila Zahra", "2310114061"),
)

fun studentById(id: String): Student = STUDENTS.first { it.id == id }

sealed interface SearchResult {
    data class Hint(val message: String) : SearchResult
    data class Found(val items: List<Student>) : SearchResult
}

fun searchStudents(raw: String): SearchResult {
    val q = raw.trim().lowercase()
    if (q.isEmpty()) return SearchResult.Hint("")
    if (q.all { it.isDigit() }) {
        if (q.length < 2) return SearchResult.Hint("Ketik minimal 2 digit terakhir NIM.")
        if (q.length > 4) return SearchResult.Found(STUDENTS.filter { it.nim.contains(q) })
        return SearchResult.Found(STUDENTS.filter { it.nim.endsWith(q) })
    }
    if (q.length < 3) return SearchResult.Hint("Ketik minimal 3 huruf nama.")
    return SearchResult.Found(STUDENTS.filter { it.name.lowercase().contains(q) })
}

/* ───────────── Kategori & poin ───────────── */

data class Category(val id: String, val label: String)

val CATEGORIES: List<Category> = listOf(
    Category("tanya", "Bertanya di kelas"),
    Category("jawab", "Menjawab pertanyaan"),
    Category("diskusi", "Aktif dalam diskusi kelompok"),
    Category("presentasi", "Presentasi / paparan"),
    Category("bantu", "Membantu teman belajar"),
    Category("latihan", "Mengerjakan soal di depan kelas"),
    Category("ide", "Ide atau usulan konstruktif"),
)

fun categoryLabel(id: String): String = CATEGORIES.firstOrNull { it.id == id }?.label ?: id

val POINT_LABELS: Map<Int, String> = mapOf(1 to "Ikut serta", 2 to "Aktif", 3 to "Berbobot", 4 to "Luar biasa")

data class PointEntry(
    val id: String,
    val ts: Long,
    val studentId: String,
    val points: Int,
    val categoryId: String,
    val courseId: String,
    val note: String? = null,
)

val SEED_ENTRIES: List<PointEntry> = listOf(
    PointEntry("e1", at(0, "09:12"), "s1", 3, "jawab", "c1", "Menjelaskan beda 3NF dan BCNF dengan contoh tabel pesanan."),
    PointEntry("e2", at(0, "08:41"), "s4", 2, "tanya", "c1"),
    PointEntry("e3", at(1, "13:20"), "s9", 4, "presentasi", "c2", "Presentasi prototipe Figma 7 menit, runtut dan rapi."),
    PointEntry("e4", at(1, "10:05"), "s2", 1, "diskusi", "c2"),
    PointEntry("e5", at(1, "09:30"), "s14", 3, "bantu", "c1", "Mengajari teman satu kelompok menulis query JOIN."),
    PointEntry("e6", at(2, "15:10"), "s6", 2, "latihan", "c5"),
    PointEntry("e7", at(3, "11:00"), "s11", 3, "ide", "c2", "Mengusulkan skema pembagian modul tugas kelompok."),
    PointEntry("e8", at(3, "08:55"), "s3", 2, "jawab", "c1"),
    PointEntry("e9", at(4, "13:45"), "s10", 4, "presentasi", "c5", "Studi kasus etika data pribadi, sangat terstruktur."),
    PointEntry("e10", at(5, "10:20"), "s8", 1, "tanya", "c2"),
    PointEntry("e11", at(6, "09:00"), "s12", 3, "diskusi", "c1", "Memimpin diskusi kelompok studi kasus."),
)

data class MyEntry(
    val id: String,
    val ts: Long,
    val points: Int,
    val categoryId: String,
    val courseId: String,
    val note: String? = null,
)

val MY_ENTRIES: List<MyEntry> = listOf(
    MyEntry("m1", at(0, "10:30"), 3, "jawab", "c1", "Menjawab pertanyaan dosen tentang indeks komposit."),
    MyEntry("m2", at(2, "09:15"), 4, "presentasi", "c1", "Presentasi rancangan ERD kelompok 3."),
    MyEntry("m3", at(6, "08:50"), 2, "tanya", "c1"),
    MyEntry("m4", at(1, "13:10"), 3, "ide", "c2", "Usulan struktur komponen untuk proyek akhir."),
    MyEntry("m5", at(4, "10:40"), 2, "diskusi", "c2"),
    MyEntry("m6", at(9, "10:00"), 4, "bantu", "c2", "Membantu 3 teman debugging routing."),
    MyEntry("m7", at(3, "14:00"), 2, "tanya", "c3"),
    MyEntry("m8", at(5, "11:25"), 3, "latihan", "c5"),
    MyEntry("m9", at(12, "11:25"), 3, "diskusi", "c5", "Diskusi dilema etika AI di kelas."),
)

data class RankRow(
    val id: String,
    val name: String,
    val nim: String,
    val total: Int,
    val me: Boolean = false,
)

val RANK_COURSES: List<String> = listOf("c1", "c2", "c3", "c5")

private val RANK_SCORES: Map<String, List<Int>> = mapOf(
    "s1" to listOf(11, 9, 5, 8),
    "s2" to listOf(4, 6, 3, 2),
    "s3" to listOf(7, 5, 6, 4),
    "s4" to listOf(6, 5, 4, 5),
    "s5" to listOf(10, 8, 7, 6),
    "s6" to listOf(9, 8, 6, 5),
    "s7" to listOf(7, 6, 5, 3),
    "s8" to listOf(3, 4, 2, 3),
    "s9" to listOf(9, 10, 6, 7),
    "s10" to listOf(7, 9, 5, 6),
    "s11" to listOf(5, 7, 4, 2),
    "s12" to listOf(8, 4, 3, 4),
    "s13" to listOf(3, 3, 2, 2),
    "s14" to listOf(9, 8, 5, 7),
)

fun rankingFor(key: String): List<RankRow> {
    val keys = if (key == "all") RANK_COURSES else listOf(key)
    val rows = STUDENTS.map { student ->
        val scores = RANK_SCORES.getValue(student.id)
        val total = keys.sumOf { courseKey -> scores[RANK_COURSES.indexOf(courseKey)] }
        RankRow(student.id, student.name, student.nim, total)
    }.toMutableList()
    val mine = MY_ENTRIES.filter { it.courseId in keys }.sumOf { it.points }
    rows += RankRow("me", ME.name, ME.nim, mine, me = true)
    return rows.sortedWith(compareByDescending<RankRow> { it.total }.thenBy { it.name })
}

/* ───────────── Karsa Lib ───────────── */

enum class ArticleStatus { Draft, Published }

data class Article(
    val id: String,
    val title: String,
    val body: String,
    val author: String,
    val prodi: String,
    val ts: Long,
    val readers: Int,
    val tag: String,
    val mine: Boolean = false,
    val status: ArticleStatus? = null,
)

data class Comment(
    val id: String,
    val articleId: String,
    val parentId: String? = null,
    val author: String,
    val ts: Long,
    val text: String,
    val mine: Boolean = false,
)

val SEED_ARTICLES: List<Article> = listOf(
    Article(
        id = "a1",
        title = "Normalisasi tanpa pusing: dari 1NF sampai BCNF lewat satu studi kasus",
        author = "Rafi Hidayat",
        prodi = "Sistem Informasi",
        ts = ago(60 * 26),
        readers = 214,
        tag = "Basis Data",
        body = """
            Banyak dari kita menghafal definisi normalisasi, tetapi baru paham ketika melihat satu tabel yang *berantakan* dirapikan langkah demi langkah. Catatan ini memakai satu kasus: tabel pesanan kantin kampus.

            ## Mulai dari tabel yang berantakan

            Bayangkan satu tabel `pesanan` yang menyimpan nama pembeli, daftar menu (dipisah koma), harga, dan nama penjual dalam satu baris. Masalahnya jelas: satu sel berisi banyak nilai, dan nama penjual berulang di mana-mana.

            ## 1NF: satu sel, satu nilai

            Pecah daftar menu menjadi baris-baris terpisah. Setiap baris hanya memuat satu menu untuk satu pesanan.

            - Hilangkan kolom berisi daftar
            - Tentukan kunci utama gabungan: `id_pesanan` + `id_menu`
            - Pastikan tidak ada grup berulang

            ## 2NF dan 3NF: buang ketergantungan yang tidak perlu

            Harga menu hanya bergantung pada `id_menu`, bukan pada pesanan. Pindahkan ke tabel `menu`. Nama penjual bergantung pada menu, bukan pesanan, jadi pindahkan lagi ke tabel `penjual`.

            > Aturan praktis: setiap kolom harus menjawab satu pertanyaan, "ini fakta tentang apa?"

            ## BCNF: kapan perlu?

            Jika ada determinan yang bukan kunci kandidat, pecah lagi. Di kasus kantin, hal ini muncul ketika satu penjual hanya menempati satu kios. Coba periksa sendiri dan diskusikan di kolom komentar.
        """.trimIndent(),
    ),
    Article(
        id = "a2",
        title = "Kapan sebenarnya kita butuh useMemo? Catatan dari proyek akhir Pemrograman Web",
        author = "Salsabila Nur",
        prodi = "Sistem Informasi",
        ts = ago(60 * 50),
        readers = 156,
        tag = "Pemrograman Web",
        body = """
            Waktu mengerjakan proyek akhir, saya sempat membungkus semua hitungan dengan `useMemo`. Hasilnya kode jadi sulit dibaca dan performa tidak berubah.

            ## Ukur dulu, optimalkan kemudian

            Gunakan React Profiler. Jika sebuah komponen render kurang dari 1 ms, memoization justru menambah beban.

            ## Tiga kasus yang memang layak

            - Hitungan berat, misalnya memfilter 10.000 baris data
            - Objek atau fungsi yang dikirim ke komponen anak yang sudah di-*memo*
            - Dependensi untuk `useEffect` yang tidak boleh berubah tiap render

            > Optimasi tanpa pengukuran hanyalah dekorasi.
        """.trimIndent(),
    ),
    Article(
        id = "a3",
        title = "Menyusun kuesioner usability yang tidak menggiring jawaban",
        author = "Raka Pratama",
        prodi = "Sistem Informasi",
        ts = ago(60 * 24 * 3),
        readers = 98,
        tag = "IMK",
        body = """
            Pertanyaan seperti "Seberapa mudah aplikasi ini digunakan?" sudah menggiring responden ke jawaban positif. Berikut tiga cara membuatnya lebih netral.

            ## Gunakan skala yang seimbang

            Sediakan pilihan negatif dan positif dalam jumlah sama, misalnya sangat sulit sampai sangat mudah.

            ## Tanyakan tugas, bukan opini

            Minta responden menyelesaikan tugas tertentu, lalu catat waktu dan kegagalannya. Data perilaku lebih jujur daripada pendapat.

            ## Pisahkan satu pertanyaan, satu hal

            Hindari pertanyaan ganda seperti "cepat dan mudah dipakai?". Pecah menjadi dua.
        """.trimIndent(),
    ),
    Article(
        id = "a4",
        title = "Uji hipotesis dalam 10 menit: memilih uji-t atau Mann-Whitney",
        author = "Dimas Aryo",
        prodi = "Sistem Informasi",
        ts = ago(60 * 24 * 5),
        readers = 87,
        tag = "Statistika",
        body = """
            Sebelum membuka SPSS, jawab dua pertanyaan: apakah datamu berdistribusi normal, dan apakah sampelnya independen?

            ## Alur singkat

            - Data normal dan independen: uji-t independen
            - Data tidak normal: Mann-Whitney U
            - Data berpasangan: uji-t berpasangan atau Wilcoxon

            > Nilai p kecil bukan berarti efeknya besar. Selalu laporkan ukuran efek.
        """.trimIndent(),
    ),
    Article(
        id = "a5",
        title = "Presentasi 5 menit yang diingat dosen: struktur sederhana yang saya pakai",
        author = "Intan Kusuma Dewi",
        prodi = "Sistem Informasi",
        ts = ago(60 * 24 * 8),
        readers = 132,
        tag = "Soft skill",
        body = """
            Waktu presentasi singkat, kunci utamanya adalah memilih satu pesan. Saya memakai struktur tiga bagian: masalah, ide, bukti.

            ## Masalah dalam satu kalimat

            Tulis satu kalimat yang bisa dipahami teman sekelas yang belum membaca apa pun.

            ## Ide dan bukti

            Tampilkan satu gambar atau grafik per slide. Hindari paragraf di slide.
        """.trimIndent(),
    ),
)

val SEED_COMMENTS: List<Comment> = listOf(
    Comment("k1", "a1", author = "Aulia Rahmawati", ts = ago(60 * 20), text = "Bagian BCNF-nya jelas banget, makasih Kak! Studi kasus kantin lebih mudah dibayangkan daripada slide dosen."),
    Comment("k2", "a1", "k1", "Rafi Hidayat", ago(60 * 18), "Sama-sama Aulia! Kalau mau latihan, coba normalisasi tabel peminjaman buku perpustakaan."),
    Comment("k3", "a1", "k1", "Bagas Setiawan", ago(60 * 15), "Nah itu juga muncul di kuis tahun lalu."),
    Comment("k4", "a1", author = "Hanif Maulana", ts = ago(60 * 9), text = "Kalau ada ketergantungan multivalued, lanjut ke 4NF ya?"),
    Comment("k5", "a1", "k4", "Rafi Hidayat", ago(60 * 7), "Betul. Akan saya bahas di tulisan lanjutan."),
    Comment("k6", "a2", author = "Kevin Santoso", ts = ago(60 * 30), text = "Kutipan terakhirnya pas banget."),
    Comment("k7", "a2", author = "Laras Wulandari", ts = ago(60 * 22), text = "Boleh share contoh Profiler-nya?"),
    Comment("k8", "a3", author = "Nabila Zahra", ts = ago(60 * 24 * 2), text = "Langsung kupakai untuk tugas IMK minggu ini."),
)

fun excerptOf(body: String): String {
    val para = body.split("\n").map { it.trim() }.firstOrNull {
        it.isNotEmpty() && !Regex("^(#|>|-|```)").containsMatchIn(it)
    } ?: ""
    return para.replace(Regex("[*`_]|\\[([^\\]]+)\\]\\([^)]+\\)"), "\$1")
}

/* ───────────── Grup ───────────── */

data class Msg(
    val id: String,
    val from: String,
    val text: String,
    val ts: Long,
    val pinned: Boolean = false,
    val deleted: Boolean = false,
    val edited: Boolean = false,
    val hidden: Boolean = false,
)

val SEED_CHATS: Map<String, List<Msg>> = mapOf(
    "c1" to listOf(
        Msg("c1-1", "pj", "Pengumuman: kuis normalisasi hari Kamis pukul 10.00 di Lab 3. Bawa kalkulator dan kartu mahasiswa.", ago(60 * 26), pinned = true),
        Msg("c1-2", "s1", "Kak, materi kuisnya sampai bab berapa ya?", ago(60 * 5)),
        Msg("c1-3", "pj", "Sampai bab 4 (normalisasi). Slide-nya sudah ada di drive kelas.", ago(60 * 5)),
        Msg("c1-4", "s4", "Siap, makasih banyak Kak!", ago(60 * 4)),
        Msg("c1-5", "s9", "Ada yang punya catatan BCNF? Aku ketinggalan pertemuan kemarin.", ago(190)),
        Msg("c1-6", "s14", "Aku punya, nanti kufoto dan kukirim di sini ya.", ago(150)),
        Msg("c1-7", "s2", "", ago(120), deleted = true),
        Msg("c1-8", "me", "Ringkasannya juga sudah kutulis di Karsa Lib, cari judul 'Normalisasi tanpa pusing'.", ago(70)),
        Msg("c1-9", "s1", "Mantap, langsung kubaca!", ago(35)),
        Msg("c1-10", "s6", "Terima kasih ya, sangat membantu!", ago(12)),
    ),
    "c2" to listOf(
        Msg("c2-1", "pj", "Deadline proposal proyek akhir diundur ke Senin, 23.59.", ago(60 * 30), pinned = true),
        Msg("c2-2", "s11", "Repo template-nya boleh di-fork atau harus clone?", ago(60 * 3)),
        Msg("c2-3", "me", "Fork saja, lalu tambahkan dosen sebagai collaborator.", ago(60 * 2)),
        Msg("c2-4", "s10", "Oke, sudah kuikuti. Terima kasih Nadia!", ago(60 * 2)),
    ),
    "c3" to listOf(
        Msg("c3-1", "pj", "Grup dikunci sampai UTS selesai. Pertanyaan tugas lewat PJ ya.", ago(60 * 24 * 2), pinned = true),
        Msg("c3-2", "pj", "Hasil heuristic evaluation kelompok 1–4 sudah diunggah.", ago(60 * 6)),
    ),
    "c4" to listOf(
        Msg("c4-1", "s5", "Ada yang tahu cara menghitung df untuk uji-t berpasangan?", ago(60)),
        Msg("c4-2", "s7", "n dikurangi 1, ya.", ago(60)),
        Msg("c4-3", "s13", "Betul, df = n − 1", ago(55)),
        Msg("c4-4", "s5", "Siap, jelas. Makasih.", ago(40)),
        Msg("c4-5", "s7", "Besok bawa tabel distribusi t ya.", ago(25)),
    ),
    "c5" to listOf(
        Msg("c5-1", "pj", "Grup ini dikunci. Hanya PJ yang mengirim info jadwal presentasi.", ago(60 * 24 * 4), pinned = true),
        Msg("c5-2", "pj", "Jadwal presentasi kelompok: Selasa pukul 13.00, ruang B2.", ago(60 * 24)),
    ),
)

val UNREAD: Map<String, Int> = mapOf("c1" to 2, "c2" to 0, "c3" to 1, "c4" to 5, "c5" to 0)

/* ───────────── Profil penulis ───────────── */

val FAKULTAS: Map<String, List<String>> = linkedMapOf(
    "Fakultas Ilmu Komputer" to listOf("Sistem Informasi", "Teknik Informatika", "Sains Data"),
    "Fakultas Ekonomi dan Bisnis" to listOf("Manajemen", "Akuntansi"),
    "Fakultas Teknik" to listOf("Teknik Sipil", "Teknik Industri"),
)

val KELAS_OPTIONS: List<String> = listOf("SI-4A", "SI-4B", "SI-4C")

/* ───────────── Dokumen hukum ───────────── */

data class LegalSection(val h: String, val p: String)
data class LegalDocument(val title: String, val updated: String, val sections: List<LegalSection>)

val LEGAL_TERMS = LegalDocument(
    title = "Syarat Penggunaan",
    updated = "Diperbarui 2 Januari 2026",
    sections = listOf(
        LegalSection("1. Penggunaan akun", "SiKarsa hanya untuk civitas akademika. Kamu bertanggung jawab atas aktivitas yang dilakukan melalui akunmu dan tidak boleh membagikan akses kepada orang lain."),
        LegalSection("2. Pencatatan poin keaktifan", "PJ kelas mencatat poin berdasarkan kontribusi nyata di kelas. Setiap perubahan atau penghapusan entri tercatat di audit log dan dapat ditinjau oleh dosen pengampu."),
        LegalSection("3. Konten Karsa Lib dan grup", "Tulisan dan pesan harus menghormati sesama, bebas dari plagiarisme, ujaran kebencian, dan spam. Konten yang dilaporkan dapat disembunyikan atau dihapus oleh pengelola."),
        LegalSection("4. Sanksi", "Pelanggaran dapat berakibat pembatasan akses menulis, pemblokiran dari grup, hingga pelaporan ke pihak program studi."),
    ),
)

val LEGAL_PRIVACY = LegalDocument(
    title = "Kebijakan Privasi",
    updated = "Diperbarui 2 Januari 2026",
    sections = listOf(
        LegalSection("Data yang kami simpan", "Nama, email kampus, NIM, program studi, kelas, serta aktivitas yang kamu lakukan di dalam aplikasi seperti poin, tulisan, dan pesan grup."),
        LegalSection("Penyamaran NIM", "NIM milik mahasiswa lain selalu ditampilkan sebagian (misalnya 23•••••061). NIM lengkap hanya terlihat oleh pemiliknya."),
        LegalSection("Penggunaan data", "Data digunakan untuk rekap keaktifan akademik, peringkat partisipasi, serta personalisasi konten Karsa Lib di program studimu. Kami tidak menjual data kepada pihak ketiga."),
        LegalSection("Hak kamu", "Kamu dapat meminta koreksi data lewat PJ kelas atau admin program studi, dan keluar dari aplikasi kapan saja."),
    ),
)
