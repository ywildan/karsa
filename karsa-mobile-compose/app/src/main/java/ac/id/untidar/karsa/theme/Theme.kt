package ac.id.untidar.karsa.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val KarsaColors = lightColorScheme(
    primary = Brand500,
    onPrimary = Color.White,
    primaryContainer = Brand100,
    onPrimaryContainer = Brand700,
    secondary = Espresso,
    onSecondary = Color.White,
    background = Paper,
    onBackground = Ink,
    surface = Paper,
    onSurface = Ink,
    surfaceVariant = Paper2,
    onSurfaceVariant = Ink2,
    outline = Line,
    error = Danger500,
    onError = Color.White,
    errorContainer = Danger100,
    onErrorContainer = Danger500,
)

@Composable
fun KarsaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = KarsaColors, content = content)
}
