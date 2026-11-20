package ac.id.untidar.karsa

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import ac.id.untidar.karsa.auth.AuthController
import ac.id.untidar.karsa.auth.SessionState
import ac.id.untidar.karsa.groups.GroupController
import ac.id.untidar.karsa.lib.LibController
import ac.id.untidar.karsa.net.AppUser
import ac.id.untidar.karsa.net.Capabilities
import ac.id.untidar.karsa.points.PointsController

enum class Phase { Splash, Onboarding, Login, SessionError, App }

enum class Role { Pj, Mahasiswa }

enum class Tab(val label: String) {
    Lib("Karsa Lib"),
    Grup("Grup"),
    Input("Input poin"),
    Aktivitas("Aktivitas"),
    Poinku("Poinku"),
    Akun("Akun"),
}

fun tabsFor(capabilities: Capabilities, hasClass: Boolean): List<Tab> = buildList {
    if (capabilities.viewKarsaLib) add(Tab.Lib)
    if (hasClass) add(Tab.Grup)
    if (capabilities.recordPoints) {
        add(Tab.Input)
        add(Tab.Aktivitas)
    } else if (capabilities.viewReport || capabilities.viewLeaderboard) {
        add(Tab.Poinku)
    }
    add(Tab.Akun)
}

enum class ToastTone { Success, Neutral, Error }

data class ToastData(
    val id: Long,
    val msg: String,
    val tone: ToastTone,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null,
)

enum class LegalDoc { Terms, Privacy }

enum class AuthorStatus { None, Pending, Approved }

data class AuthorProfile(
    val nama: String,
    val fakultas: String,
    val prodi: String,
    val kelas: String,
)

sealed interface Route {
    data class Article(val id: String) : Route
    data class Chat(val id: String) : Route
    data class GroupReports(val id: String) : Route
    data class Editor(val id: String? = null, val prefillTitle: String? = null, val prefillBody: String? = null) : Route
    data object MyPosts : Route
    data object Import : Route
    data object Author : Route
    data class AuthorProfile(val id: String) : Route
    data object History : Route
    data object Report : Route
    data object Ranking : Route
    data class Legal(val doc: LegalDoc) : Route
}

class KarsaState(val auth: AuthController) {
    val lib = LibController(auth)
    val groups = GroupController(auth)
    val points = PointsController(auth)

    var phase by mutableStateOf(Phase.Splash)
        private set
    var splashDone by mutableStateOf(false)
        private set
    var tab by mutableStateOf(Tab.Lib)
        private set

    val user: AppUser? get() = auth.user
    val capabilities: Capabilities get() = auth.user?.capabilities ?: Capabilities()
    val role: Role get() = if (capabilities.recordPoints) Role.Pj else Role.Mahasiswa
    val hasClass: Boolean get() = !auth.user?.classId.isNullOrEmpty()
    val tabs: List<Tab> get() = tabsFor(capabilities, hasClass)

    val displayName: String
        get() = auth.user?.name?.takeIf { it.isNotBlank() }
            ?: auth.user?.libProfile?.displayName?.takeIf { it.isNotBlank() }
            ?: "Mahasiswa"
    val email: String
        get() = auth.user?.email.orEmpty()
    val nim: String
        get() = auth.user?.nim?.takeIf { it.isNotBlank() } ?: "NIM belum tersedia"
    val academicLine: String
        get() {
            val kelas = lib.className.takeIf { it.isNotBlank() }
                ?: points.report?.kelas?.name?.takeIf { it.isNotBlank() }
            val prodi = lib.programName.takeIf { it.isNotBlank() }
                ?: points.report?.prodi?.name?.takeIf { it.isNotBlank() }
            return listOfNotNull(kelas, prodi).joinToString(" · ")
        }
    var stack by mutableStateOf<List<Route>>(emptyList())
        private set
    var toast by mutableStateOf<ToastData?>(null)
        private set

    val authorStatus: AuthorStatus
        get() = when {
            lib.canWrite -> AuthorStatus.Approved
            lib.requestStatus == "PENDING" -> AuthorStatus.Pending
            else -> AuthorStatus.None
        }
    val authorProfile: AuthorProfile
        get() = AuthorProfile(
            nama = lib.profile?.displayName ?: displayName,
            fakultas = lib.profile?.faculty.orEmpty(),
            prodi = lib.programName,
            kelas = lib.className,
        )

    fun goPhase(next: Phase) {
        phase = next
    }

    fun finishSplash() {
        splashDone = true
        syncAuth()
    }

    fun syncAuth() {
        when (auth.state) {
            SessionState.SignedIn -> if (phase != Phase.App && splashDone) enterApp()
            SessionState.SignedOut -> when (phase) {
                Phase.App -> endSession()
                Phase.Splash -> if (splashDone) goPhase(Phase.Onboarding)
                Phase.SessionError -> {
                    auth.clearError()
                    goPhase(Phase.Login)
                }
                else -> Unit
            }
            SessionState.Unavailable -> {
                if (splashDone && (phase == Phase.Splash || phase == Phase.SessionError)) {
                    goPhase(Phase.SessionError)
                }
            }
            else -> Unit
        }
    }

    private fun enterApp() {
        val profile = auth.user ?: return
        if (phase == Phase.App) return
        tab = tabs.firstOrNull() ?: Tab.Akun
        stack = emptyList()
        toast = null
        phase = Phase.App
        val firstName = profile.name?.trim()?.split(" ")?.firstOrNull()?.takeIf { it.isNotEmpty() }
        notify("Selamat datang, ${firstName ?: "kamu"}!", ToastTone.Success)
    }

    private fun endSession() {
        phase = Phase.Login
        tab = Tab.Lib
        stack = emptyList()
        toast = null
        lib.reset()
        groups.reset()
        points.reset()
    }

    fun openTab(next: Tab) {
        if (next !in tabs) return
        stack = emptyList()
        tab = next
    }

    fun ensureTab() {
        if (phase != Phase.App) return
        stack = stack.filter { canOpen(it) }
        if (tab !in tabs) {
            tab = tabs.firstOrNull() ?: Tab.Akun
            stack = emptyList()
        }
    }

    fun canGoBack(): Boolean = stack.isNotEmpty() || tab != (tabs.firstOrNull() ?: tab)

    fun canOpen(route: Route): Boolean = when (route) {
        is Route.Article, is Route.AuthorProfile, Route.Author -> capabilities.viewKarsaLib
        is Route.Editor, Route.MyPosts, Route.Import -> capabilities.writeKarsaLib
        is Route.Chat -> hasClass
        is Route.GroupReports -> groups.rooms.any { it.dto.id == route.id && it.dto.isManager }
        Route.History -> capabilities.recordPoints
        Route.Report -> capabilities.viewReport || capabilities.recordPoints
        Route.Ranking -> capabilities.viewLeaderboard || capabilities.recordPoints
        is Route.Legal -> true
    }

    fun go(route: Route) {
        if (!canOpen(route)) return
        stack = stack + route
    }

    fun replace(route: Route) {
        if (!canOpen(route)) return
        stack = stack.dropLast(1) + route
    }

    fun back(): Boolean {
        if (stack.isNotEmpty()) {
            stack = stack.dropLast(1)
            return true
        }
        val home = tabs.firstOrNull() ?: return false
        if (tab != home) {
            tab = home
            return true
        }
        return false
    }

    fun notify(msg: String, tone: ToastTone = ToastTone.Neutral, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
        toast = ToastData(
            id = System.currentTimeMillis(),
            msg = msg,
            tone = tone,
            actionLabel = actionLabel,
            onAction = onAction,
        )
    }

    fun dismissToast() {
        toast = null
    }

    fun logout() {
        endSession()
        auth.signOut()
    }
}

val LocalApp = staticCompositionLocalOf<KarsaState> { error("KarsaState is not provided") }
