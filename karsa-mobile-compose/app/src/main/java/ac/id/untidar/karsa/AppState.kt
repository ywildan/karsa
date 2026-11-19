package ac.id.untidar.karsa

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf

enum class Phase { Splash, Onboarding, Login, App }

enum class Role { Pj, Mahasiswa }

enum class Tab(val label: String) {
    Lib("Karsa Lib"),
    Grup("Grup"),
    Input("Input poin"),
    Aktivitas("Aktivitas"),
    Poinku("Poinku"),
    Akun("Akun"),
}

fun tabsFor(role: Role): List<Tab> = if (role == Role.Pj) {
    listOf(Tab.Lib, Tab.Grup, Tab.Input, Tab.Aktivitas, Tab.Akun)
} else {
    listOf(Tab.Lib, Tab.Grup, Tab.Poinku, Tab.Akun)
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

sealed interface Route {
    data class Article(val id: String) : Route
    data class Chat(val id: String) : Route
    data class Editor(val id: String? = null, val prefillTitle: String? = null, val prefillBody: String? = null) : Route
    data object MyPosts : Route
    data object Import : Route
    data object Author : Route
    data object History : Route
    data object Report : Route
    data object Ranking : Route
    data class Legal(val doc: LegalDoc) : Route
}

class KarsaState {
    var phase by mutableStateOf(Phase.Splash)
        private set
    var role by mutableStateOf(Role.Pj)
        private set
    var tab by mutableStateOf(Tab.Lib)
        private set
    var stack by mutableStateOf<List<Route>>(emptyList())
        private set
    var toast by mutableStateOf<ToastData?>(null)
        private set
    var epoch by mutableIntStateOf(0)
        private set

    fun setPhase(next: Phase) {
        phase = next
    }

    fun setRole(next: Role) {
        role = next
        tab = Tab.Lib
        stack = emptyList()
        epoch += 1
    }

    fun setTab(next: Tab) {
        stack = emptyList()
        tab = next
    }

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
        if (tab != Tab.Lib) {
            tab = Tab.Lib
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
}

val LocalApp = staticCompositionLocalOf<KarsaState> { error("KarsaState is not provided") }
