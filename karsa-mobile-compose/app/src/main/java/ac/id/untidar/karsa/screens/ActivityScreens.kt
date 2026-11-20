package ac.id.untidar.karsa.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Tab
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.data.COURSES
import ac.id.untidar.karsa.data.ME
import ac.id.untidar.karsa.data.MY_ENTRIES
import ac.id.untidar.karsa.data.MyEntry
import ac.id.untidar.karsa.data.PointEntry
import ac.id.untidar.karsa.data.RANK_COURSES
import ac.id.untidar.karsa.data.RankRow
import ac.id.untidar.karsa.data.categoryLabel
import ac.id.untidar.karsa.data.courseById
import ac.id.untidar.karsa.data.dayKey
import ac.id.untidar.karsa.data.dayLabel
import ac.id.untidar.karsa.data.fmtDate
import ac.id.untidar.karsa.data.fmtDayShort
import ac.id.untidar.karsa.data.fmtTime
import ac.id.untidar.karsa.data.maskNim
import ac.id.untidar.karsa.data.myCourses
import ac.id.untidar.karsa.data.rankingFor
import ac.id.untidar.karsa.data.studentById
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.points.PointHistoryDto
import ac.id.untidar.karsa.points.ReportPointDto
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Butter100
import ac.id.untidar.karsa.theme.Butter400
import ac.id.untidar.karsa.theme.Butter700
import ac.id.untidar.karsa.theme.Danger100
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Leaf500
import ac.id.untidar.karsa.theme.Leaf600
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.Paper3
import ac.id.untidar.karsa.ui.brandShadow
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.ui.pressScale
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.Chip
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaIconButton
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.KawungPattern
import ac.id.untidar.karsa.ui.IconButtonVariant
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.PageHeader
import ac.id.untidar.karsa.ui.PointBadge
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.Segmented
import ac.id.untidar.karsa.ui.SegmentedOption
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import ac.id.untidar.karsa.ui.popShadow
import ac.id.untidar.karsa.ui.rememberLoad

private fun myTotal(list: List<MyEntry> = MY_ENTRIES): Int = list.sumOf { it.points }

@Composable
fun ActivityHub() {
    val state = LocalApp.current
    val pts = state.points
    val history = pts.history
    val week = history.filter { System.currentTimeMillis() - it.ts < 7L * 86_400_000L }
    val entries = week.size
    val students = week.map { it.studentName }.distinct().size
    val weekPoints = week.sumOf { it.poin }
    val rank = pts.currentRank
    val loadStatus = if (pts.historyStatus == LoadStatus.Loading && history.isEmpty()) {
        LoadStatus.Loading
    } else {
        LoadStatus.Ready
    }

    LaunchedEffect(Unit) {
        pts.loadHistory()
        pts.loadReport()
        pts.loadLeaderboardOptions()
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(
            title = "Ruang PJ",
            eyebrow = { EyebrowText("Aktivitas") },
            subtitle = "Pantau poin yang kamu catat untuk kelas.",
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Gate(
                status = loadStatus,
                onRetry = {
                    pts.loadHistory()
                    pts.loadReport()
                    pts.loadLeaderboardOptions()
                },
                skeleton = {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Skeleton(Modifier.fillMaxWidth().height(208.dp), RoundedCornerShape(28.dp))
                        ListSkeleton(count = 1, lines = 2)
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
                            .padding(20.dp),
                    ) {
                        Box(Modifier.fillMaxWidth()) {
                            KawungPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.14f)
                            Column {
                                Text(
                                    "7 HARI TERAKHIR",
                                    style = sansStyle(11, 700, 1.4f, 0.16f, Brand300),
                                )
                                Spacer(Modifier.height(12.dp))
                                Row(Modifier.fillMaxWidth()) {
                                    StatColumn(entries, "Entri")
                                    StatColumn(students, "Mahasiswa")
                                    StatColumn(weekPoints, "Total poin")
                                }
                                Spacer(Modifier.height(20.dp))
                                KarsaButton(
                                    text = "Input poin mahasiswa",
                                    onClick = { state.openTab(Tab.Input) },
                                    size = ButtonSize.Lg,
                                    full = true,
                                    leading = { LucideIcon(KarsaIcons.NotebookPen, modifier = Modifier.size(20.dp), tint = Color.White) },
                                )
                            }
                        }
                    }
                }

                Rise(delayMillis = 60) {
                    HistoryShortcutCard(history)
                }

                if (state.capabilities.viewReport || state.capabilities.viewLeaderboard) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (state.capabilities.viewReport) {
                            Box(Modifier.weight(1f)) {
                                ReportShortcutCard(total = pts.report?.totalPoints ?: 0)
                            }
                        }
                        if (state.capabilities.viewLeaderboard) {
                            Box(Modifier.weight(1f)) {
                                RankingShortcutCard(rank)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.StatColumn(value: Int, label: String) {
    Column(Modifier.weight(1f)) {
        Text(
            "$value",
            style = displayStyle(34, 800, 1f, color = Color.White),
        )
        Text(label, style = sansStyle(12, 400, 1.4f, color = Color.White.copy(alpha = 0.55f)))
    }
}

@Composable
private fun HistoryShortcutCard(list: List<PointHistoryDto>) {
    val state = LocalApp.current
    val interaction = remember { MutableInteractionSource() }
    KarsaCard(
        modifier = Modifier
            .fillMaxWidth()
            .pressScale(interaction, 0.99f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
            ) { state.go(ac.id.untidar.karsa.Route.History) },
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Brand100),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(KarsaIcons.History, modifier = Modifier.size(24.dp), tint = Brand600)
                }
                Column(Modifier.weight(1f)) {
                    Text("Riwayat Poin", style = displayStyle(20, 700, 1.25f))
                    Text("${list.size} entri tercatat", style = sansStyle(13, 400, 1.4f, color = Muted))
                }
                LucideIcon(KarsaIcons.ChevronRight, modifier = Modifier.size(20.dp), tint = Muted)
            }
            Spacer(Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                list.take(2).forEach { entry ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Paper2)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "+${entry.poin}",
                                style = displayStyle(14, 800, 1f, color = Brand700),
                            )
                        }
                        Text(
                            entry.studentName,
                            modifier = Modifier.weight(1f),
                            style = sansStyle(13, 600, 1.4f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(fmtTime(entry.ts), style = sansStyle(12, 400, 1.4f, color = Muted))
                    }
                }
                if (list.isEmpty()) {
                    Text(
                        "Belum ada entri. Mulai catat kontribusi pertama.",
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Paper2)
                            .padding(vertical = 16.dp),
                        style = sansStyle(13, 400, 1.4f, color = Muted),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun ReportShortcutCard(total: Int) {
    val state = LocalApp.current
    val interaction = remember { MutableInteractionSource() }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(156.dp)
            .brandShadow(RoundedCornerShape(28.dp))
            .clip(RoundedCornerShape(28.dp))
            .background(Brand500)
            .pressScale(interaction, 0.98f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
            ) { state.go(ac.id.untidar.karsa.Route.Report) }
            .padding(20.dp),
    ) {
        Box(Modifier.fillMaxSize()) {
            KawungPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.16f)
            Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    LucideIcon(KarsaIcons.FileBarChart, modifier = Modifier.size(20.dp), tint = Color.White)
                }
                Column {
                    Text("$total", style = displayStyle(40, 800, 1f, color = Color.White))
                    Text("Laporan Saya", style = sansStyle(14, 700, 1.3f, color = Color.White))
                }
            }
        }
    }
}

@Composable
private fun RankingShortcutCard(rank: Int) {
    val state = LocalApp.current
    val interaction = remember { MutableInteractionSource() }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(156.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(Butter100)
            .pressScale(interaction, 0.98f)
            .clickable(
                interactionSource = interaction,
                indication = LocalIndication.current,
            ) { state.go(ac.id.untidar.karsa.Route.Ranking) }
            .padding(20.dp),
    ) {
        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Butter400.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center,
            ) {
                LucideIcon(KarsaIcons.Trophy, modifier = Modifier.size(20.dp), tint = Butter700)
            }
            Column {
                Text("#$rank", style = displayStyle(40, 800, 1f, color = Butter700))
                Text("Peringkat Kelas", style = sansStyle(14, 700, 1.3f, color = Ink))
            }
        }
    }
}

@Composable
fun HistoryScreen() {
    val state = LocalApp.current
    val pts = state.points
    val scope = rememberCoroutineScope()
    var q by remember { mutableStateOf("") }
    var course by remember { mutableStateOf<String?>(null) }
    var menuFor by remember { mutableStateOf<PointHistoryDto?>(null) }
    var confirm by remember { mutableStateOf<PointHistoryDto?>(null) }

    LaunchedEffect(Unit) { pts.loadHistory() }

    val base = pts.history
    val courseNames = base.map { it.courseName }.distinct().sorted()
    val filtered = base.filter { entry ->
        if (course != null && entry.courseName != course) return@filter false
        val query = q.trim().lowercase()
        if (query.isEmpty()) return@filter true
        if (query.all { it.isDigit() }) {
            entry.studentNim?.contains(query) == true
        } else {
            entry.studentName.lowercase().contains(query) ||
                entry.categoryName.lowercase().contains(query)
        }
    }.sortedByDescending { it.ts }
    val groups = linkedMapOf<Long, MutableList<PointHistoryDto>>()
    filtered.forEach { entry ->
        groups.getOrPut(dayKey(entry.ts)) { mutableListOf() }.add(entry)
    }

    fun delete(target: PointHistoryDto) {
        confirm = null
        scope.launch {
            try {
                pts.deletePoint(target.id)
                state.notify("Entri dihapus dan tercatat di audit log", ToastTone.Neutral)
            } catch (failure: Exception) {
                state.notify(friendlyError(failure), ToastTone.Error)
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Riwayat poin",
            subtitle = if (pts.historyStatus == LoadStatus.Ready) "${filtered.size} entri" else "Memuat…",
        )
        Column(
            modifier = Modifier.padding(horizontal = 20.dp).padding(top = 4.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SearchField(value = q, onChange = { q = it }, placeholder = "Nama, akhir NIM, atau kategori")
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Chip("Semua matkul", selected = course == null, onClick = { course = null })
                courseNames.forEach { name ->
                    Chip(name, selected = course == name, onClick = { course = name })
                }
            }
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
        ) {
            when {
                pts.historyStatus == LoadStatus.Loading && base.isEmpty() -> ListSkeleton(count = 4, lines = 1)
                pts.historyStatus == LoadStatus.Error && base.isEmpty() -> KarsaCard {
                    EmptyState(
                        title = "Riwayat belum termuat",
                        desc = pts.historyError ?: "Periksa koneksi lalu coba lagi.",
                        icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                        action = {
                            KarsaButton("Coba lagi", onClick = { pts.loadHistory() }, variant = ButtonVariant.Soft)
                        },
                    )
                }
                groups.isEmpty() -> KarsaCard {
                    if (base.isEmpty()) {
                        EmptyState(
                            title = "Belum ada poin tercatat",
                            desc = "Entri yang kamu input akan muncul di sini, lengkap dengan jam dan catatannya.",
                            icon = { LucideIcon(KarsaIcons.History, modifier = Modifier.size(36.dp), tint = Brand600) },
                            action = { KarsaButton("Input poin pertama", onClick = { state.openTab(Tab.Input) }) },
                        )
                    } else {
                        EmptyState(
                            title = "Tidak ada hasil",
                            desc = "Coba kata kunci lain, atau ganti filter mata kuliah.",
                            icon = { LucideIcon(KarsaIcons.ScanSearch, modifier = Modifier.size(36.dp), tint = Brand600) },
                            action = {
                                KarsaButton(
                                    "Reset filter",
                                    onClick = {
                                        q = ""
                                        course = null
                                    },
                                    variant = ButtonVariant.Soft,
                                )
                            },
                        )
                    }
                }
                else -> Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    groups.forEach { (key, entries) ->
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(dayLabel(key), style = sansStyle(13, 700, 1.4f))
                                Text(fmtDayShort(key), style = sansStyle(12, 400, 1.4f, color = Muted))
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                entries.forEach { entry ->
                                    Rise { HistoryEntryCard(entry = entry, onMenu = { menuFor = entry }) }
                                }
                            }
                        }
                    }
                }
            }
            if (pts.historyStatus == LoadStatus.Ready) {
                Spacer(Modifier.height(24.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Butter100.copy(alpha = 0.7f))
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    LucideIcon(KarsaIcons.ShieldAlert, modifier = Modifier.size(16.dp).padding(top = 2.dp), tint = Butter700)
                    Text(
                        "Setiap penghapusan tercatat di audit log dan dapat ditinjau dosen.",
                        style = sansStyle(13, 400, 1.625f, color = Butter700),
                    )
                }
            }
        }
    }

    val menuEntry = menuFor
    KarsaSheet(open = menuEntry != null, onClose = { menuFor = null }, title = "Opsi entri") {
        if (menuEntry != null) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .border(1.dp, Line, RoundedCornerShape(16.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PointBadge(menuEntry.poin)
                    Column(Modifier.weight(1f)) {
                        Text(menuEntry.studentName, style = sansStyle(14, 700, 1.3f))
                        Text(
                            "${menuEntry.categoryName} · ${menuEntry.courseName}",
                            style = sansStyle(12, 400, 1.4f, color = Muted),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Danger100)
                        .clickable {
                            confirm = menuEntry
                            menuFor = null
                        }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(KarsaIcons.Trash2, modifier = Modifier.size(20.dp), tint = Danger500)
                    Column(Modifier.weight(1f)) {
                        Text("Hapus entri", style = sansStyle(15, 600, 1.3f, color = Danger500))
                        Text(
                            "Tercatat di audit log",
                            style = sansStyle(12, 400, 1.4f, color = Danger500.copy(alpha = 0.8f)),
                        )
                    }
                }
            }
        }
    }

    KarsaDialog(
        open = confirm != null,
        onClose = { confirm = null },
        tone = DialogTone.Danger,
        title = "Hapus entri poin ini?",
        desc = confirm?.let {
            "+${it.poin} untuk ${it.studentName} akan dihapus. Tindakan ini tercatat di audit log dan tidak bisa dibatalkan."
        },
        confirmLabel = "Hapus",
        onConfirm = { confirm?.let(::delete) },
    )
}

@Composable
private fun HistoryEntryCard(entry: PointHistoryDto, onMenu: () -> Unit) {
    KarsaCard {
        Column(Modifier.padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                PointBadge(entry.poin)
                Column(Modifier.weight(1f)) {
                    Text(
                        entry.studentName,
                        style = sansStyle(15, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        entry.studentNim?.takeIf { it.isNotBlank() } ?: "NIM belum ada",
                        style = sansStyle(12, 400, 1.4f, color = Muted),
                    )
                }
                KarsaIconButton(
                    onClick = onMenu,
                    variant = IconButtonVariant.Ghost,
                    contentDescription = "Menu entri",
                ) {
                    LucideIcon(KarsaIcons.EllipsisVertical, modifier = Modifier.size(20.dp), tint = Muted)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "${entry.categoryName} · ${entry.courseName}",
                style = sansStyle(13, 600, 1.4f, color = Ink2),
            )
            Text(
                "${entry.className} · ${fmtTime(entry.ts)}",
                style = sansStyle(12, 400, 1.4f, color = Muted),
            )
            if (entry.catatan != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "“${entry.catatan}”",
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Paper2)
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    style = sansStyle(13, 400, 1.625f, color = Ink2),
                )
            }
        }
    }
}

@Composable
private fun ReportView() {
    val pts = LocalApp.current.points
    var openId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (pts.report == null) pts.loadReport()
    }

    val report = pts.report
    val courses = report?.courses.orEmpty().sortedByDescending { it.totalPoints }
    val maxSum = maxOf(1, courses.maxOfOrNull { it.totalPoints } ?: 1)
    val expanded = openId ?: courses.firstOrNull()?.id
    val totalEntries = courses.sumOf { it.history.size }
    val subtitle = listOfNotNull(
        report?.kelas?.name?.takeIf { it.isNotBlank() },
        report?.prodi?.name?.takeIf { it.isNotBlank() },
        report?.semester?.name?.takeIf { it.isNotBlank() }?.let { "Semester $it" },
    ).joinToString(" · ").ifBlank { "${ME.kelas} · ${ME.prodi}" }

    Column {
        when {
            pts.reportStatus == LoadStatus.Loading && report == null -> Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Skeleton(Modifier.fillMaxWidth().height(208.dp), RoundedCornerShape(32.dp))
                ListSkeleton(count = 2, lines = 1)
            }
            pts.reportStatus == LoadStatus.Error && report == null -> KarsaCard {
                EmptyState(
                    title = "Laporan belum termuat",
                    desc = pts.reportError ?: "Periksa koneksi lalu coba lagi.",
                    icon = { LucideIcon(KarsaIcons.TriangleAlert, modifier = Modifier.size(36.dp), tint = Brand600) },
                    action = { KarsaButton("Coba lagi", onClick = { pts.loadReport() }, variant = ButtonVariant.Soft) },
                )
            }
            else -> {
                Rise {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .brandShadow(RoundedCornerShape(32.dp))
                            .clip(RoundedCornerShape(32.dp))
                            .background(Brand500)
                            .padding(24.dp),
                    ) {
                        Box(Modifier.fillMaxWidth()) {
                            KawungPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.16f)
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .size(176.dp)
                                    .background(
                                        androidx.compose.ui.graphics.Brush.radialGradient(
                                            listOf(Brand300.copy(alpha = 0.5f), Color.Transparent),
                                        ),
                                        CircleShape,
                                    ),
                            )
                            Column {
                                Text("Total poin keaktifan", style = sansStyle(14, 600, 1.4f, color = Color.White.copy(alpha = 0.85f)))
                                Text(
                                    "${report?.totalPoints ?: 0}",
                                    style = displayStyle(56, 800, 1f, -0.02f, Color.White),
                                )
                                Spacer(Modifier.height(16.dp))
                                Text(
                                    subtitle,
                                    style = sansStyle(13, 600, 1.4f, color = Color.White.copy(alpha = 0.9f)),
                                )
                                Spacer(Modifier.height(16.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Pill("${courses.size} matkul")
                                    Pill("$totalEntries kontribusi")
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(28.dp))
                Text("Per mata kuliah", modifier = Modifier.padding(horizontal = 4.dp), style = displayStyle(18, 700))
                Spacer(Modifier.height(12.dp))

                if (courses.isEmpty()) {
                    KarsaCard {
                        EmptyState(
                            title = "Belum ada laporan",
                            desc = "Kelas atau semester aktif angkatanmu belum tersedia.",
                            icon = { LucideIcon(KarsaIcons.FileBarChart, modifier = Modifier.size(36.dp), tint = Brand600) },
                        )
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        courses.forEach { course ->
                            val isOpen = expanded == course.id
                            KarsaCard(Modifier.fillMaxWidth()) {
                                Column {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { openId = if (isOpen) "" else course.id }
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Avatar(name = course.matkul.name, size = 44.dp, square = true)
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                course.matkul.name,
                                                style = sansStyle(15, 700, 1.25f),
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                            val meta = listOfNotNull(
                                                course.matkul.code.takeIf { it.isNotBlank() },
                                                course.pj?.name?.let { "PJ $it" },
                                            ).joinToString(" · ")
                                            if (meta.isNotBlank()) {
                                                Text(meta, style = sansStyle(11, 500, 1.3f, color = Muted))
                                            }
                                            Spacer(Modifier.height(8.dp))
                                            Box(
                                                Modifier
                                                    .fillMaxWidth()
                                                    .height(6.dp)
                                                    .clip(CircleShape)
                                                    .background(Paper2),
                                            ) {
                                                Box(
                                                    Modifier
                                                        .fillMaxWidth((course.totalPoints.toFloat() / maxSum).coerceIn(0.02f, 1f))
                                                        .height(6.dp)
                                                        .clip(CircleShape)
                                                        .background(Brand500),
                                                )
                                            }
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("${course.totalPoints}", style = displayStyle(24, 800, 1f))
                                            Text("${course.history.size} entri", style = sansStyle(11, 400, 1.3f, color = Muted))
                                        }
                                        val rotation by animateFloatAsState(if (isOpen) 180f else 0f, tween(200), label = "chevron")
                                        LucideIcon(
                                            KarsaIcons.ChevronDown,
                                            modifier = Modifier.size(20.dp).graphicsLayer { rotationZ = rotation },
                                            tint = Muted,
                                        )
                                    }
                                    if (isOpen) {
                                        Column(Modifier.fillMaxWidth().background(Paper.copy(alpha = 0.6f))) {
                                            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                                            course.history.forEach { entry -> ReportEntryRow(entry) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportEntryRow(entry: ReportPointDto) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        PointBadge(entry.poin)
        Column(Modifier.weight(1f)) {
            Text(entry.categoryName, style = sansStyle(14, 600, 1.375f))
            Text(
                "${fmtDate(entry.ts)} · ${fmtTime(entry.ts)}",
                style = sansStyle(12, 400, 1.4f, color = Muted),
            )
            if (entry.catatan != null) {
                Text(
                    "“${entry.catatan}”",
                    modifier = Modifier.padding(top = 6.dp),
                    style = sansStyle(13, 400, 1.625f, color = Ink2),
                )
            }
        }
    }
}

@Composable
private fun Pill(text: String) {
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.2f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(text, style = sansStyle(12, 700, 1.3f, color = Color.White))
    }
}

@Composable
fun RankingView(dock: Boolean = false) {
    val pts = LocalApp.current.points
    var flash by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { pts.loadLeaderboardOptions() }

    val options = pts.leaderboardOptions
    val selected = pts.leaderboardCourse
    val apiRows = pts.leaderboardRows
    val rows = apiRows.map { row ->
        RankRow(
            id = row.nim ?: row.nama,
            name = row.nama,
            nim = row.nim.orEmpty(),
            total = row.totalPoin,
            me = row.isCurrentUser,
        )
    }
    val myIdx = rows.indexOfFirst { it.me }
    val myRank = apiRows.firstOrNull { it.isCurrentUser }?.rank ?: (myIdx + 1)
    val top3 = rows.take(3)
    val rest = rows.drop(3)

    fun findMe() {
        scope.launch {
            flash = true
            delay(1800)
            flash = false
        }
    }

    Column {
        if (options.isNotEmpty()) {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                options.forEach { option ->
                    Chip(
                        option.name,
                        selected = selected == option.id,
                        onClick = { pts.selectLeaderboard(option.id) },
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
        }

        Gate(
            status = pts.leaderboardStatus,
            onRetry = {
                val current = selected
                if (current != null) pts.loadLeaderboard(current) else pts.loadLeaderboardOptions()
            },
            skeleton = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Skeleton(Modifier.fillMaxWidth().height(256.dp), RoundedCornerShape(32.dp))
                    ListSkeleton(count = 2, lines = 1)
                }
            },
        ) {
            when {
                options.isEmpty() -> KarsaCard {
                    EmptyState(
                        title = "Belum ada mata kuliah",
                        desc = "Peringkat akan tersedia setelah mata kuliah ditambahkan ke kelasmu.",
                        icon = { LucideIcon(KarsaIcons.Users, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                }
                rows.isEmpty() -> KarsaCard {
                    EmptyState(
                        title = "Peringkat belum tersedia",
                        desc = "Belum ada data partisipasi untuk mata kuliah ini.",
                        icon = { LucideIcon(KarsaIcons.Users, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                }
                else -> {
                    Rise {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .cardShadow(RoundedCornerShape(32.dp))
                                .clip(RoundedCornerShape(32.dp))
                                .background(Color.White)
                                .padding(start = 16.dp, end = 16.dp, top = 32.dp),
                        ) {
                            Box(Modifier.fillMaxWidth()) {
                                KawungPattern(Modifier.matchParentSize(), color = Ink, alpha = 0.07f)
                                Row(Modifier.fillMaxWidth().height(230.dp), verticalAlignment = Alignment.Bottom) {
                                    PodiumCell(row = top3.getOrNull(1), rank = 2, height = 96.dp, barColor = Espresso, barText = Color.White, avatarSize = 52.dp, flash = flash)
                                    PodiumCell(row = top3.getOrNull(0), rank = 1, height = 128.dp, barColor = Brand500, barText = Color.White, avatarSize = 62.dp, flash = flash)
                                    PodiumCell(row = top3.getOrNull(2), rank = 3, height = 72.dp, barColor = Butter100, barText = Butter700, avatarSize = 52.dp, flash = flash)
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(28.dp))
                    Text("Peringkat lainnya", modifier = Modifier.padding(horizontal = 4.dp), style = displayStyle(18, 700))
                    Spacer(Modifier.height(12.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        rest.forEachIndexed { index, row ->
                            val scale by animateFloatAsState(
                                if (row.me && flash) 1.03f else 1f,
                                tween(250),
                                label = "flashScale",
                            )
                            val shape = RoundedCornerShape(22.dp)
                            val rankNumber = apiRows.getOrNull(index + 3)?.rank ?: (index + 4)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .graphicsLayer { scaleX = scale; scaleY = scale }
                                    .clip(shape)
                                    .background(if (row.me && flash) Brand50 else Color.White)
                                    .border(
                                        if (row.me) 2.dp else 1.dp,
                                        if (row.me) Brand500 else Ink.copy(alpha = 0.05f),
                                        shape,
                                    )
                                    .padding(start = 12.dp, end = 16.dp, top = 12.dp, bottom = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "$rankNumber",
                                    modifier = Modifier.width(32.dp),
                                    style = displayStyle(18, 800, 1f, color = Muted),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                                Avatar(name = row.name, size = 40.dp)
                                Column(Modifier.weight(1f)) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            row.name,
                                            style = sansStyle(14, 700, 1.3f),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f, fill = false),
                                        )
                                        if (row.me) Badge("KAMU", tone = BadgeTone.Solid)
                                    }
                                    Text(
                                        (if (row.me) row.nim else maskNim(row.nim)).ifBlank { "NIM belum ada" },
                                        style = sansStyle(12, 400, 1.4f, color = Muted),
                                    )
                                }
                                Text("${row.total}", style = displayStyle(20, 800, 1f))
                            }
                        }
                    }

                    Spacer(Modifier.height(20.dp))
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        KarsaButton(
                            text = "Lihat posisiku · #$myRank",
                            onClick = ::findMe,
                            variant = ButtonVariant.Dark,
                            size = ButtonSize.Lg,
                            leading = { LucideIcon(KarsaIcons.ScanSearch, modifier = Modifier.size(20.dp), tint = Color.White) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.PodiumCell(
    row: RankRow?,
    rank: Int,
    height: androidx.compose.ui.unit.Dp,
    barColor: Color,
    barText: Color,
    avatarSize: androidx.compose.ui.unit.Dp,
    flash: Boolean,
) {
    if (row == null) {
        Spacer(Modifier.weight(1f))
        return
    }
    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
        Box {
            if (rank == 1) {
                LucideIcon(
                    KarsaIcons.Crown,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(bottom = 0.dp)
                        .size(24.dp)
                        .graphicsLayer { translationY = -24.dp.toPx() },
                    tint = Butter400,
                )
            }
            Avatar(
                name = row.name,
                size = avatarSize,
                border = if (row.me) 3.dp else null,
                borderColor = Brand500,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            if (row.me) "Kamu" else row.name.split(" ").first(),
            modifier = Modifier.fillMaxWidth(),
            style = sansStyle(13, 700, 1.3f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Text("${row.total} poin", style = sansStyle(12, 600, 1.3f, color = Muted))
        Spacer(Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .background(barColor),
            contentAlignment = Alignment.Center,
        ) {
            Text("$rank", style = displayStyle(36, 800, 1f, color = barText))
        }
    }
}

@Composable
fun ReportScreen() {
    val state = LocalApp.current
    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Laporan saya",
            subtitle = "Poin keaktifan semester ini",
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 24.dp),
        ) {
            ReportView()
        }
    }
}

@Composable
fun RankingScreen() {
    val state = LocalApp.current
    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Partisipasi teratas",
            subtitle = "${ME.kelas} · ${ME.prodi}",
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 24.dp),
        ) {
            RankingView()
        }
    }
}

private enum class PoinkuTab { Laporan, Peringkat }

@Composable
fun PoinkuScreen() {
    val state = LocalApp.current
    val showReport = state.capabilities.viewReport
    val showLeaderboard = state.capabilities.viewLeaderboard
    var seg by remember { mutableStateOf(if (showReport) PoinkuTab.Laporan else PoinkuTab.Peringkat) }
    Column(Modifier.fillMaxSize().background(Paper)) {
        PageHeader(
            title = if (seg == PoinkuTab.Laporan) "Poinku" else "Partisipasi teratas",
            eyebrow = { EyebrowText("Poin keaktifan") },
            subtitle = if (seg == PoinkuTab.Laporan) "Rekap kontribusimu di kelas." else "${ME.kelas} · ${ME.prodi}",
        )
        if (showReport && showLeaderboard) {
            Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
                Segmented(
                    options = listOf(
                        SegmentedOption(PoinkuTab.Laporan, "Laporan saya") {
                            LucideIcon(KarsaIcons.FileBarChart, modifier = Modifier.size(16.dp), tint = Ink2)
                        },
                        SegmentedOption(PoinkuTab.Peringkat, "Peringkat") {
                            LucideIcon(KarsaIcons.Trophy, modifier = Modifier.size(16.dp), tint = Ink2)
                        },
                    ),
                    value = seg,
                    onChange = { seg = it },
                )
            }
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 140.dp),
        ) {
            when {
                seg == PoinkuTab.Laporan && showReport -> ReportView()
                seg == PoinkuTab.Peringkat && showLeaderboard -> RankingView(dock = true)
                showReport -> ReportView()
                else -> RankingView(dock = true)
            }
        }
    }
}
