package ac.id.untidar.karsa

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import ac.id.untidar.karsa.components.Dock
import ac.id.untidar.karsa.components.SnackbarHost
import ac.id.untidar.karsa.screens.LoginScreen
import ac.id.untidar.karsa.screens.OnboardingScreen
import ac.id.untidar.karsa.screens.SplashScreen
import ac.id.untidar.karsa.screens.StackHost
import ac.id.untidar.karsa.screens.TabsHost
import ac.id.untidar.karsa.theme.Paper

@Composable
fun KarsaApp() {
    val state = remember { KarsaState() }
    val view = LocalView.current

    CompositionLocalProvider(LocalApp provides state) {
        SideEffect {
            val activity = view.context.findActivity() ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
            controller.isAppearanceLightStatusBars = state.phase != Phase.Splash
            controller.isAppearanceLightNavigationBars = state.phase != Phase.Splash
        }

        val canGoBack = state.phase == Phase.App && (state.stack.isNotEmpty() || state.tab != Tab.Lib)
        BackHandler(enabled = canGoBack) { state.back() }

        Box(Modifier.fillMaxSize().background(Paper)) {
            when (state.phase) {
                Phase.Splash -> SplashScreen()
                Phase.Onboarding -> OnboardingScreen()
                Phase.Login -> LoginScreen()
                Phase.App -> {
                    Box(Modifier.fillMaxSize().statusBarsPadding().padding(top = 10.dp)) {
                        TabsHost()
                        StackHost()
                    }
                    if (state.stack.isEmpty()) Dock()
                    SnackbarHost()
                }
            }
        }
    }
}

private fun Context.findActivity(): Activity? {
    var context: Context? = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}
