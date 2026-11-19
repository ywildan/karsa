package ac.id.untidar.karsa.icons

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/**
 * Lucide renders stroke paths on a 24x24 grid. Paths are stored in viewBox units so the
 * stroke width can be overridden per usage exactly like the React `strokeWidth` prop.
 */
@Composable
fun LucideIcon(
    paths: List<String>,
    modifier: Modifier = Modifier,
    tint: Color = Color.Black,
    strokeWidth: Float = 2f,
    contentDescription: String? = null,
) {
    val parsed = remember(paths) { paths.map { PathParser().parsePathString(it).toPath() } }
    val semanticsModifier = if (contentDescription != null) {
        Modifier.semantics { this.contentDescription = contentDescription }
    } else {
        Modifier
    }
    Canvas(modifier = modifier.size(24.dp).then(semanticsModifier)) {
        val factor = size.minDimension / 24f
        scale(factor, factor, pivot = Offset.Zero) {
            parsed.forEach { path ->
                drawPath(
                    path = path,
                    color = tint,
                    style = Stroke(
                        width = strokeWidth,
                        cap = StrokeCap.Round,
                        join = StrokeJoin.Round,
                    ),
                )
            }
        }
    }
}
