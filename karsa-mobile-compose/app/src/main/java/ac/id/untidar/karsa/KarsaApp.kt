package ac.id.untidar.karsa

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import ac.id.untidar.karsa.auth.KarsaAuth
import ac.id.untidar.karsa.components.Dock
import ac.id.untidar.karsa.components.SnackbarHost
import ac.id.untidar.karsa.screens.LoginScreen
import ac.id.untidar.karsa.screens.OnboardingScreen
import ac.id.untidar.karsa.screens.SessionErrorScreen
import ac.id.untidar.karsa.screens.SplashScreen
import ac.id.untidar.karsa.screens.StackHost
import ac.id.untidar.karsa.screens.TabsHost
import ac.id.untidar.karsa.theme.Paper

@Composable
fun KarsaApp() {
    val context = LocalContext.current
    val auth = remember { KarsaAuth.get(context) }
    val state = remember { KarsaState(auth) }
    val view = LocalView.current

    LaunchedEffect(Unit) { auth.initialize() }
    LaunchedEffect(auth.state) { state.syncAuth() }
    LaunchedEffect(auth.user) { state.ensureTab() }

    CompositionLocalProvider(LocalApp provides state) {
        SideEffect {
            val activity = view.context.findActivity() ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
            controller.isAppearanceLightStatusBars = state.phase != Phase.Splash
            controller.isAppearanceLightNavigationBars = state.phase != Phase.Splash
        }

        val canGoBack = state.phase == Phase.App && state.canGoBack()
        BackHandler(enabled = canGoBack) { state.back() }

        Box(Modifier.fillMaxSize().background(Paper)) {
            when (state.phase) {
                Phase.Splash -> SplashScreen()
                Phase.Onboarding -> OnboardingScreen()
                Phase.Login -> LoginScreen()
                Phase.SessionError -> SessionErrorScreen()
                Phase.App -> {
                    Box(Modifier.fillMaxSize().statusBarsPadding().padding(top = 10.dp)) {
                        TabsHost()
                        StackHost()
                    }
                    AnimatedVisibility(
                        visible = state.stack.isEmpty(),
                        modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                        enter = slideInVertically(
                            initialOffsetY = { it },
                            animationSpec = tween(280, easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f)),
                        ) + fadeIn(tween(220)),
                        exit = slideOutVertically(
                            targetOffsetY = { it },
                            animationSpec = tween(180, easing = CubicBezierEasing(0.4f, 0f, 0.6f, 1f)),
                        ) + fadeOut(tween(140)),
                    ) {
                        Box(Modifier.fillMaxWidth()) { Dock() }
                    }
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
