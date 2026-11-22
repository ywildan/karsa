package ac.id.untidar.karsa.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.LocalIndication
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.BuildConfig
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.auth.SessionState
import ac.id.untidar.karsa.components.GoogleMark
import ac.id.untidar.karsa.components.LogoMark
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
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
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.BatikPattern
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.Spinner
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.ui.pressScale

@Composable
fun LoginScreen() {
    val state = LocalApp.current
    val auth = state.auth
    val context = LocalContext.current
    var accepted by remember { mutableStateOf(false) }
    var termsError by remember { mutableStateOf<String?>(null) }
    val authenticating = auth.state == SessionState.Authenticating
    val message = termsError ?: auth.error

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
                BatikPattern(Modifier.fillMaxSize(), color = Color.White, alpha = 0.2f)
                Box(
                    Modifier
                        .align(Alignment.TopStart)
                        .offset(x = (-64).dp, y = (-64).dp)
                        .size(256.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(Brand300.copy(alpha = 0.4f), Color.Transparent),
                            ),
                            CircleShape,
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
                    .verticalScroll(rememberScrollState())
                    .navigationBarsPadding()
                    .padding(start = 28.dp, end = 28.dp, top = 28.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    if (authenticating) {
                        Rise {
                            WaitingCard(exchanging = auth.exchanging, onCancel = { auth.cancelSignIn() })
                        }
                    } else {
                        Rise {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                if (message != null) {
                                    AuthErrorBanner(
                                        message = message,
                                        onDismiss = {
                                            termsError = null
                                            auth.clearError()
                                        },
                                    )
                                }
                                TermsCard(
                                    accepted = accepted,
                                    onToggle = {
                                        accepted = !accepted
                                        termsError = null
                                    },
                                    onOpenTerms = { openExternal(context, legalUrl("/syarat-penggunaan")) },
                                    onOpenPrivacy = { openExternal(context, legalUrl("/kebijakan-privasi")) },
                                )
                                GoogleButton(
                                    onClick = {
                                        if (!accepted) {
                                            termsError = "Baca dan setujui Syarat Penggunaan sebelum masuk."
                                        } else {
                                            auth.signIn(true)
                                        }
                                    },
                                )
                                Text(
                                    "Gunakan akun kampus berakhiran @students.untidar.ac.id agar poinmu tercatat.",
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

                Text(
                    "Login berlangsung melalui browser. Kata sandi Google tidak disimpan di aplikasi.",
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                    style = sansStyle(12, 400, 1.5f, color = Muted),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
fun SessionErrorScreen() {
    val state = LocalApp.current
    val auth = state.auth
    Box(Modifier.fillMaxSize().background(Paper)) {
        BatikPattern(Modifier.fillMaxSize(), color = Brand500, alpha = 0.06f, fade = true)
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LogoMark(size = 72.dp, radius = 22f)
            Text(
                "Belum bisa memeriksa sesi",
                modifier = Modifier.padding(top = 28.dp),
                style = displayStyle(30, 800, 1.1f, -0.02f),
                textAlign = TextAlign.Center,
            )
            Text(
                auth.error ?: "Periksa koneksi internetmu, lalu coba lagi.",
                modifier = Modifier.padding(top = 12.dp).width(300.dp),
                style = sansStyle(15, 400, 1.625f, color = Ink2),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            KarsaButton(
                text = "Coba lagi",
                onClick = { auth.retrySession() },
                size = ButtonSize.Lg,
                full = true,
                loading = auth.state == SessionState.Loading,
                leading = {
                    LucideIcon(
                        KarsaIcons.RefreshCw,
                        modifier = Modifier.size(18.dp),
                        tint = Color.White,
                    )
                },
            )
            Text(
                "Sesi kamu tetap tersimpan di perangkat ini.",
                modifier = Modifier.padding(top = 14.dp),
                style = sansStyle(12, 400, 1.4f, color = Muted),
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun AuthErrorBanner(message: String, onDismiss: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Danger100)
            .border(1.dp, Danger500.copy(alpha = 0.18f), RoundedCornerShape(20.dp))
            .padding(start = 14.dp, end = 8.dp, top = 14.dp, bottom = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.White.copy(alpha = 0.7f)),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.ShieldAlert, modifier = Modifier.size(17.dp), tint = Danger500)
        }
        Text(
            message,
            modifier = Modifier.weight(1f).padding(top = 4.dp),
            style = sansStyle(13, 500, 1.5f, color = Danger500),
        )
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(KarsaIcons.X, modifier = Modifier.size(16.dp), tint = Danger500)
        }
    }
}

@Composable
private fun TermsCard(
    accepted: Boolean,
    onToggle: () -> Unit,
    onOpenTerms: () -> Unit,
    onOpenPrivacy: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Color.White)
            .border(1.dp, Line, RoundedCornerShape(22.dp))
            .toggleable(
                value = accepted,
                role = androidx.compose.ui.semantics.Role.Checkbox,
                onValueChange = { onToggle() },
            )
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(if (accepted) Brand500 else Color.White)
                .border(1.dp, if (accepted) Brand500 else Line, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (accepted) {
                LucideIcon(KarsaIcons.Check, modifier = Modifier.size(15.dp), tint = Color.White, strokeWidth = 2.6f)
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Saya telah membaca dan menyetujui dokumen berikut.",
                style = sansStyle(13, 500, 1.5f, color = Ink2),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                LegalLink("Syarat Penggunaan", onOpenTerms)
                Text("  ·  ", style = sansStyle(13, 400, 1.5f, color = Muted))
                LegalLink("Kebijakan Privasi", onOpenPrivacy)
            }
            Text(
                "Data poin dan aktivitas digunakan untuk keperluan akademik.",
                style = sansStyle(12, 400, 1.5f, color = Muted),
            )
        }
    }
}

@Composable
private fun LegalLink(text: String, onClick: () -> Unit) {
    Text(
        text,
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp),
        style = sansStyle(13, 700, 1.5f, color = Brand700).copy(
            textDecoration = TextDecoration.Underline,
        ),
    )
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
private fun WaitingCard(exchanging: Boolean, onCancel: () -> Unit) {
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
                    if (exchanging) "Menyiapkan akun..." else "Menunggu login di browser...",
                    style = displayStyle(18, 700, 1.25f),
                )
                Text(
                    if (exchanging) {
                        "Kami sedang menyelesaikan proses masuk."
                    } else {
                        "Selesaikan masuk dengan akun Google kampusmu."
                    },
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
            enabled = !exchanging,
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

private fun legalUrl(path: String): String = BuildConfig.API_BASE_URL.trimEnd('/') + path

private fun openExternal(context: Context, url: String) {
    try {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse(url))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    } catch (_: Exception) {
        // Tidak ada browser yang bisa membuka dokumen.
    }
}
