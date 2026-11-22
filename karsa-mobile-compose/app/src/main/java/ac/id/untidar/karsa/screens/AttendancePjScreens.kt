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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.ToastTone
import ac.id.untidar.karsa.attendance.AttendanceHistoryDto
import ac.id.untidar.karsa.attendance.AttendanceStatus
import ac.id.untidar.karsa.attendance.PjAttendanceAssignmentDto
import ac.id.untidar.karsa.attendance.PjAttendanceDetailDto
import ac.id.untidar.karsa.attendance.PjAttendanceStudentDto
import ac.id.untidar.karsa.attendance.attendanceDateLabel
import ac.id.untidar.karsa.attendance.attendanceDayLabel
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.theme.Brand300
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Line
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.BatikPattern
import ac.id.untidar.karsa.ui.ButtonSize
import ac.id.untidar.karsa.ui.ButtonVariant
import ac.id.untidar.karsa.ui.Chip
import ac.id.untidar.karsa.ui.DialogTone
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.Field
import ac.id.untidar.karsa.ui.IconButtonVariant
import ac.id.untidar.karsa.ui.KarsaButton
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaIconButton
import ac.id.untidar.karsa.ui.KarsaSheet
import ac.id.untidar.karsa.ui.KarsaTextField
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.MenuEntry
import ac.id.untidar.karsa.ui.PopMenu
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.SearchField
import ac.id.untidar.karsa.ui.Segmented
import ac.id.untidar.karsa.ui.SegmentedOption
import ac.id.untidar.karsa.ui.Skeleton
import ac.id.untidar.karsa.ui.TopBar
import ac.id.untidar.karsa.ui.cardShadow
import java.time.LocalDate

@Composable
fun AttendanceScreen(assignmentId: String?) {
    if (assignmentId.isNullOrBlank()) {
        PjAttendanceListScreen()
    } else {
        PjAttendanceDetailScreen(assignmentId)
    }
}

/* -------------------------------------------------------------------------- */
/* Daftar matkul                                                              */
/* -------------------------------------------------------------------------- */

@Composable
private fun PjAttendanceListScreen() {
    val state = LocalApp.current
    val attendance = state.attendance

    LaunchedEffect(Unit) { attendance.loadAssignments(force = true) }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = "Absensi",
            subtitle = "Catat mahasiswa yang tidak hadir",
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                attendance.assignmentsStatus == LoadStatus.Loading &&
                    attendance.assignments.isEmpty() -> {
                    ListSkeleton(count = 3, lines = 2)
                }

                attendance.assignmentsStatus == LoadStatus.Error &&
                    attendance.assignments.isEmpty() -> {
                    KarsaCard {
                        EmptyState(
                            title = "Daftar matkul belum termuat",
                            desc = attendance.assignmentsError
                                ?: "Periksa koneksi lalu coba lagi.",
                            icon = {
                                LucideIcon(
                                    KarsaIcons.TriangleAlert,
                                    modifier = Modifier.size(36.dp),
                                    tint = Brand600,
                                )
                            },
                            action = {
                                KarsaButton(
                                    "Coba lagi",
                                    onClick = { attendance.loadAssignments(force = true) },
                                    variant = ButtonVariant.Soft,
                                )
                            },
                        )
                    }
                }

                attendance.assignments.isEmpty() -> {
                    KarsaCard {
                        EmptyState(
                            title = "Belum ada matkul aktif",
                            desc = "Kamu belum memegang matkul di semester aktif angkatanmu.",
                            icon = {
                                LucideIcon(
                                    KarsaIcons.CheckCircle2,
                                    modifier = Modifier.size(36.dp),
                                    tint = Brand600,
                                )
                            },
                        )
                    }
                }

                else -> {
                    Text(
                        "Mata kuliah",
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                        style = displayStyle(18, 700),
                    )
                    attendance.assignments.forEachIndexed { index, assignment ->
                        Rise(delayMillis = 40 * (index + 1)) {
                            PjAssignmentCard(assignment) {
                                state.go(Route.Attendance(assignment.id))
                            }
                        }
                    }
                    Text(
                        "Pilih matkul untuk melihat mahasiswa dan mencatat absensi.",
                        modifier = Modifier.padding(horizontal = 4.dp),
                        style = sansStyle(11, 400, 1.55f, color = Muted),
                    )
                }
            }
        }
    }
}

@Composable
private fun PjAssignmentCard(
    assignment: PjAttendanceAssignmentDto,
    onClick: () -> Unit,
) {
    KarsaCard(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(16.dp)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Avatar(name = assignment.matkul.name, size = 48.dp, square = true)
                Column(Modifier.weight(1f)) {
                    Text(
                        assignment.matkul.name,
                        style = sansStyle(16, 700, 1.25f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    val meta = listOfNotNull(
                        assignment.matkul.code?.takeIf { it.isNotBlank() },
                        assignment.kelas.name.takeIf { it.isNotBlank() },
                        assignment.kelas.semester?.name?.takeIf { it.isNotBlank() },
                    ).joinToString(" · ")
                    if (meta.isNotBlank()) {
                        Text(meta, style = sansStyle(11, 500, 1.3f, color = Muted))
                    }
                }
                LucideIcon(
                    KarsaIcons.ChevronRight,
                    modifier = Modifier.size(20.dp),
                    tint = Muted,
                )
            }
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Badge("${assignment.studentCount} mahasiswa", tone = BadgeTone.Neutral)
                Badge(
                    "${assignment.alphaRecords} tanpa ket.",
                    tone = if (assignment.alphaRecords > 0) BadgeTone.Danger else BadgeTone.Neutral,
                )
                Badge("${assignment.totalRecords} catatan", tone = BadgeTone.Brand)
            }
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Detail matkul                                                              */
/* -------------------------------------------------------------------------- */

private enum class PjAttendanceTab { Mahasiswa, Riwayat }

private data class PjAttendanceRecord(
    val student: PjAttendanceStudentDto,
    val entry: AttendanceHistoryDto,
)

@Composable
private fun PjAttendanceDetailScreen(assignmentId: String) {
    val state = LocalApp.current
    val attendance = state.attendance
    val detail = attendance.details[assignmentId]
    val status = attendance.detailStatus[assignmentId] ?: LoadStatus.Loading
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var sheetOpen by remember { mutableStateOf(false) }
    var showReset by remember { mutableStateOf(false) }
    var resetting by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<PjAttendanceRecord?>(null) }
    var tab by remember { mutableStateOf(PjAttendanceTab.Mahasiswa) }

    LaunchedEffect(assignmentId) {
        attendance.loadDetail(assignmentId, force = true)
    }
    LaunchedEffect(tab) {
        scrollState.scrollTo(0)
    }

    val subtitle = detail?.assignment?.let { info ->
        listOfNotNull(
            info.kelas.name.takeIf { it.isNotBlank() },
            info.kelas.semester?.name?.takeIf { it.isNotBlank() },
        ).joinToString(" · ").takeIf { it.isNotBlank() }
    }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(
            onBack = { state.back() },
            title = detail?.assignment?.matkul?.name ?: "Absensi",
            subtitle = subtitle,
            right = {
                PopMenu(
                    entries = buildList {
                        add(
                            MenuEntry("Muat ulang", KarsaIcons.RefreshCw) {
                                attendance.loadDetail(assignmentId, force = true)
                            },
                        )
                        if (detail?.students?.any { it.history.isNotEmpty() } == true) {
                            add(
                                MenuEntry(
                                    label = "Reset catatan",
                                    icon = KarsaIcons.Trash2,
                                    onClick = { showReset = true },
                                    danger = true,
                                ),
                            )
                        }
                    },
                )
            },
        )

        Box(Modifier.weight(1f)) {
            when {
                status == LoadStatus.Loading && detail == null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(horizontal = 20.dp)
                            .padding(top = 8.dp, bottom = 32.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Skeleton(Modifier.fillMaxWidth().height(190.dp), RoundedCornerShape(32.dp))
                        ListSkeleton(count = 3, lines = 1)
                    }
                }

                status == LoadStatus.Error && detail == null -> {
                    Column(Modifier.padding(horizontal = 20.dp).padding(top = 8.dp)) {
                        KarsaCard {
                            EmptyState(
                                title = "Absensi belum termuat",
                                desc = attendance.detailError[assignmentId]
                                    ?: "Periksa koneksi lalu coba lagi.",
                                icon = {
                                    LucideIcon(
                                        KarsaIcons.TriangleAlert,
                                        modifier = Modifier.size(36.dp),
                                        tint = Brand600,
                                    )
                                },
                                action = {
                                    KarsaButton(
                                        "Coba lagi",
                                        onClick = {
                                            attendance.loadDetail(assignmentId, force = true)
                                        },
                                        variant = ButtonVariant.Soft,
                                    )
                                },
                            )
                        }
                    }
                }

                detail == null -> {
                    Column(Modifier.padding(horizontal = 20.dp).padding(top = 8.dp)) {
                        KarsaCard {
                            EmptyState(
                                title = "Data tidak ditemukan",
                                desc = "Matkul ini mungkin bukan semester aktif angkatanmu.",
                                icon = {
                                    LucideIcon(
                                        KarsaIcons.CheckCircle2,
                                        modifier = Modifier.size(36.dp),
                                        tint = Brand600,
                                    )
                                },
                            )
                        }
                    }
                }

                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(horizontal = 20.dp)
                            .padding(top = 8.dp, bottom = 120.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Rise { PjAttendanceHeader(detail) }

                        Segmented(
                            options = listOf(
                                SegmentedOption(PjAttendanceTab.Mahasiswa, "Mahasiswa") {
                                    LucideIcon(
                                        KarsaIcons.Users,
                                        modifier = Modifier.size(16.dp),
                                        tint = Ink2,
                                    )
                                },
                                SegmentedOption(PjAttendanceTab.Riwayat, "Riwayat") {
                                    LucideIcon(
                                        KarsaIcons.History,
                                        modifier = Modifier.size(16.dp),
                                        tint = Ink2,
                                    )
                                },
                            ),
                            value = tab,
                            onChange = { tab = it },
                        )

                        when (tab) {
                            PjAttendanceTab.Mahasiswa -> PjAttendanceRoster(detail.students)
                            PjAttendanceTab.Riwayat -> PjAttendanceHistory(
                                students = detail.students,
                                onDelete = { deleteTarget = it },
                            )
                        }
                    }
                }
            }

            if (detail != null && detail.students.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                listOf(Paper.copy(alpha = 0f), Paper),
                            ),
                        )
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                ) {
                    KarsaButton(
                        text = "Catat absen",
                        onClick = { sheetOpen = true },
                        full = true,
                        size = ButtonSize.Lg,
                        leading = {
                            LucideIcon(
                                KarsaIcons.Plus,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White,
                            )
                        },
                    )
                }
            }
        }
    }

    if (sheetOpen && detail != null) {
        PjAttendanceRecordSheet(
            assignmentId = assignmentId,
            detail = detail,
            onClose = { sheetOpen = false },
        )
    }

    KarsaDialog(
        open = showReset,
        onClose = { if (!resetting) showReset = false },
        title = "Reset catatan absensi?",
        desc = "Semua catatan di ${detail?.assignment?.matkul?.name ?: "matkul ini"} " +
            "akan dihapus. Kuota tanpa keterangan semua mahasiswa kembali ke 2. " +
            "Tindakan ini tercatat di audit log.",
        tone = DialogTone.Danger,
        confirmLabel = if (resetting) "Mereset..." else "Reset",
        onConfirm = {
            if (!resetting) {
                resetting = true
                scope.launch {
                    try {
                        state.notify(attendance.reset(assignmentId), ToastTone.Success)
                        showReset = false
                    } catch (failure: Exception) {
                        state.notify(friendlyError(failure), ToastTone.Error)
                    } finally {
                        resetting = false
                    }
                }
            }
        },
    )

    val target = deleteTarget
    KarsaDialog(
        open = target != null,
        onClose = { deleteTarget = null },
        title = "Hapus catatan absensi?",
        desc = target?.let {
            "Catatan ${it.entry.statusKind.label.lowercase()} untuk ${it.student.displayName} " +
                "pada ${attendanceDateLabel(it.entry.tanggal)} akan dihapus."
        },
        tone = DialogTone.Danger,
        confirmLabel = "Hapus",
        onConfirm = {
            if (target != null) {
                deleteTarget = null
                scope.launch {
                    try {
                        state.notify(
                            attendance.delete(target.entry.id, assignmentId),
                            ToastTone.Success,
                        )
                    } catch (failure: Exception) {
                        state.notify(friendlyError(failure), ToastTone.Error)
                    }
                }
            }
        },
    )
}

@Composable
private fun PjAttendanceHeader(detail: PjAttendanceDetailDto) {
    val totalAlpha = detail.students.sumOf { it.counts.alpha }
    val totalRecords = detail.students.sumOf { it.history.size }
    val meta = listOfNotNull(
        detail.assignment.kelas.name.takeIf { it.isNotBlank() },
        detail.assignment.kelas.semester?.name?.takeIf { it.isNotBlank() },
    ).joinToString(" · ")

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .cardShadow(RoundedCornerShape(32.dp))
            .clip(RoundedCornerShape(32.dp))
            .background(Espresso)
            .padding(20.dp),
    ) {
        Box(Modifier.fillMaxWidth()) {
            BatikPattern(Modifier.matchParentSize(), color = Color.White, alpha = 0.12f)
            Column(Modifier.fillMaxWidth()) {
                Text(
                    "ABSENSI KELAS",
                    style = sansStyle(11, 700, 1.4f, 0.16f, Brand300),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    detail.assignment.matkul.name,
                    style = displayStyle(24, 800, 1.15f, color = Color.White),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (meta.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        meta,
                        style = sansStyle(12, 500, 1.4f, color = Color.White.copy(alpha = 0.72f)),
                    )
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    PjHeroStat(detail.students.size, "Mahasiswa", Modifier.weight(1f))
                    PjHeroStat(totalAlpha, "Tanpa ket.", Modifier.weight(1f))
                    PjHeroStat(totalRecords, "Catatan", Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun PjHeroStat(value: Int, label: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text("$value", style = displayStyle(22, 800, 1f, color = Color.White))
        Text(
            label,
            style = sansStyle(10, 600, 1.3f, color = Color.White.copy(alpha = 0.68f)),
        )
    }
}

@Composable
private fun PjAttendanceRoster(students: List<PjAttendanceStudentDto>) {
    if (students.isEmpty()) {
        KarsaCard {
            EmptyState(
                title = "Belum ada mahasiswa",
                desc = "Kelas ini belum memiliki anggota.",
                icon = {
                    LucideIcon(
                        KarsaIcons.Users,
                        modifier = Modifier.size(36.dp),
                        tint = Brand600,
                    )
                },
            )
        }
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Mahasiswa", style = displayStyle(17, 700))
            Text(
                "${students.size} orang",
                style = sansStyle(11, 600, 1.2f, color = Muted),
            )
        }
        KarsaCard(Modifier.fillMaxWidth()) {
            Column {
                students.forEachIndexed { index, student ->
                    if (index > 0) {
                        Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                    }
                    PjRosterRow(student)
                }
            }
        }
    }
}

@Composable
private fun PjRosterRow(student: PjAttendanceStudentDto) {
    val extra = listOfNotNull(
        if (student.counts.sakit > 0) "Sakit ${student.counts.sakit}" else null,
        if (student.counts.izin > 0) "Keterangan ${student.counts.izin}" else null,
    ).joinToString(" · ")

    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(name = student.displayName, size = 38.dp)
        Column(Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    student.displayName,
                    modifier = Modifier.weight(1f, fill = false),
                    style = sansStyle(14, 600, 1.3f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (student.isSelf) {
                    Badge("Kamu", tone = BadgeTone.Neutral)
                }
            }
            Text(
                student.nim ?: "NIM belum ada",
                style = sansStyle(11, 400, 1.3f, color = Muted),
            )
            if (extra.isNotBlank()) {
                Text(extra, style = sansStyle(10, 500, 1.3f, color = Muted))
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            Badge(
                text = "${student.counts.alpha}/${student.alphaLimit}",
                tone = when {
                    student.alphaOver > 0 || student.alphaRemaining == 0 -> BadgeTone.Danger
                    student.alphaRemaining == 1 -> BadgeTone.Butter
                    else -> BadgeTone.Leaf
                },
            )
            Spacer(Modifier.height(3.dp))
            Text(
                if (student.alphaOver > 0) {
                    "lewat ${student.alphaOver}"
                } else {
                    "sisa ${student.alphaRemaining}"
                },
                style = sansStyle(
                    10,
                    500,
                    1.2f,
                    color = if (student.exhausted) Danger500 else Muted,
                ),
            )
        }
    }
}

@Composable
private fun PjAttendanceHistory(
    students: List<PjAttendanceStudentDto>,
    onDelete: (PjAttendanceRecord) -> Unit,
) {
    val records = students
        .flatMap { student -> student.history.map { PjAttendanceRecord(student, it) } }
        .sortedWith(
            compareByDescending<PjAttendanceRecord> { it.entry.tanggal }
                .thenBy { it.student.displayName },
        )

    if (records.isEmpty()) {
        KarsaCard {
            EmptyState(
                title = "Belum ada catatan",
                desc = "Catat mahasiswa yang tidak hadir lewat tombol di bawah.",
                icon = {
                    LucideIcon(
                        KarsaIcons.History,
                        modifier = Modifier.size(36.dp),
                        tint = Brand600,
                    )
                },
            )
        }
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Riwayat", style = displayStyle(17, 700))
            Text(
                "${records.size} catatan",
                style = sansStyle(11, 600, 1.2f, color = Muted),
            )
        }
        records.groupBy { it.entry.tanggal }.forEach { (date, rows) ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(attendanceDateLabel(date), style = displayStyle(15, 700))
                    Text(
                        "${rows.size} catatan",
                        style = sansStyle(11, 500, 1.2f, color = Muted),
                    )
                }
                KarsaCard(Modifier.fillMaxWidth()) {
                    Column {
                        rows.forEachIndexed { index, record ->
                            if (index > 0) {
                                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                            }
                            PjHistoryRow(record, onDelete = { onDelete(record) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PjHistoryRow(
    record: PjAttendanceRecord,
    onDelete: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(name = record.student.displayName, size = 34.dp)
        Column(Modifier.weight(1f)) {
            Text(
                record.student.displayName,
                style = sansStyle(14, 600, 1.3f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                record.student.nim ?: "NIM belum ada",
                style = sansStyle(11, 400, 1.3f, color = Muted),
            )
            val note = record.entry.catatan
            if (!note.isNullOrBlank()) {
                Text(
                    "“$note”",
                    modifier = Modifier.padding(top = 2.dp),
                    style = sansStyle(12, 400, 1.45f, color = Ink2),
                )
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            Badge(
                record.entry.statusKind.label,
                tone = record.entry.statusKind.badgeTone(),
            )
            KarsaIconButton(
                onClick = onDelete,
                variant = IconButtonVariant.Ghost,
                contentDescription = "Hapus catatan",
            ) {
                LucideIcon(
                    KarsaIcons.Trash2,
                    modifier = Modifier.size(18.dp),
                    tint = Danger500,
                )
            }
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Sheet pencatatan                                                           */
/* -------------------------------------------------------------------------- */

@Composable
private fun PjAttendanceRecordSheet(
    assignmentId: String,
    detail: PjAttendanceDetailDto,
    onClose: () -> Unit,
) {
    val state = LocalApp.current
    val attendance = state.attendance
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now().toString() }

    var date by remember { mutableStateOf(today) }
    var status by remember { mutableStateOf(AttendanceStatus.TanpaKeterangan) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var query by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }

    val students = detail.students
    val alreadyIds = students
        .filter { student -> student.history.any { it.tanggal == date } }
        .map { it.id }
        .toSet()

    LaunchedEffect(date, alreadyIds) {
        selected = selected.filter { it !in alreadyIds }.toSet()
    }

    val keyword = query.trim()
    val filtered = students.filter { student ->
        keyword.isBlank() ||
            student.displayName.contains(keyword, ignoreCase = true) ||
            student.nim?.contains(keyword) == true
    }
    val chosen = students.filter { it.id in selected && it.id !in alreadyIds }
    val willExceed = status == AttendanceStatus.TanpaKeterangan &&
        chosen.any { it.exhausted }

    KarsaSheet(
        open = true,
        onClose = { if (!saving) onClose() },
        title = "Catat absensi",
        footer = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (willExceed) {
                    Text(
                        "Sebagian mahasiswa sudah 2/2. Catatan tetap disimpan dengan peringatan.",
                        style = sansStyle(11, 500, 1.45f, color = Danger500),
                    )
                }
                KarsaButton(
                    text = "Simpan absensi",
                    onClick = {
                        if (!saving && chosen.isNotEmpty()) {
                            saving = true
                            scope.launch {
                                try {
                                    val result = attendance.create(
                                        assignmentId = assignmentId,
                                        tanggal = date,
                                        status = status,
                                        studentIds = chosen.map { it.id },
                                        catatan = note,
                                    )
                                    if (result.warnings.isNotEmpty()) {
                                        val names = result.warnings
                                            .take(2)
                                            .joinToString(", ") { it.name }
                                        val rest = if (result.warnings.size > 2) {
                                            " +${result.warnings.size - 2}"
                                        } else {
                                            ""
                                        }
                                        state.notify(
                                            "${result.message} Peringatan: $names$rest " +
                                                "melewati jatah 2 alpha.",
                                            ToastTone.Error,
                                        )
                                    } else {
                                        state.notify(result.message, ToastTone.Success)
                                    }
                                    onClose()
                                } catch (failure: Exception) {
                                    state.notify(friendlyError(failure), ToastTone.Error)
                                } finally {
                                    saving = false
                                }
                            }
                        }
                    },
                    full = true,
                    size = ButtonSize.Lg,
                    loading = saving,
                    enabled = chosen.isNotEmpty(),
                )
            }
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Field(label = "Tanggal") {
                AttendanceDateControl(
                    date = date,
                    today = today,
                    onChange = { date = it },
                )
            }

            Field(label = "Status") {
                Segmented(
                    options = AttendanceStatus.options.map { option ->
                        SegmentedOption(
                            value = option,
                            label = when (option) {
                                AttendanceStatus.TanpaKeterangan -> "Tanpa ket."
                                AttendanceStatus.Sakit -> "Sakit"
                                AttendanceStatus.Izin -> "Keterangan"
                            },
                        )
                    },
                    value = status,
                    onChange = { status = it },
                )
            }

            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Mahasiswa",
                        style = sansStyle(13, 600, 1.2f, color = Ink2),
                    )
                    Text(
                        "${chosen.size} dipilih",
                        style = sansStyle(
                            12,
                            600,
                            1.2f,
                            color = if (chosen.isEmpty()) Muted else Brand600,
                        ),
                    )
                }
                Spacer(Modifier.height(8.dp))
                SearchField(
                    value = query,
                    onChange = { query = it },
                    placeholder = "Cari nama atau NIM",
                )
                Spacer(Modifier.height(10.dp))
                if (filtered.isEmpty()) {
                    Text(
                        "Tidak ada mahasiswa yang cocok.",
                        modifier = Modifier.padding(vertical = 12.dp),
                        style = sansStyle(12, 400, 1.5f, color = Muted),
                    )
                } else {
                    KarsaCard(Modifier.fillMaxWidth()) {
                        Column {
                            filtered.forEachIndexed { index, student ->
                                if (index > 0) {
                                    Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                                }
                                AttendanceStudentPickerRow(
                                    student = student,
                                    checked = student.id in selected,
                                    alreadyRecorded = student.id in alreadyIds,
                                    onToggle = {
                                        selected = if (student.id in selected) {
                                            selected - student.id
                                        } else {
                                            selected + student.id
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }

            Field(label = "Catatan (opsional)") {
                KarsaTextField(
                    value = note,
                    onValueChange = { note = it },
                    placeholder = "Mis. keterangan dokter atau alasan izin",
                    singleLine = false,
                    minHeight = 84.dp,
                )
            }
        }
    }
}

@Composable
private fun AttendanceDateControl(
    date: String,
    today: String,
    onChange: (String) -> Unit,
) {
    val yesterday = shiftDate(today, -1)
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Paper2)
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            KarsaIconButton(
                onClick = { onChange(shiftDate(date, -1)) },
                variant = IconButtonVariant.Ghost,
                contentDescription = "Hari sebelumnya",
            ) {
                LucideIcon(
                    KarsaIcons.ChevronLeft,
                    modifier = Modifier.size(20.dp),
                    tint = Ink,
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LucideIcon(
                        KarsaIcons.CalendarDays,
                        modifier = Modifier.size(15.dp),
                        tint = Brand600,
                    )
                    Text(attendanceDateLabel(date), style = sansStyle(15, 700, 1.2f))
                }
                Text(
                    attendanceDayLabel(date),
                    style = sansStyle(10, 500, 1.2f, color = Muted),
                )
            }
            if (date < today) {
                KarsaIconButton(
                    onClick = { onChange(shiftDate(date, 1)) },
                    variant = IconButtonVariant.Ghost,
                    contentDescription = "Hari berikutnya",
                ) {
                    LucideIcon(
                        KarsaIcons.ChevronRight,
                        modifier = Modifier.size(20.dp),
                        tint = Ink,
                    )
                }
            } else {
                Spacer(Modifier.size(40.dp))
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(
                text = "Hari ini",
                selected = date == today,
                onClick = { onChange(today) },
            )
            Chip(
                text = "Kemarin",
                selected = date == yesterday,
                onClick = { onChange(yesterday) },
            )
        }
    }
}

@Composable
private fun AttendanceStudentPickerRow(
    student: PjAttendanceStudentDto,
    checked: Boolean,
    alreadyRecorded: Boolean,
    onToggle: () -> Unit,
) {
    val enabled = !alreadyRecorded
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onToggle)
            .background(if (checked) Brand50 else Color.Transparent)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SelectionMark(checked = checked, enabled = enabled)
        Avatar(name = student.displayName, size = 34.dp)
        Column(Modifier.weight(1f)) {
            Text(
                student.displayName,
                style = sansStyle(14, 600, 1.3f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                student.nim ?: "NIM belum ada",
                style = sansStyle(11, 400, 1.3f, color = Muted),
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                "${student.counts.alpha}/${student.alphaLimit}",
                style = sansStyle(
                    12,
                    700,
                    1f,
                    color = if (student.exhausted) Danger500 else Ink2,
                ),
            )
            Text(
                when {
                    alreadyRecorded -> "Sudah dicatat"
                    student.alphaOver > 0 -> "Lewat ${student.alphaOver}"
                    student.alphaRemaining == 0 -> "Jatah habis"
                    else -> "Sisa ${student.alphaRemaining}"
                },
                style = sansStyle(
                    10,
                    500,
                    1.2f,
                    color = if (alreadyRecorded || student.exhausted) {
                        Danger500
                    } else {
                        Muted
                    },
                ),
            )
        }
    }
}

@Composable
private fun SelectionMark(checked: Boolean, enabled: Boolean) {
    val shape = RoundedCornerShape(8.dp)
    Box(
        modifier = Modifier
            .size(22.dp)
            .alpha(if (enabled) 1f else 0.35f)
            .clip(shape)
            .background(if (checked) Brand500 else Color.White)
            .border(1.5.dp, if (checked) Brand500 else Line, shape),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            LucideIcon(
                KarsaIcons.Check,
                modifier = Modifier.size(14.dp),
                tint = Color.White,
                strokeWidth = 3f,
            )
        }
    }
}

private fun AttendanceStatus.badgeTone(): BadgeTone = when (this) {
    AttendanceStatus.TanpaKeterangan -> BadgeTone.Danger
    AttendanceStatus.Sakit -> BadgeTone.Butter
    AttendanceStatus.Izin -> BadgeTone.Leaf
}

private fun shiftDate(value: String, days: Long): String =
    runCatching { LocalDate.parse(value).plusDays(days).toString() }.getOrDefault(value)
