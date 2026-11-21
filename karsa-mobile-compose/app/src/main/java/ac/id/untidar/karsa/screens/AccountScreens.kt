package ac.id.untidar.karsa.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.AuthorStatus
import ac.id.untidar.karsa.BuildConfig
import ac.id.untidar.karsa.LegalDoc
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Role
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.LEGAL_CONTACT
import ac.id.untidar.karsa.data.LEGAL_PRIVACY
import ac.id.untidar.karsa.data.LEGAL_TERMS
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
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
import ac.id.untidar.karsa.ui.KarsaIconButton
import ac.id.untidar.karsa.ui.KawungPattern
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.ui.rememberLoad

@Composable
fun AccountScreen() {
    val state = LocalApp.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val load = rememberLoad(delayMillis = 500)
    var confirm by remember { mutableStateOf(false) }

    fun refresh(silent: Boolean) {
        scope.launch {
            val failure = state.auth.refreshUser()
            if (state.capabilities.viewKarsaLib) state.lib.loadBootstrap()
            if (!silent && failure != null) state.notify(failure, ToastTone.Error)
        }
    }

    LaunchedEffect(state.tab) {
        if (state.tab == Tab.Akun) refresh(silent = true)
    }

    val capabilities = state.capabilities
    val scopes = buildList {
        if (capabilities.viewKarsaLib) add("Karsa Lib")
        if (capabilities.writeKarsaLib) add("Tulis artikel")
        if (capabilities.viewReport) add("Laporan")
        if (capabilities.viewLeaderboard) add("Peringkat")
        if (state.hasClass) add("Grup kelas")
    }
    val libLoading = state.lib.bootstrap == null && state.lib.bootstrapStatus != LoadStatus.Error

    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(
            title = "Akun",
            eyebrow = { EyebrowText("Profil") },
            right = {
                KarsaIconButton(
                    onClick = { refresh(silent = false) },
                    contentDescription = "Segarkan profil",
                ) {
                    if (state.auth.refreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Brand600,
                        )
                    } else {
                        LucideIcon(KarsaIcons.RefreshCw, modifier = Modifier.size(20.dp), tint = Ink2)
                    }
                }
            },
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 140.dp),
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
                                        name = state.displayName,
                                        size = 68.dp,
                                        tone = ac.id.untidar.karsa.ui.Tone.Brand,
                                        border = 4.dp,
                                        borderColor = Color.White.copy(alpha = 0.1f),
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(state.displayName, style = displayStyle(22, 700, 1.25f, color = Color.White))
                                        Text(
                                            state.email,
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
                                        Text(state.nim, style = displayStyle(18, 700, 1.2f, 0.02f, Color.White))
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
                                    Column {
                                        Text(
                                            if (state.role == Role.Pj) "PJ mata kuliah · pencatat poin" else "Mahasiswa",
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                        Text(
                                            if (scopes.isEmpty()) "Belum ada akses fitur tambahan" else scopes.joinToString(" · "),
                                            style = sansStyle(12, 400, 1.45f, color = Muted),
                                        )
                                    }
                                }
                                if (capabilities.viewKarsaLib) {
                                    Divider()
                                    InfoRow(KarsaIcons.Building2, "Fakultas Karsa Lib") {
                                        val faculty = state.lib.profile?.faculty?.takeIf { it.isNotBlank() }
                                            ?: state.user?.libProfile?.faculty?.takeIf { it.isNotBlank() }
                                        Text(
                                            faculty ?: if (libLoading) "Memuat…" else "Belum diatur",
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                    }
                                    Divider()
                                    InfoRow(KarsaIcons.GraduationCap, "Program studi") {
                                        Text(
                                            state.authorProfile.prodi.ifEmpty { if (libLoading) "Memuat…" else "Belum diatur" },
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                    }
                                    Divider()
                                    InfoRow(KarsaIcons.Users, "Kelas Karsa Lib") {
                                        Text(
                                            state.authorProfile.kelas.ifEmpty { if (libLoading) "Memuat…" else "Belum diatur" },
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                    }
                                    Divider()
                                    InfoRow(
                                        KarsaIcons.PenLine,
                                        "Akses menulis",
                                        onClick = {
                                            state.go(if (state.lib.canWrite) Route.MyPosts else Route.Author)
                                        },
                                    ) {
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
                                        onClick = {
                                            if (state.lib.canWrite && state.lib.uid.isNotBlank()) {
                                                state.go(Route.AuthorProfile(state.lib.uid))
                                            } else {
                                                state.go(Route.Author)
                                            }
                                        },
                                    ) {
                                        Text(
                                            if (state.lib.canWrite) "Tampil di artikel yang kamu terbitkan" else "Nama, fakultas, prodi, kelas",
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                    }
                                } else {
                                    Divider()
                                    InfoRow(KarsaIcons.BookOpen, "Karsa Lib") {
                                        Text(
                                            "Belum aktif untuk akun ini",
                                            style = sansStyle(13, 400, 1.4f, color = Muted),
                                        )
                                    }
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
                                InfoRow(KarsaIcons.FileText, "Syarat Penggunaan", onClick = { state.go(Route.Legal(LegalDoc.Terms)) }) {
                                    Text(
                                        "Versi ${LEGAL_TERMS.version} · ${LEGAL_TERMS.effective}",
                                        style = sansStyle(12, 400, 1.4f, color = Muted),
                                    )
                                }
                                Divider()
                                InfoRow(KarsaIcons.Lock, "Kebijakan Privasi", onClick = { state.go(Route.Legal(LegalDoc.Privacy)) }) {
                                    Text(
                                        "Versi ${LEGAL_PRIVACY.version} · ${LEGAL_PRIVACY.effective}",
                                        style = sansStyle(12, 400, 1.4f, color = Muted),
                                    )
                                }
                                Divider()
                                InfoRow(
                                    KarsaIcons.MessageCircle,
                                    "Bantuan & masukan",
                                    onClick = {
                                        if (!openEmail(context, "Bantuan SiKarsa Mobile")) {
                                            state.notify("Tidak ada aplikasi email yang bisa dibuka.", ToastTone.Error)
                                        }
                                    },
                                ) {
                                    Text(LEGAL_CONTACT, style = sansStyle(12, 400, 1.4f, color = Muted))
                                }
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
                                "SiKarsa Mobile ${BuildConfig.VERSION_NAME.substringBefore('+')}",
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
    val context = LocalContext.current
    val data = if (doc == LegalDoc.Terms) LEGAL_TERMS else LEGAL_PRIVACY
    val openWeb: () -> Unit = {
        if (!openLegalWeb(context, doc)) {
            state.notify("Halaman dokumen tidak dapat dibuka. Coba lagi saat terhubung ke internet.", ToastTone.Error)
        }
    }
    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = data.title,
            subtitle = "Versi ${data.version} · Berlaku sejak ${data.effective}",
            right = {
                KarsaIconButton(onClick = openWeb, contentDescription = "Buka versi web") {
                    LucideIcon(KarsaIcons.ExternalLink, modifier = Modifier.size(20.dp), tint = Ink2)
                }
            },
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Rise {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(Brand50)
                        .padding(20.dp),
                ) {
                    Text(
                        "Dokumen layanan Karsa",
                        style = sansStyle(11, 700, 1.4f, 0.08f, Brand600),
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(data.summary, style = sansStyle(15, 400, 1.7f, color = Ink2))
                }
            }
            data.sections.forEachIndexed { index, section ->
                Rise(delayMillis = (index + 1) * 60) {
                    KarsaCard {
                        Column(Modifier.padding(20.dp)) {
                            Text(section.h, style = displayStyle(18, 700, 1.25f))
                            section.p.forEach { paragraph ->
                                Spacer(Modifier.height(8.dp))
                                Text(paragraph, style = sansStyle(15, 400, 1.75f, color = Ink2))
                            }
                        }
                    }
                }
            }
            Rise(delayMillis = (data.sections.size + 1) * 60) {
                Column(Modifier.padding(horizontal = 4.dp, vertical = 4.dp)) {
                    Text(
                        "Ada pertanyaan tentang dokumen ini? Hubungi pengelola Karsa di $LEGAL_CONTACT.",
                        style = sansStyle(13, 400, 1.6f, color = Muted),
                    )
                    Spacer(Modifier.height(12.dp))
                    KarsaButton(
                        text = "Buka versi web",
                        onClick = openWeb,
                        variant = ButtonVariant.Soft,
                        leading = { LucideIcon(KarsaIcons.ExternalLink, modifier = Modifier.size(18.dp), tint = Brand600) },
                    )
                }
            }
        }
    }
}

private fun legalPath(doc: LegalDoc): String = when (doc) {
    LegalDoc.Terms -> "/syarat-penggunaan"
    LegalDoc.Privacy -> "/kebijakan-privasi"
}

private fun openLegalWeb(context: Context, doc: LegalDoc): Boolean {
    val url = BuildConfig.API_BASE_URL.trimEnd('/') + legalPath(doc)
    return try {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
        true
    } catch (_: Exception) {
        false
    }
}

private fun openEmail(context: Context, subject: String): Boolean {
    return try {
        context.startActivity(
            Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$LEGAL_CONTACT"))
                .putExtra(Intent.EXTRA_SUBJECT, subject)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
        true
    } catch (_: Exception) {
        false
    }
}
