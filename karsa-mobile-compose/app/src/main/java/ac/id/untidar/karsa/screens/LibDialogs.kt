package ac.id.untidar.karsa.screens

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.theme.Danger500
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Field
import ac.id.untidar.karsa.ui.KarsaDialog
import ac.id.untidar.karsa.ui.KarsaTextField
import ac.id.untidar.karsa.ui.SelectField
import ac.id.untidar.karsa.ui.SheetOption
import kotlinx.coroutines.launch

private data class ReportReason(val value: String, val label: String)

private val REPORT_REASONS = listOf(
    ReportReason("MISINFORMATION", "Informasi keliru"),
    ReportReason("INAPPROPRIATE", "Konten tidak pantas"),
    ReportReason("SPAM", "Spam atau promosi"),
    ReportReason("COPYRIGHT", "Hak cipta"),
    ReportReason("OTHER", "Lainnya"),
)

@Composable
fun LibReportDialog(
    open: Boolean,
    title: String,
    onClose: () -> Unit,
    onSubmit: suspend (reason: String, details: String?) -> Boolean,
) {
    var reason by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var sending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(open) {
        if (open) {
            reason = ""
            details = ""
            error = null
            sending = false
        }
    }

    KarsaDialog(
        open = open,
        onClose = { if (!sending) onClose() },
        title = title,
        desc = "Laporan akan ditinjau admin. Pilih alasan yang paling sesuai.",
        confirmLabel = if (sending) "Mengirim..." else "Kirim laporan",
        onConfirm = {
            when {
                sending -> Unit
                reason.isBlank() -> error = "Pilih alasan laporan terlebih dahulu."
                else -> scope.launch {
                    sending = true
                    val success = onSubmit(reason, details.trim().ifEmpty { null })
                    sending = false
                    if (success) onClose()
                }
            }
        },
        content = {
            Spacer(Modifier.height(16.dp))
            SelectField(
                value = reason,
                options = REPORT_REASONS.map { SheetOption(it.value, it.label) },
                onChange = {
                    reason = it
                    error = null
                },
                label = "Alasan laporan",
                placeholder = "Pilih alasan",
                sheetTitle = "Alasan laporan",
            )
            Spacer(Modifier.height(14.dp))
            Field(label = "Keterangan (opsional)") {
                KarsaTextField(
                    value = details,
                    onValueChange = { if (it.length <= 1000) details = it },
                    placeholder = "Tambahkan konteks bila perlu",
                    singleLine = false,
                    minHeight = 96.dp,
                )
            }
            if (error != null) {
                Spacer(Modifier.height(10.dp))
                Text(error!!, style = sansStyle(12, 500, 1.4f, color = Danger500))
            }
        },
    )
}
