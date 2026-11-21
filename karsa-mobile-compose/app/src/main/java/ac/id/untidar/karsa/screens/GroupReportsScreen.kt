package ac.id.untidar.karsa.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.fmtDate
import ac.id.untidar.karsa.groups.GroupReportDto
import ac.id.untidar.karsa.lib.parseTimestamp
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.TopBar

@Composable
fun GroupReportsScreen(id: String) {
    val state = LocalApp.current
    val scope = rememberCoroutineScope()
    var reports by remember { mutableStateOf<List<GroupReportDto>>(emptyList()) }
    var status by remember { mutableStateOf(LoadStatus.Loading) }
    var error by remember { mutableStateOf<String?>(null) }
    var resolving by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            status = LoadStatus.Loading
            try {
                reports = state.groups.reports(id)
                status = LoadStatus.Ready
                error = null
            } catch (failure: Exception) {
                error = friendlyError(failure)
                status = LoadStatus.Error
            }
        }
    }

    LaunchedEffect(id) { load() }

    fun resolve(report: GroupReportDto, action: String) {
        if (resolving != null) return
        resolving = report.id
        scope.launch {
            try {
                state.groups.resolveReport(id, report.id, action)
                reports = reports.filterNot { it.id == report.id }
                state.notify(
                    if (action == "HIDE") "Pesan disembunyikan." else "Laporan ditutup.",
                    ToastTone.Success,
                )
            } catch (failure: Exception) {
                state.notify(friendlyError(failure), ToastTone.Error)
            } finally {
                resolving = null
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Laporan grup",
            subtitle = "${reports.size} laporan terbuka",
        )
        when {
            status == LoadStatus.Loading -> Column(Modifier.padding(horizontal = 20.dp)) {
                ListSkeleton(count = 3, lines = 2)
            }
            status == LoadStatus.Error -> Column(Modifier.padding(20.dp)) {
                KarsaCard {
                    EmptyState(
                        title = "Laporan belum termuat",
                        desc = error ?: "Periksa koneksi lalu coba lagi.",
                        icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = { KarsaButton(text = "Coba lagi", onClick = { load() }, variant = ButtonVariant.Soft) },
                    )
                }
            }
            reports.isEmpty() -> Column(Modifier.padding(20.dp)) {
                KarsaCard {
                    EmptyState(
                        title = "Tidak ada laporan terbuka",
                        desc = "Laporan anggota yang dapat kamu tangani akan muncul di sini.",
                        icon = { LucideIcon(KarsaIcons.ShieldCheck, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                }
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(reports, key = { it.id }) { report ->
                    GroupReportCard(
                        report = report,
                        busy = resolving != null,
                        onDismiss = { resolve(report, "DISMISS") },
                        onHide = { resolve(report, "HIDE") },
                    )
                }
            }
        }
    }
}

@Composable
private fun GroupReportCard(
    report: GroupReportDto,
    busy: Boolean,
    onDismiss: () -> Unit,
    onHide: () -> Unit,
) {
    KarsaCard {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${reasonLabel(report.reason)} · ${report.message?.author?.name ?: "Tanpa nama"}",
                    modifier = Modifier.weight(1f),
                    style = sansStyle(14, 700, 1.3f, color = Ink),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    fmtDate(parseTimestamp(report.createdAt)),
                    style = sansStyle(11, 500, 1.3f, color = Muted),
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                report.message?.body ?: "Pesan tidak lagi tersedia.",
                style = sansStyle(14, 400, 1.5f, color = Ink2),
                maxLines = 4,
                overflow = TextOverflow.Ellipsis,
            )
            if (!report.details.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Catatan: ${report.details}",
                    style = sansStyle(12, 400, 1.45f, color = Muted),
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "Dilaporkan ${report.reporter?.name ?: "Tanpa nama"}",
                style = sansStyle(11, 400, 1.3f, color = Muted),
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                KarsaButton(
                    text = "Tutup laporan",
                    onClick = onDismiss,
                    variant = ButtonVariant.Ghost,
                    size = ButtonSize.Sm,
                    enabled = !busy,
                )
                KarsaButton(
                    text = "Sembunyikan",
                    onClick = onHide,
                    variant = ButtonVariant.DangerSoft,
                    size = ButtonSize.Sm,
                    enabled = !busy,
                    loading = busy,
                    leading = {
                        LucideIcon(
                            KarsaIcons.EyeOff,
                            modifier = Modifier.size(15.dp),
                            tint = Danger500,
                        )
                    },
                )
            }
        }
    }
}

private fun reasonLabel(reason: String): String = when (reason) {
    "SPAM" -> "Spam"
    "HARASSMENT" -> "Pelecehan atau perundungan"
    "INAPPROPRIATE" -> "Konten tidak pantas"
    "MISINFORMATION" -> "Informasi menyesatkan"
    else -> "Lainnya"
}
