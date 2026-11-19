package ac.id.untidar.karsa.components

import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.ui.popShadow
import ac.id.untidar.karsa.ui.pressScale
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.brandShadow

private data class TabMeta(val tab: Tab, val label: String, val paths: List<String>)

private val TAB_META = mapOf(
    Tab.Lib to TabMeta(Tab.Lib, "Karsa Lib", KarsaIcons.BookOpenText),
    Tab.Grup to TabMeta(Tab.Grup, "Grup", KarsaIcons.MessagesSquare),
    Tab.Input to TabMeta(Tab.Input, "Input poin", KarsaIcons.PenLine),
    Tab.Aktivitas to TabMeta(Tab.Aktivitas, "Aktivitas", KarsaIcons.Activity),
    Tab.Poinku to TabMeta(Tab.Poinku, "Poinku", KarsaIcons.Trophy),
    Tab.Akun to TabMeta(Tab.Akun, "Akun", KarsaIcons.UserRound),
)

@Composable
fun BoxScope.Dock() {
    val state = LocalApp.current
    val tabs = ac.id.untidar.karsa.tabsFor(state.role)
    val shape = RoundedCornerShape(30.dp)

    Box(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .height(128.dp)
            .background(
                Brush.verticalGradient(
                    0f to Paper.copy(alpha = 0f),
                    0.35f to Paper.copy(alpha = 0.7f),
                    1f to Paper,
                ),
            ),
    )

    Row(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .navigationBarsPadding()
            .padding(horizontal = 12.dp, vertical = 12.dp)
            .fillMaxWidth()
            .popShadow(shape)
            .background(Espresso, shape)
            .border(1.dp, Color.White.copy(alpha = 0.1f), shape)
            .padding(horizontal = 6.dp, vertical = 8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        tabs.forEach { tab ->
            val meta = TAB_META.getValue(tab)
            val active = state.tab == tab
            val primary = tab == Tab.Input
            val interaction = remember { MutableInteractionSource() }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .pressScale(interaction, 0.95f)
                    .clickable(
                        interactionSource = interaction,
                        indication = null,
                        onClick = { state.setTab(tab) },
                    )
                    .padding(vertical = 1.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (primary) {
                    val tileShape = RoundedCornerShape(20.dp)
                    Box(
                        modifier = Modifier
                            .offset(y = (-16).dp)
                            .size(52.dp)
                            .brandShadow(tileShape)
                            .clip(tileShape)
                            .background(if (active) Brand400 else Brand500)
                            .border(5.dp, Espresso, tileShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        LucideIcon(meta.paths, modifier = Modifier.size(24.dp), tint = Color.White, strokeWidth = 2.2f)
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .height(32.dp)
                            .width(56.dp)
                            .clip(CircleShape)
                            .background(if (active) Brand500 else Color.Transparent),
                        contentAlignment = Alignment.Center,
                    ) {
                        LucideIcon(
                            meta.paths,
                            modifier = Modifier.size(22.dp),
                            tint = if (active) Color.White else Color.White.copy(alpha = 0.6f),
                            strokeWidth = if (active) 2.3f else 1.9f,
                        )
                    }
                }
                Text(
                    text = meta.label,
                    style = sansStyle(
                        size = 11,
                        weight = 600,
                        lineHeight = 1f,
                        trackingEm = 0.025f,
                        color = if (active || primary) Color.White else Color.White.copy(alpha = 0.55f),
                    ),
                    maxLines = 1,
                    fontSize = 10.5.sp,
                )
            }
        }
    }
}
