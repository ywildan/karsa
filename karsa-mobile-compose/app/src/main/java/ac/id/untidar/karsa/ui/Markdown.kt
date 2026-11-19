package ac.id.untidar.karsa.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand400
import ac.id.untidar.karsa.theme.Brand50
import ac.id.untidar.karsa.theme.Brand500
import ac.id.untidar.karsa.theme.Brand700
import ac.id.untidar.karsa.theme.Brand800
import ac.id.untidar.karsa.theme.Espresso
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Paper2
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle

private val inlineRegex = Regex("(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`|\\[[^\\]]+\\]\\([^)]+\\))")
private val linkRegex = Regex("\\[([^\\]]+)\\]\\(([^)]+)\\)")

private fun inline(text: String): AnnotatedString = buildAnnotatedString {
    var last = 0
    for (match in inlineRegex.findAll(text)) {
        if (match.range.first > last) append(text.substring(last, match.range.first))
        val token = match.value
        when {
            token.startsWith("**") -> withStyle(SpanStyle(fontWeight = FontWeight.W700, color = Ink)) {
                append(token.substring(2, token.length - 2))
            }
            token.startsWith("*") -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                append(token.substring(1, token.length - 1))
            }
            token.startsWith("`") -> withStyle(
                SpanStyle(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.W500,
                    background = Paper2,
                    color = Brand700,
                ),
            ) {
                append(token.substring(1, token.length - 1))
            }
            else -> {
                val link = linkRegex.find(token)
                withStyle(
                    SpanStyle(
                        color = Brand700,
                        fontWeight = FontWeight.W600,
                        textDecoration = TextDecoration.Underline,
                    ),
                ) {
                    append(link?.groupValues?.get(1) ?: token)
                }
            }
        }
        last = match.range.last + 1
    }
    if (last < text.length) append(text.substring(last))
}

fun inlineMarkdown(text: String): AnnotatedString = inline(text)

private sealed interface MdBlock {
    data class H1(val text: String) : MdBlock
    data class H2(val text: String) : MdBlock
    data class P(val text: String) : MdBlock
    data class Quote(val text: String) : MdBlock
    data class Bullets(val items: List<String>) : MdBlock
    data class Code(val text: String) : MdBlock
}

private fun parse(source: String): List<MdBlock> {
    val lines = source.split("\n")
    val blocks = mutableListOf<MdBlock>()
    var i = 0
    while (i < lines.size) {
        val line = lines[i]
        if (line.isBlank()) {
            i++
            continue
        }
        when {
            line.startsWith("```") -> {
                val code = mutableListOf<String>()
                i++
                while (i < lines.size && !lines[i].startsWith("```")) code += lines[i++]
                i++
                blocks += MdBlock.Code(code.joinToString("\n"))
            }
            line.startsWith("## ") -> {
                blocks += MdBlock.H2(line.drop(3))
                i++
            }
            line.startsWith("# ") -> {
                blocks += MdBlock.H1(line.drop(2))
                i++
            }
            line.startsWith("> ") -> {
                val quote = mutableListOf<String>()
                while (i < lines.size && lines[i].startsWith("> ")) quote += lines[i++].drop(2)
                blocks += MdBlock.Quote(quote.joinToString(" "))
            }
            line.startsWith("- ") -> {
                val items = mutableListOf<String>()
                while (i < lines.size && lines[i].startsWith("- ")) items += lines[i++].drop(2)
                blocks += MdBlock.Bullets(items)
            }
            else -> {
                val para = mutableListOf<String>()
                while (i < lines.size && lines[i].isNotBlank() && !Regex("^(#|>|- |```)").containsMatchIn(lines[i])) {
                    para += lines[i++]
                }
                blocks += MdBlock.P(para.joinToString(" "))
            }
        }
    }
    return blocks
}

@Composable
fun Markdown(
    source: String,
    modifier: Modifier = Modifier,
    onBlockPosition: ((index: Int, y: Float) -> Unit)? = null,
) {
    val blocks = remember(source) { parse(source) }
    Column(modifier) {
        blocks.forEachIndexed { index, block ->
            Box(
                Modifier.onGloballyPositioned { coordinates ->
                    onBlockPosition?.invoke(index, coordinates.positionInRoot().y)
                },
            ) {
                when (block) {
                    is MdBlock.H1 -> Text(
                        text = inline(block.text),
                        modifier = Modifier.padding(top = 36.dp, bottom = 12.dp),
                        style = displayStyle(28, 800, 1.25f, -0.02f, Ink),
                    )
                    is MdBlock.H2 -> Text(
                        text = inline(block.text),
                        modifier = Modifier.padding(top = 36.dp, bottom = 12.dp),
                        style = displayStyle(24, 700, 1.25f, -0.02f, Ink),
                    )
                    is MdBlock.P -> Text(
                        text = inline(block.text),
                        modifier = Modifier.padding(vertical = 16.dp),
                        style = sansStyle(16, 400, 1.8f, color = Ink2),
                    )
                    is MdBlock.Quote -> Row(
                        modifier = Modifier
                            .padding(vertical = 24.dp)
                            .height(IntrinsicSize.Min)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(topStart = 0.dp, bottomStart = 0.dp, topEnd = 24.dp, bottomEnd = 24.dp))
                            .background(Brand50),
                    ) {
                        Box(Modifier.width(4.dp).fillMaxHeight().background(Brand400))
                        Text(
                            text = inline(block.text),
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp).weight(1f),
                            style = displayStyle(19, 600, 1.375f, color = Brand800),
                        )
                    }
                    is MdBlock.Bullets -> Column(
                        modifier = Modifier.padding(vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        block.items.forEach { item ->
                            Row(Modifier.fillMaxWidth()) {
                                Box(
                                    Modifier
                                        .padding(top = 11.dp)
                                        .size(6.dp)
                                        .background(Brand500, CircleShape),
                                )
                                Spacer(Modifier.width(12.dp))
                                Text(
                                    text = inline(item),
                                    style = sansStyle(16, 400, 1.7f, color = Ink2),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                    is MdBlock.Code -> Row(
                        modifier = Modifier
                            .padding(vertical = 20.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Espresso)
                            .horizontalScroll(rememberScrollState())
                            .padding(16.dp),
                    ) {
                        Text(
                            text = block.text,
                            style = sansStyle(13, 400, 1.625f, color = Brand100).copy(fontFamily = FontFamily.Monospace),
                        )
                    }
                }
            }
        }
    }
}
