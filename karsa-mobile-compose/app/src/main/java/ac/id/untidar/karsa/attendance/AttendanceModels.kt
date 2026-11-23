package ac.id.untidar.karsa.attendance

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class AttendanceStatus(val api: String, val label: String) {
    TanpaKeterangan("TANPA_KETERANGAN", "Tanpa keterangan"),
    Sakit("SAKIT", "Sakit"),
    Izin("IZIN", "Keterangan");

    companion object {
        val options: List<AttendanceStatus> get() = listOf(TanpaKeterangan, Sakit, Izin)

        fun fromApi(value: String?): AttendanceStatus =
            options.firstOrNull { it.api == value } ?: TanpaKeterangan
    }
}

private val attendanceDateFormatter =
    DateTimeFormatter.ofPattern("d MMM yyyy", Locale("id", "ID"))
private val attendanceDayFormatter =
    DateTimeFormatter.ofPattern("EEEE", Locale("id", "ID"))

fun attendanceDateLabel(value: String?): String {
    if (value.isNullOrBlank()) return "—"
    return runCatching { LocalDate.parse(value).format(attendanceDateFormatter) }
        .getOrDefault(value)
}

fun attendanceDayLabel(value: String?): String {
    if (value.isNullOrBlank()) return ""
    return runCatching { LocalDate.parse(value).format(attendanceDayFormatter) }
        .getOrDefault("")
}

@Serializable
data class AttendanceNamedDto(
    val name: String = "",
    val code: String? = null,
)

@Serializable
data class AttendancePersonDto(
    val name: String? = null,
    val nim: String? = null,
) {
    val displayName: String
        get() = name?.takeIf { it.isNotBlank() } ?: "PJ"
}

@Serializable
data class AttendanceClassDto(
    val id: String = "",
    val name: String = "Kelas",
    val prodi: AttendanceNamedDto? = null,
    val semester: AttendanceNamedDto? = null,
)

@Serializable
data class AttendanceCountsDto(
    @SerialName("tanpa_keterangan") val alpha: Int = 0,
    val sakit: Int = 0,
    val izin: Int = 0,
) {
    val total: Int get() = alpha + sakit + izin
}

@Serializable
data class AttendanceHistoryDto(
    val id: String,
    val status: String = AttendanceStatus.TanpaKeterangan.api,
    val tanggal: String = "",
    val catatan: String? = null,
) {
    val statusKind: AttendanceStatus get() = AttendanceStatus.fromApi(status)
    val dateLabel: String get() = attendanceDateLabel(tanggal)
}

@Serializable
data class StudentAttendanceCourseDto(
    val id: String,
    val matkul: AttendanceNamedDto = AttendanceNamedDto(),
    val pj: AttendancePersonDto? = null,
    val counts: AttendanceCountsDto = AttendanceCountsDto(),
    @SerialName("alpha_limit") val alphaLimit: Int = 2,
    @SerialName("alpha_remaining") val alphaRemaining: Int = 2,
    @SerialName("alpha_over") val alphaOver: Int = 0,
    val history: List<AttendanceHistoryDto> = emptyList(),
) {
    val exhausted: Boolean get() = alphaRemaining <= 0
}

@Serializable
data class StudentAttendanceDto(
    val empty: Boolean = false,
    val semester: AttendanceNamedDto? = null,
    val kelas: AttendanceClassDto? = null,
    val prodi: AttendanceNamedDto? = null,
    val limit: Int = 2,
    val totals: AttendanceCountsDto = AttendanceCountsDto(),
    val courses: List<StudentAttendanceCourseDto> = emptyList(),
)

@Serializable
data class PjAttendanceAssignmentDto(
    val id: String,
    val matkul: AttendanceNamedDto = AttendanceNamedDto(),
    val kelas: AttendanceClassDto = AttendanceClassDto(),
    @SerialName("student_count") val studentCount: Int = 0,
    @SerialName("total_records") val totalRecords: Int = 0,
    @SerialName("alpha_records") val alphaRecords: Int = 0,
)

@Serializable
data class PjAttendanceAssignmentInfoDto(
    val id: String = "",
    val matkul: AttendanceNamedDto = AttendanceNamedDto(),
    val kelas: AttendanceClassDto = AttendanceClassDto(),
    @SerialName("student_count") val studentCount: Int = 0,
)

@Serializable
data class PjAttendanceStudentDto(
    val id: String,
    val name: String? = null,
    val nim: String? = null,
    @SerialName("is_self") val isSelf: Boolean = false,
    val counts: AttendanceCountsDto = AttendanceCountsDto(),
    @SerialName("alpha_limit") val alphaLimit: Int = 2,
    @SerialName("alpha_remaining") val alphaRemaining: Int = 2,
    @SerialName("alpha_over") val alphaOver: Int = 0,
    val history: List<AttendanceHistoryDto> = emptyList(),
) {
    val displayName: String
        get() = name?.takeIf { it.isNotBlank() } ?: nim ?: "Tanpa nama"

    val exhausted: Boolean get() = alphaRemaining <= 0
}

@Serializable
data class PjAttendanceDetailDto(
    val assignment: PjAttendanceAssignmentInfoDto = PjAttendanceAssignmentInfoDto(),
    val limit: Int = 2,
    val students: List<PjAttendanceStudentDto> = emptyList(),
)

@Serializable
data class AttendanceWarningDto(
    @SerialName("student_id") val studentId: String,
    val name: String = "Mahasiswa",
    val nim: String? = null,
    val alpha: Int = 0,
    val limit: Int = 2,
)

@Serializable
data class AttendanceMutationDto(
    val message: String = "Absensi tersimpan.",
    val warnings: List<AttendanceWarningDto> = emptyList(),
)
