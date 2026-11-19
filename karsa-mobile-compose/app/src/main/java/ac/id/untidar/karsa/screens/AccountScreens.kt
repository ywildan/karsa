package ac.id.untidar.karsa.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.AuthorStatus
import ac.id.untidar.karsa.BuildConfig
import ac.id.untidar.karsa.LegalDoc
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Role
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.data.LEGAL_PRIVACY
import ac.id.untidar.karsa.data.LEGAL_TERMS
import ac.id.untidar.karsa.data.ME
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand500
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
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Tide100
import ac.id.untidar.karsa.theme.Tide600
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KawungPattern
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.ui.rememberLoad

@Composable
fun AccountScreen() {
    val state = LocalApp.current
    val load = rememberLoad(delayMillis = 500)
    var confirm by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(title = "Akun", eyebrow = { EyebrowText("Profil") })
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 112.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Gate(
                status = load.status,
                onRetry = load.retry,
                skeleton = {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Skeleton(Modifier.fillMaxWidth().height(176.dp), RoundedCornerShape(32.dp))
                        Skeleton(Modifier.fillMaxWidth().height(256.dp), RoundedCornerShape(28.dp))
                    }
                },
            ) {
                Rise {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .cardShadow(RoundedCornerShape(32.dp))
                            .clip(RoundedCornerShape(32.dp))
                            .background(Espresso)
                            .padding(24.dp),
                    ) {
                        Box(Modifier.fillMaxWidth()) {
                            KawungPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.12f)
                            Column {
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Avatar(
                                        name = ME.name,
                                        size = 68.dp,
                                        tone = ac.id.untidar.karsa.ui.Tone.Brand,
                                        border = 4.dp,
                                        borderColor = Color.White.copy(alpha = 0.1f),
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(ME.name, style = displayStyle(22, 700, 1.25f, color = Color.White))
                                        Text(
                                            ME.email,
                                            style = sansStyle(13, 400, 1.4f, color = Color.White.copy(alpha = 0.6f)),
                                            maxLines = 1,
                                        )
                                    }
                                }
                                Spacer(Modifier.height(20.dp))
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(Color.White.copy(alpha = 0.1f))
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column {
                                        Text(
                                            "NIM",
                                            style = sansStyle(11, 700, 1.4f, 0.1f, Color.White.copy(alpha = 0.5f)),
                                        )
                                        Text(ME.nim, style = displayStyle(18, 700, 1.2f, 0.02f, Color.White))
                                    }
                                    val isPj = state.role == Role.Pj
                                    Badge(
                                        if (isPj) "PJ KELAS" else "MAHASISWA",
                                        tone = BadgeTone.Solid,
                                        icon = {
                                            LucideIcon(
                                                if (isPj) KarsaIcons.ShieldCheck else KarsaIcons.GraduationCap,
                                                modifier = Modifier.size(12.dp),
                                                tint = Color.White,
                                            )
                                        },
                                    )
                                }
                            }
                        }
                    }
                }

                Rise(delayMillis = 70) {
                    Column {
                        Text(
                            "Identitas dan akses",
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
                            style = displayStyle(18, 700),
                        )
                        KarsaCard {
                            Column {
                                InfoRow(KarsaIcons.ShieldCheck, "Akses Karsa") {
                                    Text(
                                        if (state.role == Role.Pj) "PJ Kelas · dapat menginput poin" else "Mahasiswa · akses baca dan diskusi",
                                        style = sansStyle(13, 400, 1.4f, color = Muted),
                                    )
                                }
                                Divider()
                                InfoRow(KarsaIcons.Building2, "Fakultas Karsa Lib") {
                                    Text(state.authorProfile.fakultas, style = sansStyle(13, 400, 1.4f, color = Muted))
                                }
                                Divider()
                                InfoRow(KarsaIcons.GraduationCap, "Prodi Karsa Lib") {
                                    Text(state.authorProfile.prodi, style = sansStyle(13, 400, 1.4f, color = Muted))
                                }
                                Divider()
                                InfoRow(KarsaIcons.Users, "Kelas Karsa Lib") {
                                    Text(
                                        state.authorProfile.kelas.ifEmpty { "Belum diatur" },
                                        style = sansStyle(13, 400, 1.4f, color = Muted),
                                    )
                                }
                                Divider()
                                InfoRow(KarsaIcons.PenLine, "Akses menulis") {
                                    val tone = when (state.authorStatus) {
                                        AuthorStatus.Approved -> BadgeTone.Leaf
                                        AuthorStatus.Pending -> BadgeTone.Tide
                                        AuthorStatus.None -> BadgeTone.Neutral
                                    }
                                    Badge(
                                        when (state.authorStatus) {
                                            AuthorStatus.Approved -> "DISETUJUI"
                                            AuthorStatus.Pending -> "MENUNGGU TINJAUAN"
                                            AuthorStatus.None -> "BELUM DIAJUKAN"
                                        },
                                        tone = tone,
                                    )
                                }
                                Divider()
                                InfoRow(
                                    KarsaIcons.UserPen,
                                    "Profil penulis",
                                    onClick = { state.go(Route.Author) },
                                ) {
                                    Text("Nama, fakultas, prodi, kelas", style = sansStyle(13, 400, 1.4f, color = Muted))
                                }
                            }
                        }
                    }
                }

                Rise(delayMillis = 140) {
                    Column {
                        Text(
                            "Informasi aplikasi",
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
                            style = displayStyle(18, 700),
                        )
                        KarsaCard {
                            Column {
                                InfoRow(KarsaIcons.FileText, "Syarat Penggunaan", onClick = { state.go(Route.Legal(LegalDoc.Terms)) })
                                Divider()
                                InfoRow(KarsaIcons.Lock, "Kebijakan Privasi", onClick = { state.go(Route.Legal(LegalDoc.Privacy)) })
                            }
                        }
                    }
                }

                Rise(delayMillis = 200) {
                    Column {
                        KarsaButton(
                            text = "Keluar dari aplikasi",
                            onClick = { confirm = true },
                            variant = ButtonVariant.DangerSoft,
                            size = ButtonSize.Lg,
                            full = true,
                            leading = { LucideIcon(KarsaIcons.LogOut, modifier = Modifier.size(20.dp), tint = Danger500) },
                        )
                        Spacer(Modifier.height(24.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            LucideIcon(KarsaIcons.BadgeCheck, modifier = Modifier.size(16.dp), tint = Brand500)
                            Spacer(Modifier.size(6.dp))
                            Text(
                                "SiKarsa Mobile ${BuildConfig.VERSION_NAME}",
                                style = sansStyle(12, 600, 1.4f, color = Muted),
                            )
                        }
                    }
                }
            }
        }
    }

    KarsaDialog(
        open = confirm,
        onClose = { confirm = false },
        tone = DialogTone.Danger,
        title = "Keluar dari SiKarsa?",
        desc = "Kamu perlu masuk lagi dengan akun Google kampus untuk melanjutkan. Draf tulisan yang belum disimpan akan hilang.",
        confirmLabel = "Keluar",
        onConfirm = {
            confirm = false
            state.logout()
        },
    )
}

@Composable
private fun Divider() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
}

@Composable
private fun InfoRow(
    icon: List<String>,
    label: String,
    onClick: (() -> Unit)? = null,
    value: @Composable () -> Unit = {},
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Paper2),
            contentAlignment = Alignment.Center,
        ) {
            LucideIcon(icon, modifier = Modifier.size(20.dp), tint = Ink2)
        }
        Column(Modifier.weight(1f)) {
            Text(label, style = sansStyle(15, 600, 1.3f))
            value()
        }
        if (onClick != null) {
            LucideIcon(KarsaIcons.ChevronRight, modifier = Modifier.size(20.dp), tint = Muted)
        }
    }
}

@Composable
fun LegalScreen(doc: LegalDoc) {
    val state = LocalApp.current
    val data = if (doc == LegalDoc.Terms) LEGAL_TERMS else LEGAL_PRIVACY
    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = data.title,
            subtitle = data.updated,
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            data.sections.forEachIndexed { index, section ->
                Rise(delayMillis = index * 60) {
                    KarsaCard {
                        Column(Modifier.padding(20.dp)) {
                            Text(section.h, style = displayStyle(18, 700, 1.25f))
                            Spacer(Modifier.height(8.dp))
                            Text(section.p, style = sansStyle(15, 400, 1.75f, color = Ink2))
                        }
                    }
                }
            }
        }
    }
}
