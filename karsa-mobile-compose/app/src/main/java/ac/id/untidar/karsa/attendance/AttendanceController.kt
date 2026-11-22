package ac.id.untidar.karsa.attendance

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ac.id.untidar.karsa.auth.AuthController
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.ui.LoadStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class AttendanceController(private val auth: AuthController) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var session = 0
    private var studentLoading = false
    private var assignmentsLoading = false

    var studentSummary by mutableStateOf<StudentAttendanceDto?>(null)
        private set
    var studentStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var studentError by mutableStateOf<String?>(null)
        private set

    var assignments by mutableStateOf<List<PjAttendanceAssignmentDto>>(emptyList())
        private set
    var assignmentsStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var assignmentsError by mutableStateOf<String?>(null)
        private set

    val details = mutableStateMapOf<String, PjAttendanceDetailDto>()
    val detailStatus = mutableStateMapOf<String, LoadStatus>()
    val detailError = mutableStateMapOf<String, String?>()

    fun reset() {
        session++
        studentLoading = false
        assignmentsLoading = false
        studentSummary = null
        studentStatus = LoadStatus.Loading
        studentError = null
        assignments = emptyList()
        assignmentsStatus = LoadStatus.Loading
        assignmentsError = null
        details.clear()
        detailStatus.clear()
        detailError.clear()
    }

    fun loadStudent(force: Boolean = false) {
        if (studentLoading) return
        if (!force && studentSummary != null && studentStatus == LoadStatus.Ready) return
        studentLoading = true
        val generation = session
        scope.launch {
            studentStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.studentAttendance()
                if (generation != session) return@launch
                studentSummary = loaded
                studentStatus = LoadStatus.Ready
                studentError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                studentStatus = LoadStatus.Error
                studentError = friendlyError(failure)
            } finally {
                if (generation == session) studentLoading = false
            }
        }
    }

    fun loadAssignments(force: Boolean = false) {
        if (assignmentsLoading) return
        if (!force && assignmentsStatus == LoadStatus.Ready) return
        assignmentsLoading = true
        val generation = session
        scope.launch {
            assignmentsStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.pjAttendanceAssignments()
                if (generation != session) return@launch
                assignments = loaded
                assignmentsStatus = LoadStatus.Ready
                assignmentsError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                assignmentsStatus = LoadStatus.Error
                assignmentsError = friendlyError(failure)
            } finally {
                if (generation == session) assignmentsLoading = false
            }
        }
    }

    fun loadDetail(assignmentId: String, force: Boolean = false) {
        if (assignmentId.isBlank()) return
        if (detailStatus[assignmentId] == LoadStatus.Loading) return
        if (
            !force &&
            details.containsKey(assignmentId) &&
            detailStatus[assignmentId] == LoadStatus.Ready
        ) {
            return
        }
        val generation = session
        scope.launch {
            detailStatus[assignmentId] = LoadStatus.Loading
            detailError[assignmentId] = null
            try {
                val loaded = auth.api.pjAttendanceAssignment(assignmentId)
                if (generation != session) return@launch
                details[assignmentId] = loaded
                detailStatus[assignmentId] = LoadStatus.Ready
            } catch (failure: Exception) {
                if (generation != session) return@launch
                detailStatus[assignmentId] = LoadStatus.Error
                detailError[assignmentId] = friendlyError(failure)
            }
        }
    }

    suspend fun create(
        assignmentId: String,
        tanggal: String,
        status: AttendanceStatus,
        studentIds: List<String>,
        catatan: String?,
    ): AttendanceMutationDto {
        val result = auth.api.createAttendance(
            assignmentId = assignmentId,
            tanggal = tanggal,
            status = status.api,
            studentIds = studentIds,
            catatan = catatan,
        )
        refreshAfterMutation(assignmentId)
        return result
    }

    suspend fun delete(attendanceId: String, assignmentId: String): String {
        val message = auth.api.deleteAttendance(attendanceId)
        refreshAfterMutation(assignmentId)
        return message
    }

    suspend fun reset(assignmentId: String): String {
        val message = auth.api.resetAttendance(assignmentId)
        refreshAfterMutation(assignmentId)
        return message
    }

    private fun refreshAfterMutation(assignmentId: String) {
        loadDetail(assignmentId, force = true)
        loadAssignments(force = true)
        if (studentSummary != null) loadStudent(force = true)
    }
}
