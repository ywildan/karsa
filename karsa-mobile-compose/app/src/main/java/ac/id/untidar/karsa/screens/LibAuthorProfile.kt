package ac.id.untidar.karsa.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ac.id.untidar.karsa.LocalApp
import ac.id.untidar.karsa.Route
import ac.id.untidar.karsa.icons.KarsaIcons
import ac.id.untidar.karsa.icons.LucideIcon
import ac.id.untidar.karsa.lib.LibArticleDto
import ac.id.untidar.karsa.lib.toArticle
import ac.id.untidar.karsa.theme.Brand100
import ac.id.untidar.karsa.theme.Brand600
import ac.id.untidar.karsa.theme.Ink
import ac.id.untidar.karsa.theme.Ink2
import ac.id.untidar.karsa.theme.Muted
import ac.id.untidar.karsa.theme.Paper
import ac.id.untidar.karsa.theme.displayStyle
import ac.id.untidar.karsa.theme.sansStyle
import ac.id.untidar.karsa.ui.Avatar
import ac.id.untidar.karsa.ui.Badge
import ac.id.untidar.karsa.ui.BadgeTone
import ac.id.untidar.karsa.ui.EmptyState
import ac.id.untidar.karsa.ui.Gate
import ac.id.untidar.karsa.ui.KarsaCard
import ac.id.untidar.karsa.ui.ListSkeleton
import ac.id.untidar.karsa.ui.LoadStatus
import ac.id.untidar.karsa.ui.Rise
import ac.id.untidar.karsa.ui.TopBar

@Composable
fun AuthorProfileScreen(authorId: String) {
    val state = LocalApp.current
    val lib = state.lib
    val profile = lib.authors[authorId]
    val status = lib.authorStatus[authorId] ?: LoadStatus.Loading

    LaunchedEffect(authorId) { lib.loadAuthor(authorId) }

    Column(Modifier.fillMaxSize().background(Paper)) {
        TopBar(onBack = { state.back() }, title = "Profil penulis", subtitle = "Karsa Lib")
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Gate(
                status = status,
                onRetry = { lib.loadAuthor(authorId) },
                skeleton = {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        KarsaCard {
                            Row(Modifier.padding(20.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Avatar(name = "Mahasiswa Karsa", size = 64.dp)
                                Column(Modifier.weight(1f)) {
                                    Spacer(Modifier.height(8.dp))
                                    androidx.compose.foundation.layout.Box(
                                        Modifier.fillMaxWidth(0.6f).height(18.dp).background(Brand100, RoundedCornerShape(6.dp)),
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    androidx.compose.foundation.layout.Box(
                                        Modifier.fillMaxWidth(0.4f).height(12.dp).background(Brand100, RoundedCornerShape(6.dp)),
                                    )
                                }
                            }
                        }
                        ListSkeleton(count = 2, lines = 2)
                    }
                },
            ) {
                if (profile == null) {
                    KarsaCard {
                        EmptyState(
                            title = "Profil tidak ditemukan",
                            desc = "Penulis ini mungkin sudah tidak aktif atau berada di prodi lain.",
                            icon = { LucideIcon(KarsaIcons.UserRound, modifier = Modifier.size(36.dp), tint = Brand600) },
                        )
                    }
                } else {
                    Rise {
                        KarsaCard {
                            Row(Modifier.padding(20.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Avatar(name = profile.name, size = 64.dp)
                                Column(Modifier.weight(1f)) {
                                    Text(profile.name, style = displayStyle(22, 700, 1.2f))
                                    if (profile.programName.isNotBlank()) {
                                        Text(profile.programName, style = sansStyle(13, 600, 1.4f, color = Ink2))
                                    }
                                    if (profile.faculty.isNotBlank()) {
                                        Text(profile.faculty, style = sansStyle(12, 400, 1.4f, color = Muted))
                                    }
                                }
                            }
                        }
                    }

                    Rise(delayMillis = 60) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatCard(
                                value = "${profile.articleCount}",
                                label = "Artikel terbit",
                                modifier = Modifier.weight(1f),
                            )
                            StatCard(
                                value = "${profile.totalViews}",
                                label = "Total pembaca",
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    Text(
                        "Tulisan ${profile.name.split(" ").firstOrNull() ?: profile.name}",
                        modifier = Modifier.padding(top = 8.dp, start = 4.dp),
                        style = displayStyle(18, 700),
                    )

                    if (profile.articles.isEmpty()) {
                        KarsaCard {
                            EmptyState(
                                title = "Belum ada artikel",
                                desc = "Artikel yang diterbitkan penulis akan tampil di sini.",
                                icon = { LucideIcon(KarsaIcons.BookOpenText, modifier = Modifier.size(36.dp), tint = Brand600) },
                            )
                        }
                    } else {
                        profile.articles.forEachIndexed { index, dto ->
                            Rise(delayMillis = index * 40) {
                                AuthorArticleCard(
                                    dto = dto,
                                    onOpen = { state.go(Route.Article(dto.id)) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(Color.White)
            .padding(horizontal = 18.dp, vertical = 16.dp),
    ) {
        Text(value, style = displayStyle(28, 800, 1f, -0.02f))
        Text(label, style = sansStyle(12, 500, 1.4f, color = Muted))
    }
}

@Composable
private fun AuthorArticleCard(dto: LibArticleDto, onOpen: () -> Unit) {
    val state = LocalApp.current
    val article = dto.toArticle(state.lib.uid)
    ArticleCard(
        article = article,
        comments = dto.commentsCount,
        onOpen = onOpen,
        onAuthor = null,
    )
}
