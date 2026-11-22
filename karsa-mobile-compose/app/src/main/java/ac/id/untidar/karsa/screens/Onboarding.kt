package ac.id.untidar.karsa.screens

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Phase
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter400
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.ui.brandShadow
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.ui.popShadow
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.BatikPattern
import ac.id.untidar.karsa.ui.PointBadge
import ac.id.untidar.karsa.ui.Rise

private class OnboardingPage(
    val no: String,
    val kicker: String,
    val title: String,
    val background: Color,
)

private val PAGES = listOf(
    OnboardingPage("01", "Poin akademik", "Setiap kontribusi punya tempat.", Brand500),
    OnboardingPage("02", "Grup kelas", "Percakapan kelas tetap dekat.", Tide600),
    OnboardingPage("03", "Karsa Lib", "Ilmu tumbuh saat dibagikan.", Leaf600),
)

@Composable
fun OnboardingScreen() {
    val state = LocalApp.current
    val pager = rememberPagerState { PAGES.size }
    val scope = rememberCoroutineScope()
    val last = pager.currentPage == PAGES.lastIndex

    Column(Modifier.fillMaxSize().background(Paper).statusBarsPadding()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PAGES.indices.forEach { index ->
                    val progress by animateFloatAsState(
                        targetValue = if (index <= pager.currentPage) 1f else 0f,
                        animationSpec = tween(500),
                        label = "segment$index",
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(6.dp)
                            .clip(CircleShape)
                            .background(Paper3)
                            .clickable { scope.launch { pager.animateScrollToPage(index) } },
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(progress)
                                .height(6.dp)
                                .clip(CircleShape)
                                .background(Espresso),
                        )
                    }
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                text = "Lewati",
                modifier = Modifier.clickable { state.goPhase(Phase.Login) }.padding(4.dp),
                style = sansStyle(14, 600, 1.2f, color = Ink2),
            )
        }

        HorizontalPager(
            state = pager,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 20.dp),
        ) { index ->
            OnboardingCard(PAGES[index], index)
        }

        Column(Modifier.padding(start = 28.dp, end = 28.dp, top = 24.dp, bottom = 32.dp)) {
            key(pager.currentPage) {
                Rise {
                    Column {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                PAGES[pager.currentPage].no,
                                style = displayStyle(16, 700, 1.2f),
                            )
                            Box(Modifier.width(32.dp).height(1.dp).background(Brand300))
                            Text(
                                PAGES[pager.currentPage].kicker.uppercase(),
                                style = sansStyle(11, 700, 1.4f, 0.18f, Brand700),
                            )
                        }
                        Text(
                            PAGES[pager.currentPage].title,
                            modifier = Modifier.padding(top = 12.dp),
                            style = displayStyle(32, 800, 1.05f, -0.02f),
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            KarsaButton(
                text = if (last) "Mulai sekarang" else "Lanjut",
                onClick = {
                    if (last) {
                        state.goPhase(Phase.Login)
                    } else {
                        scope.launch {
                            pager.animateScrollToPage(
                                page = pager.currentPage + 1,
                                animationSpec = tween(
                                    durationMillis = 500,
                                    easing = CubicBezierEasing(0.2f, 0.9f, 0.2f, 1f),
                                ),
                            )
                        }
                    }
                },
                size = ButtonSize.Lg,
                full = true,
                trailing = {
                    LucideIcon(KarsaIcons.ArrowRight, modifier = Modifier.size(20.dp), tint = Color.White)
                },
            )
        }
    }
}

@Composable
private fun OnboardingCard(page: OnboardingPage, index: Int) {
    val shape = RoundedCornerShape(40.dp)
    Box(Modifier.fillMaxSize().clip(shape).background(page.background)) {
        BatikPattern(Modifier.fillMaxSize(), color = Color.White, alpha = 0.2f)
        Box(
            Modifier
                .align(Alignment.TopEnd)
                .offset(x = 40.dp, y = (-40).dp)
                .size(176.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color.White.copy(alpha = 0.1f), Color.Transparent),
                    ),
                    CircleShape,
                ),
        )
        when (index) {
            0 -> ArtPoints()
            1 -> ArtGroup()
            else -> ArtLib()
        }
    }
}

@Composable
private fun FloatingBox(
    startDelayMillis: Int = 0,
    modifier: Modifier = Modifier,
    amplitude: Dp = 8.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    val transition = rememberInfiniteTransition(label = "float")
    val value by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(startDelayMillis),
        ),
        label = "floatValue",
    )
    Box(modifier.offset(y = -amplitude * value), content = content)
}

@Composable
private fun ArtPoints() {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        FloatingBox(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 24.dp, top = 36.dp)
                .fillMaxWidth(0.78f),
        ) {
            Row(
                modifier = Modifier
                    .popShadow(RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Avatar(name = "Aulia Rahmawati", size = 42.dp)
                Column(Modifier.weight(1f)) {
                    Text(
                        "Aulia Rahmawati",
                        style = sansStyle(14, 700, 1.4f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "Menjawab pertanyaan · Basis Data",
                        style = sansStyle(12, 400, 1.4f, color = Muted),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                PointBadge(3)
            }
        }

        FloatingBox(
            startDelayMillis = 2000,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(y = maxHeight * 0.42f)
                .padding(end = 20.dp)
                .fillMaxWidth(0.62f),
        ) {
            Column(
                modifier = Modifier
                    .popShadow(RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(24.dp))
                    .background(Espresso)
                    .padding(16.dp),
            ) {
                Text(
                    "TOTAL POIN KEAKTIFAN",
                    style = sansStyle(11, 700, 1.4f, 0.1f, Color.White.copy(alpha = 0.5f)),
                )
                Text(
                    "31",
                    modifier = Modifier.padding(top = 4.dp),
                    style = displayStyle(48, 800, 1f, color = Color.White),
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    listOf(3, 4, 2, 3, 4, 2).forEach { n ->
                        Box(
                            Modifier
                                .weight(1f)
                                .height((8 + n * 6).dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(Brand400.copy(alpha = 0.35f + n * 0.16f)),
                        )
                    }
                }
            }
        }

        FloatingBox(
            startDelayMillis = 1400,
            modifier = Modifier.align(Alignment.BottomStart).padding(start = 28.dp, bottom = 28.dp),
        ) {
            Row(
                modifier = Modifier
                    .popShadow(CircleShape)
                    .clip(CircleShape)
                    .background(Color.White)
                    .padding(start = 8.dp, end = 20.dp, top = 8.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PointBadge(4)
                Text("Presentasi", style = sansStyle(14, 700, 1.2f))
            }
        }
    }
}

@Composable
private fun ArtGroup() {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .align(Alignment.TopStart)
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 28.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White.copy(alpha = 0.9f))
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                LucideIcon(KarsaIcons.Pin, modifier = Modifier.size(16.dp), tint = Brand600)
                Text(
                    "Kuis Kamis 10.00, Lab 3",
                    style = sansStyle(13, 600, 1.4f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        FloatingBox(
            modifier = Modifier
                .align(Alignment.TopStart)
                .offset(y = maxHeight * 0.27f)
                .padding(start = 24.dp)
                .fillMaxWidth(0.7f),
        ) {
            Column(
                modifier = Modifier
                    .popShadow(RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomEnd = 24.dp, bottomStart = 8.dp))
                    .background(Color.White)
                    .padding(16.dp),
            ) {
                Text("Intan", style = sansStyle(11, 700, 1.4f, color = Tide600))
                Text(
                    "Ada yang punya catatan BCNF?",
                    modifier = Modifier.padding(top = 2.dp),
                    style = sansStyle(14, 400, 1.4f),
                )
            }
        }

        FloatingBox(
            startDelayMillis = 2000,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(y = maxHeight * 0.5f)
                .padding(end = 24.dp)
                .fillMaxWidth(0.68f),
        ) {
            Column(
                modifier = Modifier
                    .popShadow(RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomEnd = 8.dp, bottomStart = 24.dp))
                    .background(Brand500)
                    .padding(16.dp),
            ) {
                Text("Kuunggah di drive kelas ya!", style = sansStyle(14, 400, 1.4f, color = Color.White))
            }
        }

        FloatingBox(
            startDelayMillis = 1400,
            modifier = Modifier.align(Alignment.BottomStart).padding(start = 24.dp, bottom = 28.dp),
        ) {
            Row(
                modifier = Modifier
                    .popShadow(CircleShape)
                    .clip(CircleShape)
                    .background(Espresso)
                    .padding(start = 4.dp, end = 20.dp, top = 6.dp, bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.width(62.dp).height(26.dp)) {
                    listOf("Aulia R", "Bagas S", "Cahya N").forEachIndexed { index, name ->
                        Avatar(
                            name = name,
                            modifier = Modifier.offset(x = (index * 18).dp),
                            size = 26.dp,
                            border = 2.dp,
                            borderColor = Espresso,
                        )
                    }
                }
                Text("38 anggota", style = sansStyle(12, 600, 1.2f, color = Color.White))
            }
        }
    }
}

@Composable
private fun ArtLib() {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        FloatingBox(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 24.dp, top = 32.dp)
                .fillMaxWidth(0.8f),
        ) {
            Column(
                modifier = Modifier
                    .popShadow(RoundedCornerShape(24.dp))
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White)
                    .padding(20.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Avatar(name = "Rafi Hidayat", size = 28.dp)
                    Text("Rafi Hidayat", style = sansStyle(12, 600, 1.4f, color = Ink2))
                }
                Text(
                    "Normalisasi tanpa pusing lewat satu studi kasus",
                    modifier = Modifier.padding(top = 12.dp),
                    style = displayStyle(20, 700, 1.25f),
                )
                Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(Paper3))
                    Box(Modifier.fillMaxWidth(0.83f).height(8.dp).clip(CircleShape).background(Paper3))
                    Box(Modifier.fillMaxWidth(0.66f).height(8.dp).clip(CircleShape).background(Paper3))
                }
                Row(
                    modifier = Modifier.padding(top = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        LucideIcon(KarsaIcons.Eye, modifier = Modifier.size(16.dp), tint = Muted, strokeWidth = 1.6f)
                        Text("214", style = sansStyle(12, 600, 1.2f, color = Muted))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        LucideIcon(KarsaIcons.MessageCircle, modifier = Modifier.size(16.dp), tint = Muted, strokeWidth = 1.6f)
                        Text("14", style = sansStyle(12, 600, 1.2f, color = Muted))
                    }
                }
            }
        }

        FloatingBox(
            startDelayMillis = 2500,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 24.dp, bottom = 32.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .popShadow(RoundedCornerShape(28.dp))
                    .clip(RoundedCornerShape(28.dp))
                    .background(Espresso),
                contentAlignment = Alignment.Center,
            ) {
                LucideIcon(KarsaIcons.BookOpenText, modifier = Modifier.size(36.dp), tint = Butter400)
            }
        }

        FloatingBox(
            startDelayMillis = 1000,
            modifier = Modifier.align(Alignment.BottomStart).padding(start = 32.dp, bottom = 48.dp),
        ) {
            Box(
                modifier = Modifier
                    .brandShadow(CircleShape)
                    .clip(CircleShape)
                    .background(Brand500)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Text("+ Tulis", style = sansStyle(14, 700, 1.2f, color = Color.White))
            }
        }
    }
}
