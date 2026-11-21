package ac.id.untidar.karsa.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.theme.Brand500

/** Empat kelopak kawung yang bertemu di satu titik: simbol kontribusi yang saling terhubung. */
@Composable
fun LogoMark(
    size: Dp = 56.dp,
    tile: Color = Brand500,
    ink: Color = Color.White,
    radius: Float = 15f,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.then(Modifier.size(size))) {
        val factor = this.size.width / 48f
        scale(factor, factor) {
            drawRoundRect(color = tile, cornerRadius = CornerRadius(radius, radius), size = Size(48f, 48f))
            val stroke = Stroke(width = 2.2f, cap = StrokeCap.Round, join = StrokeJoin.Round)
            drawOval(ink, Offset(18.8f, 5.7f), Size(10.4f, 17.6f), style = stroke)
            drawOval(ink, Offset(18.8f, 24.7f), Size(10.4f, 17.6f), style = stroke)
            drawOval(ink, Offset(5.7f, 18.8f), Size(17.6f, 10.4f), style = stroke)
            drawOval(ink, Offset(24.7f, 18.8f), Size(17.6f, 10.4f), style = stroke)
            drawCircle(ink, radius = 3.2f, center = Offset(24f, 24f))
        }
    }
}

private val googleYellow = "M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
private val googleRed = "M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
private val googleGreen = "M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
private val googleBlue = "M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"

@Composable
fun GoogleMark(modifier: Modifier = Modifier, size: Dp = 20.dp) {
    val paths = remember {
        listOf(
            PathParser().parsePathString(googleYellow).toPath() to Color(0xFFFFC107),
            PathParser().parsePathString(googleRed).toPath() to Color(0xFFFF3D00),
            PathParser().parsePathString(googleGreen).toPath() to Color(0xFF4CAF50),
            PathParser().parsePathString(googleBlue).toPath() to Color(0xFF1976D2),
        )
    }
    Canvas(modifier.then(Modifier.size(size))) {
        val factor = this.size.width / 48f
        scale(factor, factor) {
            paths.forEach { (path, color) -> drawPath(path, color) }
        }
    }
}
