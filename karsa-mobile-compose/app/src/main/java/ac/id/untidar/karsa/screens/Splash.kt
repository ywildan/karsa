package ac.id.untidar.karsa.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter400
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Leaf100
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Plum100
import ac.id.untidar.karsa.theme.Plum600
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.cardShadow

private data class SplashSlide(
    val title: String,
    val desc: String,
    val card: @Composable (Modifier) -> Unit,
)

@Composable
fun SplashScreen() {
    val state = LocalApp.current
    val progress = rememberSplashProgress(onDone = { state.finishSplash() })
    val slides = remember {
        listOf(
            SplashSlide("Input poin", "Catat kontribusi mahasiswa") { InputPoinCard(it) },
            SplashSlide("Partisipasi teratas", "Podium & peringkat kelas") { PodiumCard(it) },
            SplashSlide("Materi kelas", "Unggah & sinkron materi") { MateriCard(it) },
            SplashSlide("Diskusi kelas", "Tanya jawab real-time") { DiskusiCard(it) },
            SplashSlide("Rekap poin", "Ringkasan nilai keaktifan") { RekapCard(it) },
        )
    }
    var active by remember { mutableIntStateOf(0) }
    LaunchedEffect(slides.size) {
        while (true) {
            delay(2800)
            active = (active + 1) % slides.size
        }
    }

    Box(Modifier.fillMaxSize().background(Paper)) {
        Box(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.46f)
                .background(Brush.verticalGradient(listOf(Brand400, Brand500, Brand600))),
        ) {
            DriftRings(Modifier.matchParentSize())

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .padding(top = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Box(Modifier.size(96.dp).border(3.dp, Color.White.copy(alpha = 0.35f), CircleShape))
                    PulseLogo(80.dp, ringColor = Color.White.copy(alpha = 0.4f), bg = Color.White, mark = Brand500)
                }
                Spacer(Modifier.height(12.dp))
                Text("SiKarsa", style = displayStyle(40, 800, 1f, -0.02f, Color.White))
                Spacer(Modifier.height(6.dp))
                Text(
                    "Poin keaktifan, materi, dan diskusi kelas.",
                    style = sansStyle(12, 400, 1.4f, color = Color.White.copy(alpha = 0.85f)),
                )
            }
        }

        val sheetShape = RoundedCornerShape(topStart = 40.dp, topEnd = 40.dp)
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.595f)
                .shadow(
                    elevation = 18.dp,
                    shape = sheetShape,
                    clip = false,
                    ambientColor = Espresso.copy(alpha = 0.18f),
                    spotColor = Espresso.copy(alpha = 0.25f),
                )
                .clip(sheetShape)
                .background(Paper)
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 20.dp),
        ) {
            Box(Modifier.fillMaxWidth().height(196.dp)) {
                Box(
                    Modifier
                        .matchParentSize()
                        .padding(start = 12.dp, end = 12.dp, top = 12.dp)
                        .graphicsLayer { translationY = 8.dp.toPx() }
                        .clip(RoundedCornerShape(28.dp))
                        .background(Color.White.copy(alpha = 0.7f)),
                )
                AnimatedContent(
                    targetState = active,
                    transitionSpec = {
                        (slideInHorizontally(tween(420, easing = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f))) { it / 5 } + fadeIn(tween(300))) togetherWith
                            (slideOutHorizontally(tween(360, easing = CubicBezierEasing(0.4f, 0f, 0.6f, 1f))) { -it / 5 } + fadeOut(tween(240)))
                    },
                    contentAlignment = Alignment.Center,
                    label = "splashCard",
                ) { index ->
                    slides[index].card(Modifier.fillMaxSize())
                }
            }

            Spacer(Modifier.height(14.dp))
            AnimatedContent(
                targetState = active,
                transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(160)) },
                label = "splashCaption",
            ) { index ->
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(slides[index].title, style = displayStyle(13, 800, 1.2f))
                    Text(slides[index].desc, style = sansStyle(10, 400, 1.4f, color = Muted))
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                slides.indices.forEach { index ->
                    val selected = index == active
                    val dotWidth by animateDpAsState(if (selected) 24.dp else 5.dp, tween(280), label = "dotWidth")
                    Box(
                        Modifier
                            .padding(horizontal = 3.dp)
                            .width(dotWidth)
                            .height(5.dp)
                            .clip(CircleShape)
                            .background(if (selected) Brand500 else Ink.copy(alpha = 0.15f)),
                    )
                }
            }

            Spacer(Modifier.weight(1f))
            ShimmerProgress(progress)
        }
    }
}

@Composable
private fun DriftRings(modifier: Modifier = Modifier) {
    val drift by rememberInfiniteTransition(label = "ringDrift").animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(7000, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "drift",
    )
    Canvas(modifier.clipToBounds()) {
        val offset = Offset(drift * 6.dp.toPx(), drift * 10.dp.toPx())
        drawCircle(
            color = Color.White.copy(alpha = 0.15f),
            radius = 104.dp.toPx(),
            center = Offset(size.width + 20.dp.toPx(), -24.dp.toPx()) + offset,
            style = Stroke(width = 14.dp.toPx()),
        )
        drawCircle(
            color = Color.White.copy(alpha = 0.15f),
            radius = 96.dp.toPx(),
            center = Offset(-40.dp.toPx(), 184.dp.toPx()) + offset,
            style = Stroke(width = 12.dp.toPx()),
        )
    }
}

@Composable
private fun rememberSplashProgress(durationMs: Int = 4200, onDone: () -> Unit): Float {
    val done by rememberUpdatedState(onDone)
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMs, easing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)),
        )
        delay(450)
        done()
    }
    return progress.value
}

/** Logo bunga empat kelopak, digambar sebagai outline seperti referensi. */
@Composable
private fun BloomLogo(logoSize: Dp, bg: Color, mark: Color) {
    Canvas(Modifier.size(logoSize).background(bg, CircleShape)) {
        val s = size.minDimension
        val stroke = Stroke(width = s * 0.04f, cap = StrokeCap.Round)
        repeat(4) { i ->
            rotate(degrees = i * 90f, pivot = center) {
                drawOval(
                    color = mark,
                    topLeft = Offset(s * 0.385f, s * 0.104f),
                    size = Size(s * 0.23f, s * 0.375f),
                    style = stroke,
                )
            }
        }
    }
}

@Composable
private fun PulseLogo(logoSize: Dp, ringColor: Color, bg: Color, mark: Color) {
    val enter = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        enter.animateTo(
            targetValue = 1f,
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = 180f),
        )
    }
    val pulse = rememberInfiniteTransition(label = "splashPulse")
    val ring1 by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2400, easing = LinearOutSlowInEasing)),
        label = "ring1",
    )
    val ring2 by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2400, easing = LinearOutSlowInEasing),
            initialStartOffset = StartOffset(1200),
        ),
        label = "ring2",
    )

    Box(Modifier.size(logoSize), contentAlignment = Alignment.Center) {
        listOf(ring1, ring2).forEach { p ->
            Box(
                Modifier
                    .size(logoSize)
                    .graphicsLayer {
                        scaleX = 1f + p * 0.55f
                        scaleY = 1f + p * 0.55f
                        alpha = (1f - p) * 0.55f
                    }
                    .border(2.dp, ringColor, CircleShape),
            )
        }
        Box(
            Modifier.graphicsLayer {
                scaleX = enter.value
                scaleY = enter.value
                rotationZ = (1f - enter.value) * -120f
                alpha = enter.value.coerceIn(0f, 1f)
            },
        ) {
            BloomLogo(logoSize, bg, mark)
        }
    }
}

@Composable
private fun ShimmerProgress(progress: Float) {
    val shift by rememberInfiniteTransition(label = "splashShimmer").animateFloat(
        initialValue = -0.4f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing)),
        label = "shimmer",
    )
    val label = when {
        progress >= 1f -> "SIAP DIGUNAKAN"
        progress < 0.30f -> "MENYIAPKAN KELAS"
        progress < 0.60f -> "MENYINKRONKAN MATERI"
        else -> "MEMUAT POIN KEAKTIFAN"
    }
    Column {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(label, style = sansStyle(9, 600, 1.4f, 0.22f, Ink.copy(alpha = 0.5f)))
            Text("${(progress * 100).toInt()}%", style = displayStyle(15, 800, 1f, 0f, Ink))
        }
        Spacer(Modifier.height(6.dp))
        Box(Modifier.fillMaxWidth().height(7.dp).clip(CircleShape).background(Paper2)) {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress.coerceIn(0f, 1f))
                    .clip(CircleShape)
                    .drawWithContent {
                        drawContent()
                        if (progress < 1f) {
                            val w = size.width
                            drawRect(
                                brush = Brush.horizontalGradient(
                                    colors = listOf(Color.Transparent, Color.White.copy(alpha = 0.7f), Color.Transparent),
                                    startX = w * shift - 60f,
                                    endX = w * shift + 60f,
                                ),
                            )
                        }
                    }
                    .background(Brand500),
            )
        }
    }
}

/* ───────────── Kartu fitur di carousel ───────────── */

@Composable
private fun BigCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(28.dp)
    Column(
        modifier
            .cardShadow(shape)
            .clip(shape)
            .background(Color.White),
        content = content,
    )
}

@Composable
private fun InputPoinCard(modifier: Modifier = Modifier) = BigCard(modifier) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Input poin", style = displayStyle(17, 800, 1.1f))
            Row(
                modifier = Modifier
                    .background(Ink, CircleShape)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LucideIcon(KarsaIcons.ShieldCheck, Modifier.size(13.dp), tint = Color.White, strokeWidth = 2.2f)
                Text("PJ KELAS", style = sansStyle(9, 700, 1.2f, 0.04f, Color.White))
            }
        }
        Spacer(Modifier.height(12.dp))
        StepRow("Mata kuliah", "Bahasa Indonesia · K1")
        Spacer(Modifier.height(10.dp))
        StepRow("Mahasiswa", "Rani Wulandari · NIM ••••1204")
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            (1..4).forEach { n ->
                val selected = n == 4
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp)
                        .clip(CircleShape)
                        .background(if (selected) Brand500 else Paper2),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        n.toString(),
                        style = displayStyle(13, 800, 1f, color = if (selected) Color.White else Ink),
                    )
                }
            }
        }
    }
}

@Composable
private fun StepRow(title: String, sub: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(28.dp).background(Leaf500, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.Check, Modifier.size(14.dp), tint = Color.White, strokeWidth = 3f)
        }
        Spacer(Modifier.width(10.dp))
        Column {
            Text(title, style = sansStyle(12, 700, 1.2f))
            Text(sub, style = sansStyle(10, 400, 1.3f, color = Ink.copy(alpha = 0.55f)), maxLines = 1)
        }
    }
}

@Composable
private fun PodiumCard(modifier: Modifier = Modifier) = BigCard(modifier) {
    Box(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Partisipasi teratas", style = displayStyle(17, 800, 1.1f))
        Row(
            Modifier.align(Alignment.BottomCenter),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            PodiumColumn("DA", "Dimas", 52.dp, Espresso, Color.White, Plum100, Plum600, "2", 64.dp, 36.dp, 20)
            PodiumColumn("RW", "Rani", 76.dp, Brand500, Color.White, Butter100, Brand600, "1", 66.dp, 44.dp, 30, crown = true)
            PodiumColumn("KM", "Kamu", 34.dp, Butter100, Butter700, Leaf100, Leaf500, "3", 64.dp, 36.dp, 20, ring = true)
        }
    }
}

@Composable
private fun PodiumColumn(
    initials: String,
    name: String,
    barHeight: Dp,
    barColor: Color,
    barText: Color,
    avatarBg: Color,
    avatarText: Color,
    rank: String,
    columnWidth: Dp,
    avatarSize: Dp,
    rankSize: Int,
    crown: Boolean = false,
    ring: Boolean = false,
) {
    Column(Modifier.width(columnWidth), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.height(14.dp), contentAlignment = Alignment.Center) {
            if (crown) {
                LucideIcon(KarsaIcons.Crown, Modifier.size(16.dp), tint = Butter400, strokeWidth = 2.2f)
            }
        }
        Box(
            Modifier
                .size(avatarSize)
                .then(if (ring) Modifier.border(3.dp, Brand500, CircleShape) else Modifier)
                .background(avatarBg, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials, style = sansStyle(11, 800, 1f, color = avatarText))
        }
        Spacer(Modifier.height(4.dp))
        Text(name, style = sansStyle(10, 700, 1.2f), maxLines = 1)
        Spacer(Modifier.height(6.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(barHeight)
                .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                .background(barColor),
            contentAlignment = Alignment.Center,
        ) {
            Text(rank, style = displayStyle(rankSize, 800, 1f, color = barText))
        }
    }
}

@Composable
private fun MateriCard(modifier: Modifier = Modifier) = BigCard(modifier) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Materi kelas", style = displayStyle(17, 800, 1.1f))
            Box(
                Modifier.background(Butter100, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Text("3 BARU", style = sansStyle(9, 700, 1.2f, 0.04f, Butter700))
            }
        }
        Spacer(Modifier.height(14.dp))
        MateriRow("Bab 3 · Teks Eksposisi", "PDF", 1f)
        Spacer(Modifier.height(12.dp))
        MateriRow("Bab 4 · Kalimat Efektif", "Slide", 0.7f)
        Spacer(Modifier.height(12.dp))
        MateriRow("Bab 5 · Ejaan & Tanda Baca", "Video", 0.35f)
    }
}

@Composable
private fun MateriRow(title: String, tag: String, progress: Float) {
    Column {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text(
                title,
                modifier = Modifier.weight(1f),
                style = sansStyle(11, 700, 1.2f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.width(8.dp))
            Box(Modifier.background(Paper2, CircleShape).padding(horizontal = 8.dp, vertical = 2.dp)) {
                Text(tag, style = sansStyle(9, 700, 1.2f, color = Ink.copy(alpha = 0.7f)))
            }
        }
        Spacer(Modifier.height(6.dp))
        Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Paper2)) {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress)
                    .clip(CircleShape)
                    .background(Brand500),
            )
        }
    }
}

@Composable
private fun DiskusiCard(modifier: Modifier = Modifier) = BigCard(modifier) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Diskusi kelas", style = displayStyle(17, 800, 1.1f))
            Row(
                Modifier.background(Leaf100, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(6.dp).background(Leaf500, CircleShape))
                Text("LIVE", style = sansStyle(9, 700, 1.2f, color = Leaf500))
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Box(
                Modifier.size(28.dp).background(Plum100, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("DA", style = sansStyle(9, 800, 1f, color = Plum600))
            }
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Paper2)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text("Apa beda opini dan fakta, Bu?", style = sansStyle(11, 500, 1.35f))
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brand500)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text("Fakta bisa dibuktikan", style = sansStyle(11, 600, 1.35f, color = Color.White))
            }
        }
        Spacer(Modifier.height(8.dp))
        Box(Modifier.background(Butter100, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp)) {
            Text("+5 poin diskusi", style = sansStyle(10, 700, 1.2f, color = Butter700))
        }
    }
}

@Composable
private fun RekapCard(modifier: Modifier = Modifier) = BigCard(modifier) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Rekap poin", style = displayStyle(17, 800, 1.1f))
            Box(Modifier.background(Ink, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp)) {
                Text("SEMESTER 4", style = sansStyle(9, 700, 1.2f, 0.04f, Color.White))
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Bottom) {
            Column {
                Text("1.240", style = displayStyle(34, 800, 1f, -0.01f, Brand600))
                Text("total poin keaktifan", style = sansStyle(10, 400, 1.3f, color = Ink.copy(alpha = 0.55f)))
            }
            Row(
                Modifier.height(70.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                listOf(38, 55, 44, 70, 62, 90).forEachIndexed { index, value ->
                    val last = index == 5
                    Box(
                        Modifier
                            .width(14.dp)
                            .height((70f * value / 100f).dp)
                            .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
                            .background(if (last) Brand500 else Butter100),
                    )
                }
            }
        }
    }
}
