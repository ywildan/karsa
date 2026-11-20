package ac.id.untidar.karsa.points

import ac.id.untidar.karsa.lib.parseTimestamp
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class NamedDto(
    val name: String = "",
    val code: String = "",
)

@Serializable
data class AssignmentCourseDto(
    val name: String = "Mata kuliah",
    val code: String = "",
)

@Serializable
data class AssignmentClassDto(
    val name: String = "Kelas",
    val prodi: NamedDto? = null,
    val semester: NamedDto? = null,
)

@Serializable
data class AssignmentDto(
    val id: String,
    val matkul: AssignmentCourseDto = AssignmentCourseDto(),
    val kelas: AssignmentClassDto = AssignmentClassDto(),
    @SerialName("student_count") val studentCount: Int = 0,
)

@Serializable
data class StudentDto(
    val id: String,
    val name: String = "Tanpa nama",
    val nim: String? = null,
    @SerialName("is_self") val isSelf: Boolean = false,
)

@Serializable
data class PointCategoryDto(
    val id: String,
    val name: String = "Kategori",
)

@Serializable
data class PointPersonDto(
    val name: String = "Tanpa nama",
    val nim: String? = null,
)

@Serializable
data class PointHistoryDto(
    val id: String,
    val poin: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    val mahasiswa: PointPersonDto? = null,
    val kategori: NamedDto? = null,
    val matkul: NamedDto? = null,
    val kelas: NamedDto? = null,
    val catatan: String? = null,
) {
    val ts: Long get() = parseTimestamp(createdAt)
    val studentName: String get() = mahasiswa?.name ?: "Tanpa nama"
    val categoryName: String get() = kategori?.name ?: "Kategori"
    val courseName: String get() = matkul?.name ?: "Mata kuliah"
    val className: String get() = kelas?.name ?: "Kelas"
    val studentNim: String? get() = mahasiswa?.nim
}

@Serializable
data class ReportPointDto(
    val id: String,
    val poin: Int = 0,
    val kategori: NamedDto? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val catatan: String? = null,
) {
    val ts: Long get() = parseTimestamp(createdAt)
    val categoryName: String get() = kategori?.name ?: "Kategori"
}

@Serializable
data class ReportCourseDto(
    val id: String,
    val matkul: AssignmentCourseDto = AssignmentCourseDto(),
    @SerialName("total_poin") val totalPoints: Int = 0,
    val pj: NamedDto? = null,
    val history: List<ReportPointDto> = emptyList(),
)

@Serializable
data class StudentReportDto(
    val empty: Boolean = false,
    @SerialName("total_poin") val totalPoints: Int = 0,
    val semester: NamedDto? = null,
    val kelas: NamedDto? = null,
    val prodi: NamedDto? = null,
    val courses: List<ReportCourseDto> = emptyList(),
)

@Serializable
data class LeaderboardOptionDto(
    val id: String,
    val name: String = "Mata kuliah",
    val code: String = "",
)

@Serializable
data class LeaderboardRowDto(
    val rank: Int = 0,
    val nama: String = "Tanpa nama",
    val nim: String? = null,
    val totalPoin: Int = 0,
    val isCurrentUser: Boolean = false,
)
