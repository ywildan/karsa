package ac.id.untidar.karsa

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import ac.id.untidar.karsa.data.Article
import ac.id.untidar.karsa.data.ArticleStatus
import ac.id.untidar.karsa.data.Comment
import ac.id.untidar.karsa.data.ME
import ac.id.untidar.karsa.data.Msg
import ac.id.untidar.karsa.data.PointEntry
import ac.id.untidar.karsa.data.SEED_ARTICLES
import ac.id.untidar.karsa.data.SEED_CHATS
import ac.id.untidar.karsa.data.SEED_COMMENTS
import ac.id.untidar.karsa.data.SEED_ENTRIES
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

data class AuditItem(val id: String, val ts: Long, val text: String)

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
    var stack by mutableStateOf<List<Route>>(emptyList())
        private set
    var toast by mutableStateOf<ToastData?>(null)
        private set
    var epoch by mutableIntStateOf(0)
        private set

    var entries by mutableStateOf(SEED_ENTRIES)
        private set
    var audit by mutableStateOf<List<AuditItem>>(emptyList())
        private set
    var chats by mutableStateOf(SEED_CHATS)
        private set
    var blocked by mutableStateOf<List<String>>(emptyList())
        private set
    var articles by mutableStateOf(SEED_ARTICLES)
        private set
    var comments by mutableStateOf(SEED_COMMENTS)
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

    private var uid = 100
    private fun nextId(prefix: String): String = prefix + (++uid)

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
        epoch += 1
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
        epoch += 1
        lib.reset()
        groups.reset()
        points.reset()
    }

    fun openTab(next: Tab) {
        if (next !in tabs) return
        stack = emptyList()
        tab = next
    }

    fun canGoBack(): Boolean = stack.isNotEmpty() || tab != (tabs.firstOrNull() ?: tab)

    fun go(route: Route) {
        stack = stack + route
    }

    fun replace(route: Route) {
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

    /* Poin */

    fun addEntry(studentId: String, points: Int, categoryId: String, courseId: String, note: String?) {
        entries = listOf(
            PointEntry(
                id = nextId("e"),
                ts = System.currentTimeMillis(),
                studentId = studentId,
                points = points,
                categoryId = categoryId,
                courseId = courseId,
                note = note,
            ),
        ) + entries
    }

    fun deleteEntry(id: String) {
        val target = entries.firstOrNull { it.id == id }
        if (target != null) {
            audit = listOf(
                AuditItem(nextId("au"), System.currentTimeMillis(), "Hapus entri +${target.points} (${target.categoryId})"),
            ) + audit
        }
        entries = entries.filterNot { it.id == id }
    }

    /* Chat */

    private fun patchMsg(courseId: String, id: String, transform: (Msg) -> Msg) {
        val list = chats[courseId] ?: return
        chats = chats + (courseId to list.map { if (it.id == id) transform(it) else it })
    }

    fun sendMsg(courseId: String, text: String) {
        val list = chats[courseId].orEmpty()
        chats = chats + (courseId to (list + Msg(nextId("msg"), "me", text, System.currentTimeMillis())))
    }

    fun editMsg(courseId: String, id: String, text: String) = patchMsg(courseId, id) { it.copy(text = text, edited = true) }

    fun deleteMsg(courseId: String, id: String) = patchMsg(courseId, id) { it.copy(deleted = true, text = "", pinned = false) }

    fun hideMsg(courseId: String, id: String, hidden: Boolean) = patchMsg(courseId, id) { it.copy(hidden = hidden) }

    fun pinMsg(courseId: String, id: String) = patchMsg(courseId, id) { it.copy(pinned = !it.pinned) }

    fun blockUser(id: String) {
        if (id !in blocked) blocked = blocked + id
    }

    /* Karsa Lib */

    fun saveArticle(id: String?, title: String, body: String, status: ArticleStatus): String {
        val targetId = id ?: nextId("a")
        val existing = articles.firstOrNull { it.id == targetId }
        val base = Article(
            id = targetId,
            title = title.ifBlank { "Tanpa judul" },
            body = body,
            author = authorProfile.nama,
            prodi = authorProfile.prodi,
            ts = System.currentTimeMillis(),
            readers = existing?.readers ?: 0,
            tag = authorProfile.prodi,
            mine = true,
            status = status,
        )
        articles = if (existing != null) {
            articles.map { if (it.id == targetId) base else it }
        } else {
            listOf(base) + articles
        }
        return targetId
    }

    fun addComment(articleId: String, text: String, parentId: String?) {
        comments = comments + Comment(
            id = nextId("k"),
            articleId = articleId,
            parentId = parentId,
            author = ME.name,
            ts = System.currentTimeMillis(),
            text = text,
            mine = true,
        )
    }
}

val LocalApp = staticCompositionLocalOf<KarsaState> { error("KarsaState is not provided") }
