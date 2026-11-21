package ac.id.untidar.karsa.groups

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import ac.id.untidar.karsa.auth.AuthController
import ac.id.untidar.karsa.data.Course
import ac.id.untidar.karsa.data.Msg
import ac.id.untidar.karsa.net.friendlyError
import ac.id.untidar.karsa.ui.LoadStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class ChatRoomState(val id: String) {
    var course by mutableStateOf<Course?>(null)
    var messages by mutableStateOf<List<Msg>>(emptyList())
    var pinned by mutableStateOf<List<Msg>>(emptyList())
    var status by mutableStateOf(LoadStatus.Loading)
    var isManager by mutableStateOf(false)
    var isLocked by mutableStateOf(false)
    var nextCursor by mutableStateOf<String?>(null)
    var loadingOlder by mutableStateOf(false)
    var refreshing by mutableStateOf(false)
    var sending by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    internal var lastSendPayload: String? = null
    internal var lastSendKey: String? = null
}

class GroupController(private val auth: AuthController) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val chats = mutableMapOf<String, ChatRoomState>()
    private var session = 0

    var rooms by mutableStateOf<List<GroupRoom>>(emptyList())
        private set
    var listStatus by mutableStateOf(LoadStatus.Loading)
        private set
    var listError by mutableStateOf<String?>(null)
        private set

    fun reset() {
        session++
        rooms = emptyList()
        chats.clear()
        listStatus = LoadStatus.Loading
        listError = null
    }

    fun loadRooms() {
        val generation = session
        scope.launch {
            listStatus = LoadStatus.Loading
            try {
                val loaded = auth.api.groups().mapIndexed { index, dto -> dto.toRoom(index) }
                if (generation != session) return@launch
                rooms = loaded
                listStatus = LoadStatus.Ready
                listError = null
                loaded.forEach { room ->
                    chats[room.dto.id]?.let { chat ->
                        chat.course = room.course
                        chat.isManager = room.dto.isManager
                        chat.isLocked = room.dto.isLocked
                    }
                }
            } catch (failure: Exception) {
                if (generation != session) return@launch
                listStatus = LoadStatus.Error
                listError = friendlyError(failure)
            }
        }
    }

    fun chat(id: String): ChatRoomState = chats.getOrPut(id) {
        ChatRoomState(id).also { state ->
            rooms.firstOrNull { it.dto.id == id }?.let { room ->
                state.course = room.course
                state.isManager = room.dto.isManager
                state.isLocked = room.dto.isLocked
            }
        }
    }

    fun loadInitial(id: String) {
        val chat = chat(id)
        val generation = session
        scope.launch {
            chat.status = LoadStatus.Loading
            chat.error = null
            try {
                val page = auth.api.groupMessages(id)
                if (generation != session) return@launch
                applyPage(chat, page, replace = true)
                chat.status = LoadStatus.Ready
                rooms.firstOrNull { it.dto.id == id }?.let { room ->
                    chat.course = room.course.copy(
                        locked = page.group.isLocked,
                        pjMe = page.group.isManager,
                    )
                }
                chat.messages.lastOrNull()?.let { updateRoomPreview(id, it, force = true) }
            } catch (failure: Exception) {
                if (generation != session) return@launch
                chat.status = LoadStatus.Error
                chat.error = friendlyError(failure)
            }
        }
    }

    fun refresh(id: String, silent: Boolean = false) {
        val chat = chat(id)
        if (chat.refreshing) return
        val generation = session
        scope.launch {
            chat.refreshing = true
            try {
                val page = auth.api.groupMessages(id)
                if (generation != session) return@launch
                val oldest = chat.messages.firstOrNull()?.id
                val previousCursor = chat.nextCursor
                var merged = merge(chat.messages, page.messages.map { it.toMsg() })
                var cursor = page.nextCursor
                var guard = 0
                while (oldest != null && merged.none { it.id == oldest } && cursor != null && guard < 5) {
                    val older = auth.api.groupMessages(id, cursor)
                    merged = merge(older.messages.map { it.toMsg() }, merged)
                    cursor = older.nextCursor
                    guard++
                }
                chat.messages = merged
                chat.pinned = page.pinnedMessages.map { it.toMsg() }
                chat.isManager = page.group.isManager
                chat.isLocked = page.group.isLocked
                chat.nextCursor = if (oldest != null && merged.any { it.id == oldest }) {
                    previousCursor
                } else {
                    cursor
                }
                chat.course = chat.course?.copy(
                    locked = page.group.isLocked,
                    pjMe = page.group.isManager,
                )
                chat.status = LoadStatus.Ready
                chat.error = null
                chat.messages.lastOrNull()?.let { updateRoomPreview(id, it, force = true) }
            } catch (failure: Exception) {
                if (generation != session) return@launch
                if (!silent) chat.error = friendlyError(failure)
            } finally {
                if (generation == session) chat.refreshing = false
            }
        }
    }

    fun loadOlder(id: String) {
        val chat = chat(id)
        val cursor = chat.nextCursor ?: return
        if (chat.loadingOlder) return
        val generation = session
        scope.launch {
            chat.loadingOlder = true
            try {
                val page = auth.api.groupMessages(id, cursor)
                if (generation != session) return@launch
                chat.messages = merge(page.messages.map { it.toMsg() }, chat.messages)
                chat.nextCursor = page.nextCursor
            } catch (failure: Exception) {
                if (generation == session) chat.error = friendlyError(failure)
            } finally {
                if (generation == session) chat.loadingOlder = false
            }
        }
    }

    suspend fun send(id: String, text: String, replyToId: String?) {
        val chat = chat(id)
        if (chat.sending) return
        val payload = "$text|$replyToId"
        if (chat.lastSendPayload != payload || chat.lastSendKey == null) {
            chat.lastSendPayload = payload
            chat.lastSendKey = UUID.randomUUID().toString()
        }
        chat.sending = true
        try {
            val dto = auth.api.sendGroupMessage(id, text, chat.lastSendKey!!, replyToId)
            val message = dto.toMsg()
            chat.messages = merge(chat.messages.filterNot { it.id == message.id }, listOf(message))
            if (message.pinned) {
                chat.pinned = (chat.pinned.filterNot { it.id == message.id } + message)
            }
            chat.lastSendKey = null
            chat.lastSendPayload = null
            updateRoomPreview(id, message, force = true)
        } finally {
            chat.sending = false
        }
    }

    suspend fun edit(id: String, messageId: String, text: String) {
        val dto = auth.api.editGroupMessage(id, messageId, text)
        replaceMessage(id, dto.toMsg())
    }

    suspend fun delete(id: String, messageId: String) {
        val dto = auth.api.deleteGroupMessage(id, messageId)
        val chat = chat(id)
        chat.pinned = chat.pinned.filterNot { it.id == messageId }
        replaceMessage(id, dto.toMsg())
    }

    suspend fun pin(id: String, messageId: String, pinned: Boolean) {
        val dto = auth.api.pinGroupMessage(id, messageId, pinned)
        val message = dto.toMsg()
        replaceMessage(id, message)
        val chat = chat(id)
        chat.pinned = if (pinned) {
            (chat.pinned.filterNot { it.id == message.id } + message)
        } else {
            chat.pinned.filterNot { it.id == message.id }
        }
    }

    suspend fun hide(id: String, messageId: String, reason: String) {
        val dto = auth.api.hideGroupMessage(id, messageId, hidden = true, reason = reason)
        val chat = chat(id)
        chat.pinned = chat.pinned.filterNot { it.id == messageId }
        replaceMessage(id, dto.toMsg())
    }

    suspend fun report(id: String, messageId: String, reason: String, details: String?): Boolean {
        val autoHidden = auth.api.reportGroupMessage(id, messageId, reason, details)
        if (autoHidden) refresh(id, silent = true)
        return autoHidden
    }

    suspend fun block(id: String, userId: String, blocked: Boolean) {
        auth.api.setGroupBlock(userId, blocked)
        refresh(id, silent = true)
    }

    suspend fun lock(id: String, locked: Boolean) {
        auth.api.lockGroup(id, locked)
        val chat = chat(id)
        chat.isLocked = locked
        chat.course = chat.course?.copy(locked = locked)
        rooms = rooms.map { room ->
            if (room.dto.id == id) {
                room.copy(dto = room.dto.copy(isLocked = locked), course = room.course.copy(locked = locked))
            } else {
                room
            }
        }
    }

    suspend fun reports(id: String): List<GroupReportDto> = auth.api.groupReports(id)

    suspend fun resolveReport(id: String, reportId: String, action: String) {
        auth.api.resolveGroupReport(id, reportId, action)
        if (action == "HIDE" || action == "DISMISS") refresh(id, silent = true)
    }

    private fun replaceMessage(id: String, message: Msg) {
        val chat = chat(id)
        chat.messages = chat.messages.map { if (it.id == message.id) message else it }
        chat.pinned = chat.pinned.map { if (it.id == message.id) message else it }
            .filter { it.pinned && !it.deleted }
        updateRoomPreview(id, message, force = false)
    }

    private fun applyPage(chat: ChatRoomState, page: GroupMessagePageDto, replace: Boolean) {
        val messages = page.messages.map { it.toMsg() }
        chat.messages = if (replace) messages else merge(chat.messages, messages)
        chat.pinned = page.pinnedMessages.map { it.toMsg() }
        chat.isManager = page.group.isManager
        chat.isLocked = page.group.isLocked
        chat.nextCursor = page.nextCursor
    }

    private fun merge(first: List<Msg>, second: List<Msg>): List<Msg> {
        val seen = LinkedHashMap<String, Msg>()
        (first + second).forEach { msg -> seen[msg.id] = msg }
        return seen.values.sortedWith(
            compareBy<Msg> { it.ts }.thenBy { it.id },
        )
    }

    private fun updateRoomPreview(id: String, message: Msg, force: Boolean) {
        rooms = rooms.map { room ->
            if (room.dto.id != id) return@map room
            val lastId = room.dto.lastMessage?.id
            if (!force && lastId != null && lastId != message.id) return@map room
            room.copy(
                dto = room.dto.copy(lastMessage = message.toPreviewDto()),
                preview = message.toGroupPreview(),
            )
        }
    }
}
