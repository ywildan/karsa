package ac.id.untidar.karsa.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Phase
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.ToastData
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.ui.popShadow
import ac.id.untidar.karsa.theme.sansStyle

@Composable
fun BoxScope.SnackbarHost() {
    val state = LocalApp.current
    val toast = state.toast ?: return

    LaunchedEffect(toast.id) {
        delay(3800)
        if (state.toast?.id == toast.id) state.dismissToast()
    }

    val aboveBar = state.phase == Phase.App && state.tab == Tab.Input && state.stack.isEmpty()
    Box(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .navigationBarsPadding()
            .padding(horizontal = 16.dp)
            .padding(bottom = if (aboveBar) 252.dp else 140.dp)
            .fillMaxWidth(),
    ) {
        key(toast.id) {
            ToastCard(
                toast = toast,
                onAction = {
                    toast.onAction?.invoke()
                    state.dismissToast()
                },
            )
        }
    }
}

@Composable
private fun ToastCard(toast: ToastData, onAction: () -> Unit) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 350,
                easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f),
            ),
        )
    }
    val background = when (toast.tone) {
        ToastTone.Success -> Leaf500
        ToastTone.Error -> Danger500
        ToastTone.Neutral -> Espresso
    }
    val icon = when (toast.tone) {
        ToastTone.Success -> KarsaIcons.CheckCircle2
        ToastTone.Error -> KarsaIcons.TriangleAlert
        ToastTone.Neutral -> KarsaIcons.Info
    }
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                alpha = progress.value
                translationY = 16.dp.toPx() * (1f - progress.value)
                val scale = 0.96f + 0.04f * progress.value
                scaleX = scale
                scaleY = scale
            }
            .popShadow(shape)
            .clip(shape)
            .background(background)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LucideIcon(icon, modifier = Modifier.size(20.dp), tint = Color.White)
        Text(
            text = toast.msg,
            modifier = Modifier.weight(1f),
            style = sansStyle(14, 600, 1.375f, color = Color.White),
        )
        if (toast.actionLabel != null) {
            Spacer(Modifier.width(0.dp))
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f))
                    .clickable(onClick = onAction)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(toast.actionLabel, style = sansStyle(12, 700, 1.2f, color = Color.White))
            }
        }
    }
}
