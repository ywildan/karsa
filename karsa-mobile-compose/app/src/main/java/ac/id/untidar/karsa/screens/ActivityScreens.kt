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
    val load = rememberLoad()
    val list = state.entries
    val students = list.map { it.studentId }.distinct().size
    val weekPoints = list
        .filter { System.currentTimeMillis() - it.ts < 7L * 86_400_000L }
        .sumOf { it.points }
    val rank = rankingFor("all").indexOfFirst { it.me } + 1

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
                status = load.status,
                onRetry = load.retry,
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
                                    StatColumn(list.size, "Entri")
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
                    HistoryShortcutCard(list)
                }

                if (state.capabilities.viewReport || state.capabilities.viewLeaderboard) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (state.capabilities.viewReport) {
                            Box(Modifier.weight(1f)) {
                                ReportShortcutCard(total = myTotal())
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
private fun HistoryShortcutCard(list: List<PointEntry>) {
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
                                "+${entry.points}",
                                style = displayStyle(14, 800, 1f, color = Brand700),
                            )
                        }
                        Text(
                            studentById(entry.studentId).name,
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
    val load = rememberLoad(delayMillis = 550)
    var q by remember { mutableStateOf("") }
    var course by remember { mutableStateOf("all") }
    var menuFor by remember { mutableStateOf<PointEntry?>(null) }
    var confirm by remember { mutableStateOf<PointEntry?>(null) }

    val courses = myCourses(state.role)
    val base = state.entries
    val filtered = base.filter { entry ->
        if (course != "all" && entry.courseId != course) return@filter false
        val query = q.trim().lowercase()
        if (query.isEmpty()) return@filter true
        val student = studentById(entry.studentId)
        if (query.all { it.isDigit() }) {
            student.nim.endsWith(query) || student.nim.contains(query)
        } else {
            student.name.lowercase().contains(query) || categoryLabel(entry.categoryId).lowercase().contains(query)
        }
    }
    val groups = linkedMapOf<Long, MutableList<PointEntry>>()
    filtered.sortedByDescending { it.ts }.forEach { entry ->
        groups.getOrPut(dayKey(entry.ts)) { mutableListOf() }.add(entry)
    }

    fun doDelete() {
        val target = confirm ?: return
        state.deleteEntry(target.id)
        state.notify("Entri dihapus dan tercatat di audit log", ToastTone.Neutral)
        confirm = null
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Riwayat poin",
            subtitle = if (load.status == ac.id.untidar.karsa.ui.LoadStatus.Ready) "${filtered.size} entri" else "Memuat…",
        )
        Column(Modifier.padding(horizontal = 20.dp).padding(top = 4.dp, bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SearchField(value = q, onChange = { q = it }, placeholder = "Nama, akhir NIM, atau kategori")
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Chip("Semua matkul", selected = course == "all", onClick = { course = "all" })
                courses.forEach { item ->
                    Chip(item.name, selected = course == item.id, onClick = { course = item.id })
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
            Gate(status = load.status, onRetry = load.retry, skeleton = { ListSkeleton(count = 4, lines = 1) }) {
                if (groups.isEmpty()) {
                    KarsaCard {
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
                                            course = "all"
                                        },
                                        variant = ButtonVariant.Soft,
                                    )
                                },
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
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
                if (load.status == ac.id.untidar.karsa.ui.LoadStatus.Ready) {
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
                            buildString {
                                append("Setiap penghapusan tercatat di audit log dan dapat ditinjau dosen.")
                                if (state.audit.isNotEmpty()) append(" ${state.audit.size} penghapusan sesi ini.")
                            },
                            style = sansStyle(13, 400, 1.625f, color = Butter700),
                        )
                    }
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
                    PointBadge(menuEntry.points)
                    Column(Modifier.weight(1f)) {
                        Text(studentById(menuEntry.studentId).name, style = sansStyle(14, 700, 1.3f))
                        Text(
                            "${categoryLabel(menuEntry.categoryId)} · ${courseById(menuEntry.courseId).name}",
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
            "+${it.points} untuk ${studentById(it.studentId).name} akan dihapus. Tindakan ini tercatat di audit log dan tidak bisa dibatalkan."
        },
        confirmLabel = "Hapus",
        onConfirm = ::doDelete,
    )
}

@Composable
private fun HistoryEntryCard(entry: PointEntry, onMenu: () -> Unit) {
    KarsaCard {
        Column(Modifier.padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                PointBadge(entry.points)
                Column(Modifier.weight(1f)) {
                    Text(
                        studentById(entry.studentId).name,
                        style = sansStyle(15, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(maskNim(studentById(entry.studentId).nim), style = sansStyle(12, 400, 1.4f, color = Muted))
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
                "${categoryLabel(entry.categoryId)} · ${courseById(entry.courseId).name}",
                style = sansStyle(13, 600, 1.4f, color = Ink2),
            )
            Text(
                "${courseById(entry.courseId).kelas} · ${fmtTime(entry.ts)}",
                style = sansStyle(12, 400, 1.4f, color = Muted),
            )
            if (entry.note != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "“${entry.note}”",
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
    val load = rememberLoad(delayMillis = 550)
    var openId by remember { mutableStateOf<String?>(null) }
    val groups = COURSES.map { course ->
        val entries = MY_ENTRIES.filter { it.courseId == course.id }.sortedByDescending { it.ts }
        Triple(course, entries, myTotal(entries))
    }.filter { it.second.isNotEmpty() }.sortedByDescending { it.third }
    val maxSum = maxOf(1, groups.maxOfOrNull { it.third } ?: 1)
    val expanded = openId ?: groups.firstOrNull()?.first?.id

    Column {
        Gate(
            status = load.status,
            onRetry = load.retry,
            skeleton = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Skeleton(Modifier.fillMaxWidth().height(208.dp), RoundedCornerShape(32.dp))
                    ListSkeleton(count = 2, lines = 1)
                }
            },
        ) {
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
                                .padding(end = 0.dp)
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
                                "${myTotal()}",
                                style = displayStyle(56, 800, 1f, -0.02f, Color.White),
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "${ME.kelas} · ${ME.prodi} · Semester ${ME.semester}",
                                style = sansStyle(13, 600, 1.4f, color = Color.White.copy(alpha = 0.9f)),
                            )
                            Spacer(Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Pill("${groups.size} matkul")
                                Pill("${MY_ENTRIES.size} kontribusi")
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(28.dp))
            Text("Per mata kuliah", modifier = Modifier.padding(horizontal = 4.dp), style = displayStyle(18, 700))
            Spacer(Modifier.height(12.dp))

            if (groups.isEmpty()) {
                KarsaCard {
                    EmptyState(
                        title = "Belum ada poin",
                        desc = "Poin dari PJ kelas akan muncul di sini setelah dicatat.",
                        icon = { LucideIcon(KarsaIcons.FileBarChart, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    groups.forEach { (course, entries, sum) ->
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
                                    Avatar(name = course.name, size = 44.dp, tone = course.tone, square = true)
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            course.name,
                                            style = sansStyle(15, 700, 1.25f),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
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
                                                    .fillMaxWidth((sum.toFloat() / maxSum).coerceIn(0.02f, 1f))
                                                    .height(6.dp)
                                                    .clip(CircleShape)
                                                    .background(Brand500),
                                            )
                                        }
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("$sum", style = displayStyle(24, 800, 1f))
                                        Text("${entries.size} entri", style = sansStyle(11, 400, 1.3f, color = Muted))
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
                                        entries.forEach { entry -> ReportEntryRow(entry) }
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
private fun ReportEntryRow(entry: MyEntry) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        PointBadge(entry.points)
        Column(Modifier.weight(1f)) {
            Text(categoryLabel(entry.categoryId), style = sansStyle(14, 600, 1.375f))
            Text(
                "${fmtDate(entry.ts)} · ${fmtTime(entry.ts)}",
                style = sansStyle(12, 400, 1.4f, color = Muted),
            )
            if (entry.note != null) {
                Text(
                    "“${entry.note}”",
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
    val load = rememberLoad(delayMillis = 600)
    var filter by remember { mutableStateOf("all") }
    var flash by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val rows = rankingFor(filter)
    val myIdx = rows.indexOfFirst { it.me }
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
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Chip("Semua matkul", selected = filter == "all", onClick = { filter = "all" })
            RANK_COURSES.forEach { id ->
                Chip(courseById(id).name, selected = filter == id, onClick = { filter = id })
            }
        }
        Spacer(Modifier.height(20.dp))

        Gate(
            status = load.status,
            onRetry = load.retry,
            skeleton = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Skeleton(Modifier.fillMaxWidth().height(256.dp), RoundedCornerShape(32.dp))
                    ListSkeleton(count = 2, lines = 1)
                }
            },
        ) {
            if (rows.isEmpty()) {
                KarsaCard {
                    EmptyState(
                        title = "Peringkat belum tersedia",
                        desc = "Peringkat muncul setelah poin keaktifan kelas tercatat.",
                        icon = { LucideIcon(KarsaIcons.Users, modifier = Modifier.size(36.dp), tint = Brand600) },
                    )
                }
            } else {
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
                                "${index + 4}",
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
                                    if (row.me) row.nim else maskNim(row.nim),
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
                        text = "Lihat posisiku · #${myIdx + 1}",
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
