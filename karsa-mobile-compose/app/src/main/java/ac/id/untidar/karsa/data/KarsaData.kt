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

enum class ArticleStatus { Draft, Published, Archived }

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
    val authorId: String = "",
    val commentsCount: Int = 0,
    val updatedAt: Long = ts,
    val aiEnabled: Boolean = false,
    val aiRevision: String? = null,
)

data class Comment(
    val id: String,
    val articleId: String,
    val parentId: String? = null,
    val author: String,
    val ts: Long,
    val text: String,
    val mine: Boolean = false,
    val deleted: Boolean = false,
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
    val authorId: String = "",
    val authorName: String = "",
    val isManagerAuthor: Boolean = false,
    val canEdit: Boolean = false,
    val canDelete: Boolean = false,
    val canManage: Boolean = false,
    val blocked: Boolean = false,
    val hiddenReason: String? = null,
    val replyToId: String? = null,
    val replyToName: String? = null,
    val replyToText: String? = null,
    val state: String = "active",
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

const val LEGAL_VERSION = "1.1"
const val LEGAL_EFFECTIVE = "6 Oktober 2026"
const val LEGAL_CONTACT = "admin@sikarsa.id"

data class LegalSection(val h: String, val p: List<String>)

data class LegalDocument(
    val title: String,
    val summary: String,
    val version: String,
    val effective: String,
    val sections: List<LegalSection>,
)

val LEGAL_TERMS = LegalDocument(
    title = "Syarat Penggunaan",
    summary = "Aturan sederhana agar pencatatan poin, percakapan kelas, dan berbagi pengetahuan di Karsa tetap dapat dipercaya.",
    version = LEGAL_VERSION,
    effective = LEGAL_EFFECTIVE,
    sections = listOf(
        LegalSection(
            "1. Tentang Karsa dan akun",
            listOf(
                "Karsa adalah layanan pendukung kegiatan mahasiswa yang menyediakan pencatatan poin keaktifan, laporan, peringkat, grup kelas, dan Karsa Lib. Informasi di Karsa bukan pengganti dokumen akademik resmi universitas.",
                "Untuk masuk ke aplikasi mobile, gunakan akun Google mahasiswa UNTIDAR milikmu sendiri dengan alamat @students.untidar.ac.id. Akses ke fitur tertentu bergantung pada data kelas, penugasan PJ, program studi, dan izin penulis yang tercatat di sistem. Jangan meminjamkan akun atau mencoba memakai identitas orang lain.",
            ),
        ),
        LegalSection(
            "2. Poin, laporan, dan grup kelas",
            listOf(
                "PJ mata kuliah hanya boleh mencatat poin berdasarkan kegiatan yang benar-benar terjadi untuk kelas dan mata kuliah yang ditugaskan. Dilarang membuat catatan palsu, menggandakan poin, atau memanipulasi laporan dan peringkat.",
                "Grup dipakai untuk komunikasi yang relevan dengan kelas. Jangan mengirim spam, ancaman, pelecehan, data pribadi orang lain tanpa izin, atau materi yang melanggar hak pihak lain. Pesan dapat dilaporkan dan ditinjau oleh pengelola. Beberapa tindakan pada grup, termasuk penguncian, penyematan, dan moderasi, tersedia sesuai peran pengguna.",
            ),
        ),
        LegalSection(
            "3. Karsa Lib dan konten pengguna",
            listOf(
                "Artikel Karsa Lib ditampilkan kepada pengguna dari program studi yang sama dengan penulis saat artikel diterbitkan. Pengguna yang memperoleh akses penulis dapat membuat draf, menerbitkan, memperbarui, dan mengarsipkan artikel teks. Akses penulis diberikan atau dicabut oleh admin setelah peninjauan.",
                "Penulis bertanggung jawab atas keakuratan tulisan dan hak untuk membagikannya. Jangan memuat plagiarisme, ujaran kebencian, pelecehan, spam, atau informasi pribadi orang lain tanpa izin. Penulis tetap bertanggung jawab atas kontennya dan memberi Karsa izin untuk menyimpan serta menampilkannya selama konten tersedia di layanan.",
                "Pembaca dapat berkomentar dan membalas komentar sesuai fitur yang tersedia. Komentar tidak dapat diedit, tetapi dapat dihapus oleh pemiliknya. Artikel atau komentar dapat dilaporkan; laporan ditinjau oleh admin sebelum tindakan moderasi. Mengarsipkan artikel menghentikan tampilnya artikel di beranda program studi.",
                "Bila Teman baca AI tersedia, fitur ini membantu merangkum dan menjelaskan materi artikel. Jawaban AI dapat keliru dan tidak menjamin isi artikel benar. Periksa kembali artikel serta sumber belajar yang relevan. Pemakaian dibatasi dengan kuota harian; jangan mencoba mengakali pembatasan atau memasukkan data pribadi dan rahasia ke dalam pertanyaan.",
            ),
        ),
        LegalSection(
            "4. Moderasi dan pembatasan akses",
            listOf(
                "Pengelola dapat meninjau laporan, menghapus atau menyembunyikan konten yang melanggar ketentuan, mengarsipkan artikel, serta membatasi akses fitur ketika diperlukan untuk keamanan layanan. Kami berupaya menilai laporan secara wajar, tetapi keputusan moderasi dapat bergantung pada konteks yang tersedia.",
                "Jika kamu menemukan kesalahan data atau keberatan atas tindakan moderasi, hubungi pengelola melalui alamat kontak di bawah halaman ini dengan penjelasan yang relevan.",
            ),
        ),
        LegalSection(
            "5. Ketersediaan dan perubahan layanan",
            listOf(
                "Karsa dapat mengalami gangguan jaringan, pemeliharaan, atau perubahan fitur. Data dan tampilan dapat berubah ketika ada pembetulan atau pengembangan layanan. Kami akan memperbarui dokumen ini bila aturan penggunaan berubah secara penting dan menampilkan tanggal berlakunya.",
                "Informasi mengenai data yang diproses, pembagian akses, dan permintaan terkait data pribadi tersedia dalam Kebijakan Privasi.",
            ),
        ),
    ),
)

val LEGAL_PRIVACY = LegalDocument(
    title = "Kebijakan Privasi",
    summary = "Penjelasan tentang data yang digunakan Karsa untuk menjalankan fitur akademik, grup kelas, dan Karsa Lib.",
    version = LEGAL_VERSION,
    effective = LEGAL_EFFECTIVE,
    sections = listOf(
        LegalSection(
            "1. Data yang digunakan",
            listOf(
                "Saat kamu masuk dengan Google, Karsa menerima informasi akun yang diperlukan untuk login, seperti nama, alamat email, foto profil, dan pengenal akun Google. Sistem dapat menyimpan token autentikasi dan informasi sesi agar proses masuk berjalan. Karsa tidak meminta atau menyimpan kata sandi Google-mu.",
                "Untuk fitur akademik, kami memproses NIM bila tersedia, kelas, program studi, semester, mata kuliah, penugasan PJ, kategori dan riwayat poin, laporan, serta peringkat. Untuk Karsa Lib, kami memproses nama tampilan, fakultas, program studi, kelas opsional, permohonan penulis, artikel, komentar, dan laporan konten.",
                "Untuk grup kelas, kami menyimpan pesan, balasan, laporan, status blokir, penyematan, dan tindakan moderasi. Kami juga mencatat informasi teknis seperlunya, seperti waktu sesi, nama perangkat yang dikirim aplikasi, versi dokumen yang disetujui saat login, serta log aktivitas penting untuk keamanan dan audit.",
                "Bila Teman baca AI artikel diaktifkan dan kamu menggunakannya, Karsa memproses isi artikel, pertanyaan, jawaban AI, rujukan paragraf, dan jumlah pemakaian harian. Percakapan dicatat untuk akun dan artikel terkait, tidak ditampilkan kepada pembaca lain. Ringkasan artikel dapat dipakai bersama oleh pembaca yang berhak mengakses artikel tersebut.",
            ),
        ),
        LegalSection(
            "2. Tujuan penggunaan",
            listOf(
                "Data dipakai untuk memverifikasi akun, memberi akses sesuai peran dan kelas/program studi, mencatat poin, menampilkan laporan dan peringkat, menyediakan percakapan grup, menjalankan Karsa Lib, menangani laporan, serta menjaga keamanan layanan.",
                "Saat artikel dibuka, Karsa mencatat satu pembacaan untuk kombinasi akun dan artikel tersebut. Membuka artikel yang sama lagi tidak menambah jumlah pembacanya. Catatan ini digunakan untuk menampilkan jumlah pembaca artikel dan ringkasan profil penulis.",
            ),
        ),
        LegalSection(
            "3. Siapa yang dapat melihat data",
            listOf(
                "Pengguna hanya mendapat akses sesuai fitur dan perannya. Anggota kelas dapat melihat ruang grup kelas yang tersedia. Artikel terbit, nama penulis, komentar, dan jumlah pembaca ditampilkan kepada pengguna Karsa Lib dari program studi yang sama. Admin dapat mengakses data yang diperlukan untuk pengelolaan, peninjauan permohonan penulis, audit, dan moderasi laporan.",
                "Karsa menggunakan penyedia layanan untuk autentikasi Google, hosting aplikasi, penyimpanan database, dan—bila diaktifkan—pengiriman email pemberitahuan laporan artikel kepada pengelola. Data tidak digunakan untuk menjual profil pengguna atau menayangkan iklan yang dipersonalisasi.",
                "Saat kamu meminta ringkasan baru atau bertanya kepada Teman baca, isi artikel dan pertanyaan yang diperlukan, termasuk konteks percakapan terbaru, dikirim ke penyedia AI yang digunakan Karsa. Karsa tidak menambahkan nama akun, email, NIM, dan token login sebagai informasi akun dalam prompt. Jangan memasukkan data pribadi atau rahasia dalam pertanyaan. Pengolahan dan penyimpanan oleh penyedia AI mengikuti ketentuan penyedia yang digunakan.",
            ),
        ),
        LegalSection(
            "4. Penyimpanan, penghapusan, dan keamanan",
            listOf(
                "Data disimpan selama diperlukan untuk menyediakan layanan dan menyelesaikan kebutuhan keamanan, audit, atau administrasi akademik yang relevan. Artikel yang diarsipkan dan catatan laporan dapat tetap tersimpan agar riwayat moderasi dapat ditinjau. Ketika komentar dihapus, teks komentar tidak lagi ditampilkan, tetapi informasi penghapusan dan konteks balasan/laporan tertentu dapat tetap tersimpan.",
                "Kami menggunakan kontrol akses berdasarkan peran, pemeriksaan di server, dan koneksi terenkripsi untuk membatasi akses yang tidak berwenang. Tidak ada sistem yang sepenuhnya bebas risiko; jangan membagikan akun Google atau perangkat yang masih dalam keadaan masuk.",
            ),
        ),
        LegalSection(
            "5. Permintaan terkait data dan akun",
            listOf(
                "Kamu dapat meminta informasi, koreksi, atau penghapusan akun dan data terkait dengan mengirim email ke admin@sikarsa.id. Sertakan alamat email akun Karsa dan jenis permintaan; pengelola dapat meminta verifikasi kepemilikan akun sebelum menindaklanjutinya.",
                "Permintaan penghapusan ditinjau untuk menentukan data yang dapat dihapus dan data yang perlu dipertahankan karena alasan keamanan, audit, atau kewajiban yang berlaku. Pengelola akan menjelaskan tindak lanjut serta alasan bila ada data yang tidak dapat langsung dihapus. Jangan kirim kata sandi atau token login melalui email.",
            ),
        ),
        LegalSection(
            "6. Perubahan kebijakan",
            listOf(
                "Kebijakan ini akan diperbarui jika cara Karsa memproses data berubah secara penting. Versi dan tanggal berlaku ditampilkan di atas halaman. Untuk aturan penggunaan fitur, lihat Syarat Penggunaan.",
            ),
        ),
    ),
)
