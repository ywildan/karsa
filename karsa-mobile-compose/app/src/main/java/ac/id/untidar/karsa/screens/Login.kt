package ac.id.untidar.karsa.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.LocalIndication
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Phase
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.components.GoogleMark
import ac.id.untidar.karsa.components.LogoMark
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf100
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.ui.pressScale
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KawungPattern
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.Spinner
import ac.id.untidar.karsa.ui.TermsText

@Composable
fun LoginScreen() {
    val state = LocalApp.current
    var waiting by remember { mutableStateOf(false) }

    LaunchedEffect(waiting) {
        if (waiting) {
            delay(2600)
            state.setPhase(Phase.App)
            state.notify("Selamat datang kembali, Nadia!", ToastTone.Success)
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize().background(Paper)) {
        val heroHeight = maxHeight * 0.46f
        Column(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(heroHeight)
                    .clip(RoundedCornerShape(bottomStart = 48.dp, bottomEnd = 48.dp))
                    .background(Brand500),
            ) {
                KawungPattern(Modifier.fillMaxSize(), color = Color.White, alpha = 0.2f)
                Box(
                    Modifier
                        .align(Alignment.TopStart)
                        .offset(x = (-64).dp, y = (-64).dp)
                        .size(256.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(Brand300.copy(alpha = 0.4f), Color.Transparent),
                            ),
                            androidx.compose.foundation.shape.CircleShape,
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 28.dp, end = 28.dp, bottom = 36.dp),
                ) {
                    LogoMark(size = 64.dp, tile = Espresso, ink = Brand300, radius = 20f)
                    Text(
                        "Masuk ke SiKarsa",
                        modifier = Modifier.padding(top = 24.dp),
                        style = displayStyle(40, 800, 1.02f, -0.02f, Color.White),
                    )
                    Text(
                        "Poin keaktifan, materi, dan diskusi kelas.",
                        modifier = Modifier.padding(top = 8.dp).width(310.dp),
                        style = sansStyle(15, 400, 1.5f, color = Color.White.copy(alpha = 0.85f)),
                    )
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(start = 28.dp, end = 28.dp, top = 32.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    if (waiting) {
                        Rise {
                            WaitingCard(onCancel = { waiting = false })
                        }
                    } else {
                        Rise {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                GoogleButton(onClick = { waiting = true })
                                Text(
                                    "Gunakan akun kampus berakhiran @student.karsa.ac.id agar poinmu tercatat.",
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                                    style = sansStyle(13, 400, 1.625f, color = Muted),
                                    textAlign = TextAlign.Center,
                                )
                            }
                        }
                    }

                    Column(
                        modifier = Modifier.fillMaxWidth().padding(top = 32.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        FeatureRow(
                            text = "Poin keaktifan tercatat rapi",
                            icon = KarsaIcons.Trophy,
                            tileColor = Brand100,
                            iconColor = Brand600,
                        )
                        FeatureRow(
                            text = "Grup kelas dalam satu tempat",
                            icon = KarsaIcons.MessagesSquare,
                            tileColor = Tide100,
                            iconColor = Tide600,
                        )
                        FeatureRow(
                            text = "Materi dari teman satu prodi",
                            icon = KarsaIcons.BookOpenText,
                            tileColor = Leaf100,
                            iconColor = Leaf600,
                        )
                    }
                }

                TermsText()
            }
        }
    }
}

@Composable
private fun GoogleButton(onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val shape = RoundedCornerShape(20.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .cardShadow(shape)
            .clip(shape)
            .background(Color.White)
            .border(1.dp, Line, shape)
            .pressScale(interaction)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
                onClick = onClick,
            ),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GoogleMark(size = 20.dp)
        Spacer(Modifier.width(12.dp))
        Text("Masuk dengan Google", style = sansStyle(16, 600, 1.2f, color = Ink))
    }
}

@Composable
private fun WaitingCard(onCancel: () -> Unit) {
    val shape = RoundedCornerShape(28.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .cardShadow(shape)
            .clip(shape)
            .background(Color.White)
            .border(1.dp, Ink.copy(alpha = 0.05f), shape)
            .padding(20.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brand100),
                contentAlignment = Alignment.Center,
            ) {
                Spinner(tint = Brand600, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(
                    "Menunggu login di browser...",
                    style = displayStyle(18, 700, 1.25f),
                )
                Text(
                    "Selesaikan masuk dengan akun Google kampusmu.",
                    modifier = Modifier.padding(top = 2.dp),
                    style = sansStyle(13, 400, 1.5f, color = Muted),
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        KarsaButton(
            text = "Batalkan",
            onClick = onCancel,
            variant = ButtonVariant.Ghost,
            full = true,
        )
    }
}

@Composable
private fun FeatureRow(
    text: String,
    icon: List<String>,
    tileColor: Color,
    iconColor: Color,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(tileColor),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(icon, modifier = Modifier.size(20.dp), tint = iconColor)
        }
        Text(text, style = sansStyle(14, 600, 1.4f, color = Ink2))
    }
}
