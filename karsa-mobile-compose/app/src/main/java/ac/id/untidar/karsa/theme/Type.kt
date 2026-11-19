@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)

package ac.id.untidar.karsa.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import ac.id.untidar.karsa.R

private fun displayFont(weight: Int) = Font(
    R.font.bricolage_grotesque,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

private fun sansFont(weight: Int) = Font(
    R.font.plus_jakarta_sans,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

val DisplayFamily = FontFamily(
    displayFont(400),
    displayFont(500),
    displayFont(600),
    displayFont(700),
    displayFont(800),
)

val SansFamily = FontFamily(
    sansFont(400),
    sansFont(500),
    sansFont(600),
    sansFont(700),
    sansFont(800),
)

fun displayStyle(
    size: Int,
    weight: Int = 800,
    lineHeight: Float? = null,
    trackingEm: Float = 0f,
    color: Color = Ink,
): TextStyle = TextStyle(
    fontFamily = DisplayFamily,
    fontSize = size.sp,
    fontWeight = FontWeight(weight),
    lineHeight = ((lineHeight ?: 1.2f) * size).sp,
    letterSpacing = (trackingEm * size).sp,
    color = color,
)

fun sansStyle(
    size: Int,
    weight: Int = 400,
    lineHeight: Float? = null,
    trackingEm: Float = 0f,
    color: Color = Ink,
): TextStyle = TextStyle(
    fontFamily = SansFamily,
    fontSize = size.sp,
    fontWeight = FontWeight(weight),
    lineHeight = ((lineHeight ?: 1.5f) * size).sp,
    letterSpacing = (trackingEm * size).sp,
    color = color,
)

val Body: TextStyle = sansStyle(14, 400)
val Eyebrow: TextStyle = sansStyle(11, 700, 1.4f, 0.16f, Brand700)

fun em(value: Float): TextUnit = value.sp
