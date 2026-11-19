package ac.id.untidar.karsa.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.EyebrowText
import ac.id.untidar.karsa.ui.PageHeader

/**
 * Slice 1 only ships the Entry flow and the dock shell. Each tab renders its own
 * placeholder until the matching prototype screen is ported in the next slices.
 */
@Composable
fun TabsScreen() {
    val state = LocalApp.current
    Column(Modifier.fillMaxSize()) {
        PageHeader(
            title = state.tab.label,
            eyebrow = { EyebrowText("Rebuild Compose · Slice 1") },
        )
        EmptyState(
            title = "Layar ini menyusul",
            desc = "Navigasi dan desain dock sudah aktif. Isi tab ${state.tab.label} diporting pada slice berikutnya.",
            icon = { LucideIcon(KarsaIcons.Inbox, modifier = Modifier.size(36.dp), tint = Brand600) },
            modifier = Modifier.weight(1f),
        )
    }
}
