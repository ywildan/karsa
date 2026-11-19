package ac.id.untidar.karsa.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.components.LogoMark
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.KawungPattern

@Composable
fun SplashScreen() {
    val state = LocalApp.current
    LaunchedEffect(Unit) {
        delay(2600)
        state.finishSplash()
    }

    val rise = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        rise.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 450,
                easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f),
            ),
        )
    }
    val load = remember { Animatable(0.04f) }
    LaunchedEffect(Unit) {
        load.animateTo(targetValue = 1f, animationSpec = tween(2400, easing = LinearEasing))
    }
    val float = rememberInfiniteTransition(label = "splashFloat")
    val floatY by float.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "floatY",
    )

    Box(Modifier.fillMaxSize().background(Espresso)) {
        KawungPattern(Modifier.fillMaxSize(), color = Color.White, alpha = 0.2f, fade = true)

        Box(
            Modifier
                .fillMaxSize()
                .drawBehind {
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(Brand500.copy(alpha = 0.25f), Color.Transparent),
                            center = androidx.compose.ui.geometry.Offset(size.width / 2f, size.height * 0.42f),
                            radius = 180.dp.toPx(),
                        ),
                    )
                },
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    alpha = rise.value
                    translationY = 14.dp.toPx() * (1f - rise.value)
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(Modifier.graphicsLayer { translationY = -8.dp.toPx() * floatY }) {
                LogoMark(size = 92.dp, radius = 28f)
            }
            Text(
                text = "SiKarsa",
                modifier = Modifier.padding(top = 28.dp),
                style = displayStyle(44, 800, 1f, -0.02f, Color.White),
            )
            Text(
                text = "Poin keaktifan, materi, dan diskusi kelas.",
                modifier = Modifier.padding(top = 12.dp).width(230.dp),
                style = sansStyle(15, 400, 1.5f, color = Color.White.copy(alpha = 0.65f)),
                textAlign = TextAlign.Center,
            )
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 64.dp, vertical = 64.dp)
                .fillMaxWidth(),
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .graphicsLayer {
                            scaleX = load.value
                            transformOrigin = TransformOrigin(0f, 0.5f)
                        }
                        .clip(CircleShape)
                        .background(Brand400),
                )
            }
            Text(
                text = "MENYIAPKAN RUANG KELASMU",
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                style = sansStyle(11, 600, 1.4f, 0.2f, Color.White.copy(alpha = 0.4f)),
                textAlign = TextAlign.Center,
            )
        }
    }
}
