package ac.id.untidar.karsa.points

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
import java.util.UUID

class PointsController(private val auth: AuthController) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var session = 0
    private var formLoading = false
    private var optionsLoading = false

    var assignments by mutableStateOf<List<AssignmentDto>>(emptyList())
        private set
    var categories by mutableStateOf<List<PointCategoryDto>>(emptyList())
        private set
    var formStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var formError by mutableStateOf<String?>(null)
        private set

    val students = mutableStateMapOf<String, List<StudentDto>>()
    val studentStatus = mutableStateMapOf<String, LoadStatus>()
    var recents by mutableStateOf<List<StudentDto>>(emptyList())
        private set

    var history by mutableStateOf<List<PointHistoryDto>>(emptyList())
        private set
    var historyStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var historyError by mutableStateOf<String?>(null)
        private set

    var report by mutableStateOf<StudentReportDto?>(null)
        private set
    var reportStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var reportError by mutableStateOf<String?>(null)
        private set

    var leaderboardOptions by mutableStateOf<List<LeaderboardOptionDto>>(emptyList())
        private set
    var leaderboardCourse by mutableStateOf<String?>(null)
        private set
    var leaderboardRows by mutableStateOf<List<LeaderboardRowDto>>(emptyList())
        private set
    var leaderboardStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var leaderboardError by mutableStateOf<String?>(null)
        private set

    private var lastPointPayload: String? = null
    private var lastPointKey: String? = null

    val currentRank: Int
        get() = leaderboardRows.firstOrNull { it.isCurrentUser }?.rank ?: 0

    fun reset() {
        session++
        assignments = emptyList()
        categories = emptyList()
        formStatus = LoadStatus.Loading
        formError = null
        students.clear()
        studentStatus.clear()
        recents = emptyList()
        history = emptyList()
        historyStatus = LoadStatus.Loading
        historyError = null
        report = null
        reportStatus = LoadStatus.Loading
        reportError = null
        leaderboardOptions = emptyList()
        leaderboardCourse = null
        leaderboardRows = emptyList()
        leaderboardStatus = LoadStatus.Loading
        leaderboardError = null
        formLoading = false
        optionsLoading = false
        lastPointPayload = null
        lastPointKey = null
    }

    fun loadForm() {
        if (formLoading) return
        formLoading = true
        val generation = session
        scope.launch {
            formStatus = LoadStatus.Loading
            try {
                val loadedAssignments = auth.api.pjAssignments()
                val loadedCategories = auth.api.pointCategories()
                if (generation != session) return@launch
                assignments = loadedAssignments
                categories = loadedCategories
                formStatus = LoadStatus.Ready
                formError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                formStatus = LoadStatus.Error
                formError = friendlyError(failure)
            } finally {
                if (generation == session) formLoading = false
            }
        }
    }

    fun loadStudents(assignmentId: String) {
        val generation = session
        scope.launch {
            studentStatus[assignmentId] = LoadStatus.Loading
            try {
                val loaded = auth.api.assignmentStudents(assignmentId)
                if (generation != session) return@launch
                students[assignmentId] = loaded.filterNot { it.isSelf }
                studentStatus[assignmentId] = LoadStatus.Ready
            } catch (_: Exception) {
                if (generation == session) studentStatus[assignmentId] = LoadStatus.Error
            }
        }
    }

    fun clearRecents() {
        recents = emptyList()
    }

    suspend fun submitPoint(
        assignmentId: String,
        student: StudentDto,
        categoryId: String,
        points: Int,
        note: String?,
    ): String {
        val payload = "$assignmentId|${student.id}|$categoryId|$points|${note.orEmpty()}"
        if (lastPointPayload != payload || lastPointKey == null) {
            lastPointPayload = payload
            lastPointKey = UUID.randomUUID().toString()
        }
        val message = auth.api.createPoint(
            assignmentId = assignmentId,
            studentId = student.id,
            categoryId = categoryId,
            points = points,
            note = note,
            idempotencyKey = lastPointKey!!,
        )
        lastPointPayload = null
        lastPointKey = null
        recents = (listOf(student) + recents.filterNot { it.id == student.id }).take(4)
        return message
    }

    fun loadHistory() {
        val generation = session
        scope.launch {
            historyStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.pointHistory()
                if (generation != session) return@launch
                history = loaded
                historyStatus = LoadStatus.Ready
                historyError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                historyStatus = LoadStatus.Error
                historyError = friendlyError(failure)
            }
        }
    }

    suspend fun deletePoint(pointId: String) {
        auth.api.deletePoint(pointId)
        history = history.filterNot { it.id == pointId }
        if (report != null) loadReport()
        if (leaderboardRows.isNotEmpty() && leaderboardCourse != null) {
            loadLeaderboard(leaderboardCourse!!)
        }
    }

    fun loadReport() {
        val generation = session
        scope.launch {
            reportStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.studentReport()
                if (generation != session) return@launch
                report = loaded
                reportStatus = LoadStatus.Ready
                reportError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                reportStatus = LoadStatus.Error
                reportError = friendlyError(failure)
            }
        }
    }

    fun loadLeaderboardOptions() {
        if (optionsLoading) return
        if (leaderboardOptions.isNotEmpty()) {
            val selected = leaderboardCourse?.takeIf { id -> leaderboardOptions.any { it.id == id } }
                ?: leaderboardOptions.firstOrNull()?.id
            leaderboardCourse = selected
            if (selected != null) loadLeaderboard(selected)
            return
        }
        optionsLoading = true
        val generation = session
        scope.launch {
            leaderboardStatus = LoadStatus.Loading
            try {
                val options = auth.api.leaderboardOptions()
                if (generation != session) return@launch
                leaderboardOptions = options
                val selected = leaderboardCourse?.takeIf { id -> options.any { it.id == id } }
                    ?: options.firstOrNull()?.id
                leaderboardCourse = selected
                optionsLoading = false
                if (selected != null) {
                    loadLeaderboard(selected)
                } else {
                    leaderboardRows = emptyList()
                    leaderboardStatus = LoadStatus.Ready
                }
            } catch (failure: Exception) {
                if (generation != session) return@launch
                optionsLoading = false
                leaderboardStatus = LoadStatus.Error
                leaderboardError = friendlyError(failure)
            }
        }
    }

    fun selectLeaderboard(assignmentId: String) {
        if (leaderboardCourse == assignmentId && leaderboardRows.isNotEmpty()) return
        leaderboardCourse = assignmentId
        loadLeaderboard(assignmentId)
    }

    fun loadLeaderboard(assignmentId: String) {
        val generation = session
        scope.launch {
            leaderboardStatus = LoadStatus.Loading
            try {
                val rows = auth.api.leaderboard(assignmentId)
                if (generation != session) return@launch
                leaderboardRows = rows
                leaderboardStatus = LoadStatus.Ready
                leaderboardError = null
            } catch (failure: Exception) {
                if (generation != session) return@launch
                leaderboardStatus = LoadStatus.Error
                leaderboardError = friendlyError(failure)
            }
        }
    }
}
