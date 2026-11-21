package ac.id.untidar.karsa.net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Capabilities(
    @SerialName("record_points") val recordPoints: Boolean = false,
    @SerialName("view_report") val viewReport: Boolean = false,
    @SerialName("view_leaderboard") val viewLeaderboard: Boolean = false,
    @SerialName("view_karsa_lib") val viewKarsaLib: Boolean = false,
    @SerialName("write_karsa_lib") val writeKarsaLib: Boolean = false,
)

@Serializable
data class LibProfileInfo(
    @SerialName("display_name") val displayName: String = "Mahasiswa",
    val faculty: String = "",
    @SerialName("prodi_id") val programId: String = "",
    @SerialName("faculty_id") val facultyId: String? = null,
    @SerialName("kelas_id") val classId: String? = null,
)

@Serializable
data class AppUser(
    val id: String,
    val email: String,
    val name: String? = null,
    val image: String? = null,
    val nim: String? = null,
    @SerialName("kelas_id") val classId: String? = null,
    @SerialName("lib_profile") val libProfile: LibProfileInfo? = null,
    val capabilities: Capabilities = Capabilities(),
)

class ApiException(
    override val message: String,
    val code: String? = null,
    val statusCode: Int? = null,
) : Exception(message)
