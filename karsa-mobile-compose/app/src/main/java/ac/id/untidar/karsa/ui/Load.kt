package ac.id.untidar.karsa.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay

class LoadController(val status: LoadStatus, val retry: () -> Unit)

/** Mirrors the prototype's `useLoad`: brief skeleton on entry, retry restarts it. */
@Composable
fun rememberLoad(delayMillis: Long = 650): LoadController {
    var status by remember { mutableStateOf(LoadStatus.Loading) }
    var attempt by remember { mutableIntStateOf(0) }
    LaunchedEffect(attempt) {
        status = LoadStatus.Loading
        delay(delayMillis)
        status = LoadStatus.Ready
    }
    return LoadController(status = status, retry = { attempt += 1 })
}
