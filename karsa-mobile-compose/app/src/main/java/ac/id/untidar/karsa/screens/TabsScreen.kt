package ac.id.untidar.karsa.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.PageHeader

@Composable
fun TabsHost() {
    val state = LocalApp.current
    val visited = remember { mutableStateListOf(state.tab) }
    LaunchedEffect(state.tab) {
        if (state.tab !in visited) visited += state.tab
    }
    Box(Modifier.fillMaxSize()) {
        // Active tab is drawn last; visited tabs stay mounted so their scroll and form state survive.
        visited.toList().sortedBy { it == state.tab }.forEach { tab ->
            Box(
                Modifier
                    .fillMaxSize()
                    .then(if (tab == state.tab) Modifier else Modifier.alpha(0f)),
            ) {
                TabScreen(tab)
            }
        }
    }
}

@Composable
private fun TabScreen(tab: Tab) {
    when (tab) {
        Tab.Lib -> LibHome()
        Tab.Grup -> GroupList()
        Tab.Input -> InputPoin()
        Tab.Aktivitas -> ActivityHub()
        Tab.Poinku -> PoinkuScreen()
        Tab.Akun -> PlaceholderTab(tab)
    }
}

@Composable
private fun PlaceholderTab(tab: Tab) {
    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(title = tab.label, eyebrow = { EyebrowText("Rebuild Compose · Slice 2") })
        EmptyState(
            title = "Layar ini menyusul",
            desc = "Isi tab ${tab.label} diporting pada slice berikutnya.",
            icon = { LucideIcon(KarsaIcons.Inbox, modifier = Modifier.size(36.dp), tint = Brand600) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
fun RouteScreen(route: Route) {
    when (route) {
        is Route.Article -> ArticleScreen(route.id)
        is Route.Editor -> EditorScreen(route.id, route.prefillTitle, route.prefillBody)
        Route.MyPosts -> MyPostsScreen()
        Route.Import -> ImportScreen()
        Route.Author -> AuthorScreen()
        is Route.Chat -> ChatScreen(route.id)
        Route.History -> HistoryScreen()
        Route.Report -> ReportScreen()
        Route.Ranking -> RankingScreen()
        is Route.Legal -> RoutePlaceholder(
            if (route.doc == ac.id.untidar.karsa.LegalDoc.Terms) "Syarat Penggunaan" else "Kebijakan Privasi",
            "Legal",
        )
    }
}

@Composable
private fun RoutePlaceholder(title: String, subtitle: String) {
    val state = LocalApp.current
    Column(Modifier.fillMaxSize().background(Paper)) {
        ac.id.untidar.karsa.ui.TopBar(
            onBack = { state.back() },
            title = title,
            subtitle = subtitle,
        )
        EmptyState(
            title = "Layar ini menyusul",
            desc = "Halaman $title diporting pada slice berikutnya.",
            icon = { LucideIcon(KarsaIcons.Inbox, modifier = Modifier.size(36.dp), tint = Brand600) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
fun StackHost() {
    val state = LocalApp.current
    val stack = state.stack
    stack.forEachIndexed { index, route ->
        val top = index == stack.lastIndex
        key(route) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Paper)
                    .then(if (top) Modifier else Modifier.alpha(0f)),
            ) {
                PushIn(enabled = top) { RouteScreen(route) }
            }
        }
    }
}

@Composable
private fun PushIn(enabled: Boolean, content: @Composable () -> Unit) {
    val anim = remember { Animatable(if (enabled) 0f else 1f) }
    LaunchedEffect(enabled) {
        if (enabled) {
            anim.animateTo(
                targetValue = 1f,
                animationSpec = tween(320, easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f)),
            )
        }
    }
    val progress = if (enabled) anim.value else 1f
    Box(
        Modifier.graphicsLayer {
            alpha = 0.4f + 0.6f * progress
            translationX = 36.dp.toPx() * (1f - progress)
        },
    ) { content() }
}
