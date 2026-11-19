package ac.id.untidar.karsa.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.tabsFor
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.popShadow

private data class TabMeta(val tab: Tab, val label: String, val paths: List<String>)

private val TAB_META = mapOf(
    Tab.Lib to TabMeta(Tab.Lib, "Karsa Lib", KarsaIcons.BookOpen),
    Tab.Grup to TabMeta(Tab.Grup, "Grup", KarsaIcons.MessagesSquare),
    Tab.Input to TabMeta(Tab.Input, "Input poin", KarsaIcons.PenLine),
    Tab.Aktivitas to TabMeta(Tab.Aktivitas, "Aktivitas", KarsaIcons.Activity),
    Tab.Poinku to TabMeta(Tab.Poinku, "Poinku", KarsaIcons.Trophy),
    Tab.Akun to TabMeta(Tab.Akun, "Akun", KarsaIcons.UserRound),
)

@Composable
fun BoxScope.Dock() {
    val state = LocalApp.current
    val tabs = tabsFor(state.role)
    val hasInput = Tab.Input in tabs
    val sideTabs = tabs.filter { it != Tab.Input }

    Box(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .height(160.dp)
            .background(
                Brush.verticalGradient(
                    0f to Paper.copy(alpha = 0f),
                    0.35f to Paper.copy(alpha = 0.7f),
                    1f to Paper,
                ),
            ),
    )

    Box(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .navigationBarsPadding()
            .padding(horizontal = 12.dp, vertical = 12.dp)
            .fillMaxWidth()
            .height(106.dp),
    ) {
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(82.dp)
                .popShadow(CircleShape)
                .background(Espresso, CircleShape)
                .padding(start = 18.dp, end = 18.dp, bottom = 12.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            sideTabs.forEachIndexed { index, tab ->
                DockItem(
                    tab = tab,
                    active = state.tab == tab,
                    onSelect = { state.openTab(tab) },
                )
                if (hasInput && index == 1) {
                    // Fixed slot keeps the four side items balanced around the floating button.
                    Spacer(Modifier.width(76.dp))
                }
            }
        }

        if (hasInput) {
            CenterAction(onClick = { state.openTab(Tab.Input) })
        }
    }
}

@Composable
private fun RowScope.DockItem(tab: Tab, active: Boolean, onSelect: () -> Unit) {
    val meta = TAB_META.getValue(tab)
    val pillColor by animateColorAsState(
        targetValue = if (active) Brand500 else Color.Transparent,
        animationSpec = tween(250),
        label = "pillColor",
    )
    val contentColor by animateColorAsState(
        targetValue = if (active) Color.White else Color.White.copy(alpha = 0.55f),
        animationSpec = tween(250),
        label = "contentColor",
    )
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.94f else 1f,
        animationSpec = tween(150),
        label = "pillScale",
    )

    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = onSelect,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Bottom,
    ) {
        Box(
            modifier = Modifier
                .width(64.dp)
                .height(36.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .clip(RoundedCornerShape(18.dp))
                .background(pillColor),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(
                paths = meta.paths,
                modifier = Modifier.size(24.dp),
                tint = contentColor,
                strokeWidth = 2f,
            )
        }
        Spacer(Modifier.height(5.dp))
        Text(
            text = meta.label,
            style = sansStyle(11, 500, 1.2f, color = contentColor).copy(fontSize = 11.5.sp),
            maxLines = 1,
        )
    }
}

@Composable
private fun BoxScope.CenterAction(onClick: () -> Unit) {
    val meta = TAB_META.getValue(Tab.Input)
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.94f else 1f,
        animationSpec = tween(150),
        label = "fabScale",
    )

    Column(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(bottom = 12.dp)
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = onClick,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(68.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .drawBehind {
                    val glowRadius = size.minDimension * 0.72f
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Brand500.copy(alpha = 0.55f), Color.Transparent),
                            radius = glowRadius,
                        ),
                        radius = glowRadius,
                    )
                }
                .background(Brand500, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(
                paths = meta.paths,
                modifier = Modifier.size(28.dp),
                tint = Color.White,
                strokeWidth = 2.2f,
            )
        }
        Spacer(Modifier.height(12.dp))
        Text(
            text = meta.label,
            style = sansStyle(11, 500, 1.2f, color = Color.White).copy(fontSize = 11.5.sp),
            maxLines = 1,
        )
    }
}
