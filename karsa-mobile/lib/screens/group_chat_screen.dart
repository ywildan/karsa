import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'group_reports_screen.dart';

class GroupChatScreen extends StatefulWidget {
  const GroupChatScreen({required this.api, required this.group, super.key});
  final ApiClient api;
  final GroupSummary group;

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  final List<GroupMessageItem> _messages = [];
  List<GroupMessageItem> _pinnedMessages = [];
  Timer? _pollTimer;
  String? _nextCursor;
  GroupMessageItem? _replyTo;
  Object? _error;
  bool _loading = true;
  bool _loadingOlder = false;
  bool _sending = false;
  late bool _isManager;
  late bool _isLocked;

  @override
  void initState() {
    super.initState();
    _isManager = widget.group.isManager;
    _isLocked = widget.group.isLocked;
    _loadInitial();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 12),
      (_) => _refreshLatest(silent: true),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await widget.api.groupMessages(widget.group.id);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(page.messages);
        _pinnedMessages = page.pinnedMessages;
        _nextCursor = page.nextCursor;
        _isManager = page.isManager;
        _isLocked = page.isLocked;
      });
      _jumpToBottom();
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshLatest({bool silent = false}) async {
    if (_loading || _sending) return;
    try {
      final page = await widget.api.groupMessages(widget.group.id);
      if (!mounted) return;
      final byId = {for (final message in _messages) message.id: message};
      for (final message in page.messages) {
        byId[message.id] = message;
      }
      final merged = byId.values.toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      setState(() {
        _messages
          ..clear()
          ..addAll(merged);
        _pinnedMessages = page.pinnedMessages;
        _isManager = page.isManager;
        _isLocked = page.isLocked;
      });
    } catch (error) {
      if (!silent && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(error))),
        );
      }
    }
  }

  Future<void> _loadOlder() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingOlder) return;
    setState(() => _loadingOlder = true);
    try {
      final page = await widget.api.groupMessages(widget.group.id, cursor: cursor);
      if (!mounted) return;
      final existing = _messages.map((item) => item.id).toSet();
      setState(() {
        _messages.insertAll(
          0,
          page.messages.where((item) => !existing.contains(item.id)),
        );
        _nextCursor = page.nextCursor;
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  String _idempotencyKey() {
    final random = Random.secure();
    return '${DateTime.now().microsecondsSinceEpoch}-${random.nextInt(1 << 32)}';
  }

  Future<void> _send() async {
    final text = _composer.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final message = await widget.api.sendGroupMessage(
        assignmentId: widget.group.id,
        text: text,
        idempotencyKey: _idempotencyKey(),
        replyToId: _replyTo?.id,
      );
      if (!mounted) return;
      setState(() {
        _messages.removeWhere((item) => item.id == message.id);
        _messages.add(message);
        _composer.clear();
        _replyTo = null;
      });
      _jumpToBottom();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _replace(GroupMessageItem message) {
    final index = _messages.indexWhere((item) => item.id == message.id);
    setState(() {
      if (index >= 0) _messages[index] = message;
      _pinnedMessages.removeWhere((item) => item.id == message.id);
      if (message.isPinned && message.state == 'active') {
        _pinnedMessages.insert(0, message);
        if (_pinnedMessages.length > 10) {
          _pinnedMessages = _pinnedMessages.take(10).toList();
        }
      }
    });
  }

  void _jumpToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleLock() async {
    try {
      await widget.api.lockGroup(widget.group.id, !_isLocked);
      if (mounted) setState(() => _isLocked = !_isLocked);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(error))),
        );
      }
    }
  }

  Future<void> _edit(GroupMessageItem message) async {
    final controller = TextEditingController(text: message.text);
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit pesan'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 2000,
          minLines: 2,
          maxLines: 6,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (text == null || text.isEmpty || text == message.text) return;
    try {
      _replace(await widget.api.editGroupMessage(widget.group.id, message.id, text));
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _delete(GroupMessageItem message) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus pesan?'),
        content: const Text('Pesan akan menjadi penanda “telah dihapus”.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus')),
        ],
      ),
    );
    if (approved != true) return;
    try {
      _replace(await widget.api.deleteGroupMessage(widget.group.id, message.id));
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _togglePin(GroupMessageItem message) async {
    try {
      _replace(await widget.api.pinGroupMessage(
        widget.group.id,
        message.id,
        !message.isPinned,
      ));
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _hide(GroupMessageItem message) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sembunyikan pesan'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 120,
          decoration: const InputDecoration(labelText: 'Alasan'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Sembunyikan'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null || reason.isEmpty) return;
    try {
      _replace(await widget.api.hideGroupMessage(
        widget.group.id,
        message.id,
        hidden: true,
        reason: reason,
      ));
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _report(GroupMessageItem message) async {
    const labels = {
      'SPAM': 'Spam',
      'HARASSMENT': 'Pelecehan atau perundungan',
      'INAPPROPRIATE': 'Konten tidak pantas',
      'MISINFORMATION': 'Informasi menyesatkan',
      'OTHER': 'Lainnya',
    };
    var reason = 'SPAM';
    final details = TextEditingController();
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Laporkan pesan'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: reason,
                items: labels.entries
                    .map((item) => DropdownMenuItem(value: item.key, child: Text(item.value)))
                    .toList(),
                onChanged: (value) => setDialogState(() => reason = value ?? reason),
                decoration: const InputDecoration(labelText: 'Alasan'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: details,
                maxLength: 500,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Keterangan opsional'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Kirim laporan')),
          ],
        ),
      ),
    );
    final note = details.text.trim();
    details.dispose();
    if (approved != true) return;
    try {
      final hidden = await widget.api.reportGroupMessage(
        widget.group.id,
        message.id,
        reason: reason,
        details: note.isEmpty ? null : note,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(hidden ? 'Laporan dikirim dan pesan disembunyikan.' : 'Laporan dikirim.')),
      );
      if (hidden) await _refreshLatest();
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _block(GroupMessageItem message) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Blokir ${message.author.name}?'),
        content: const Text('Pesannya akan disamarkan untukmu. Kamu tetap dapat membuka placeholder bila diperlukan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Blokir')),
        ],
      ),
    );
    if (approved != true) return;
    try {
      await widget.api.setGroupBlock(message.author.id, true);
      await _refreshLatest();
    } catch (error) {
      _showError(error);
    }
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(friendlyError(error))),
    );
  }

  Future<void> _showActions(GroupMessageItem message) async {
    if (message.state != 'active') return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.reply_rounded),
              title: const Text('Balas'),
              onTap: () {
                Navigator.pop(context);
                setState(() => _replyTo = message);
              },
            ),
            if (message.canEdit)
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Edit'),
                onTap: () {
                  Navigator.pop(context);
                  _edit(message);
                },
              ),
            if (message.canDelete)
              ListTile(
                leading: const Icon(Icons.delete_outline_rounded),
                title: const Text('Hapus'),
                onTap: () {
                  Navigator.pop(context);
                  _delete(message);
                },
              ),
            if (_isManager)
              ListTile(
                leading: Icon(message.isPinned ? Icons.push_pin : Icons.push_pin_outlined),
                title: Text(message.isPinned ? 'Lepas pin' : 'Pin pesan'),
                onTap: () {
                  Navigator.pop(context);
                  _togglePin(message);
                },
              ),
            if (_isManager && !message.isOwn)
              ListTile(
                leading: const Icon(Icons.visibility_off_outlined),
                title: const Text('Sembunyikan sebagai PJ'),
                onTap: () {
                  Navigator.pop(context);
                  _hide(message);
                },
              ),
            if (!message.isOwn) ...[
              ListTile(
                leading: const Icon(Icons.flag_outlined),
                title: const Text('Laporkan'),
                onTap: () {
                  Navigator.pop(context);
                  _report(message);
                },
              ),
              ListTile(
                leading: const Icon(Icons.block_outlined),
                title: Text('Blokir ${message.author.name}'),
                onTap: () {
                  Navigator.pop(context);
                  _block(message);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.group.courseName, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(
                '${widget.group.memberCount} anggota · PJ ${widget.group.manager.name}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
          actions: [
            if (_isManager)
              IconButton(
                tooltip: 'Laporan grup',
                icon: const Icon(Icons.flag_outlined),
                onPressed: () => Navigator.of(context).push<void>(
                  MaterialPageRoute(
                    builder: (_) => GroupReportsScreen(
                      api: widget.api,
                      assignmentId: widget.group.id,
                    ),
                  ),
                ),
              ),
            if (_isManager)
              IconButton(
                tooltip: _isLocked ? 'Buka grup' : 'Kunci grup',
                onPressed: _toggleLock,
                icon: Icon(_isLocked ? Icons.lock_rounded : Icons.lock_open_rounded),
              ),
          ],
        ),
        body: Column(
          children: [
            if (_pinnedMessages.isNotEmpty)
              _PinnedMessagesStrip(messages: _pinnedMessages),
            if (_isManager &&
                !_loading &&
                _messages.isNotEmpty &&
                _pinnedMessages.isEmpty)
              const _PinHint(),
            Expanded(child: _body()),
            if (_replyTo != null) _ReplyComposer(message: _replyTo!, onClose: () => setState(() => _replyTo = null)),
            _composerBar(),
          ],
        ),
      );

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return ErrorState(message: friendlyError(_error!), onRetry: _loadInitial);
    if (_messages.isEmpty) {
      return const EmptyState(
        title: 'Mulai percakapan',
        message: 'Kirim pesan pertama untuk grup mata kuliah ini.',
        icon: Icons.chat_bubble_outline_rounded,
      );
    }
    return RefreshIndicator(
      onRefresh: () => _refreshLatest(),
      child: ListView.builder(
        controller: _scroll,
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
        itemCount: _messages.length + (_nextCursor == null ? 0 : 1),
        itemBuilder: (context, index) {
          if (_nextCursor != null && index == 0) {
            return Center(
              child: TextButton.icon(
                onPressed: _loadingOlder ? null : _loadOlder,
                icon: _loadingOlder
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.expand_less_rounded),
                label: const Text('Muat pesan sebelumnya'),
              ),
            );
          }
          final offset = _nextCursor == null ? 0 : 1;
          final message = _messages[index - offset];
          return _MessageBubble(message: message, onLongPress: () => _showActions(message));
        },
      ),
    );
  }

  Widget _composerBar() {
    final disabled = _isLocked && !_isManager;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _composer,
                enabled: !disabled && !_sending,
                maxLength: 2000,
                minLines: 1,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: disabled ? 'Grup dikunci oleh PJ' : 'Tulis pesan',
                  counterText: '',
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Kirim',
              onPressed: disabled || _sending ? null : _send,
              icon: _sending
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReplyComposer extends StatelessWidget {
  const _ReplyComposer({required this.message, required this.onClose});
  final GroupMessageItem message;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(12, 6, 12, 0),
        padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                'Membalas ${message.author.name}: ${message.text ?? ''}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            IconButton(onPressed: onClose, icon: const Icon(Icons.close_rounded)),
          ],
        ),
      );
}

class _PinnedMessagesStrip extends StatelessWidget {
  const _PinnedMessagesStrip({required this.messages});
  final List<GroupMessageItem> messages;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.push_pin_rounded, size: 15, color: colors.primary),
              const SizedBox(width: 6),
              Text(
                'Pesan disematkan',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: colors.primary,
                    ),
              ),
              const SizedBox(width: 6),
              Text('${messages.length}', style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 66,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: messages.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final message = messages[index];
                final preview = message.state == 'active'
                    ? message.text ?? ''
                    : 'Pesan dari pengguna yang diblokir';
                return SizedBox(
                  width: 250,
                  child: Card(
                    margin: EdgeInsets.zero,
                    color: colors.surfaceContainerLow,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message.author.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PinHint extends StatelessWidget {
  const _PinHint();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 2),
      child: Row(
        children: [
          Icon(Icons.push_pin_outlined, size: 16, color: colors.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(
            'Tekan lama pesan untuk menyematkannya.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.onLongPress});
  final GroupMessageItem message;
  final VoidCallback onLongPress;

  String get _content => switch (message.state) {
        'deleted' => 'Pesan telah dihapus',
        'hidden' => message.hiddenReason ?? 'Pesan disembunyikan oleh PJ',
        'blocked' => 'Pesan dari pengguna yang kamu blokir',
        _ => message.text ?? '',
      };

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final muted = message.state != 'active';
    return Align(
      alignment: message.isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 330),
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: message.isOwn ? colors.primaryContainer : Colors.white,
            border: Border.all(color: const Color(0xFFF0E7DE)),
            borderRadius: BorderRadius.circular(16).copyWith(
              bottomRight: message.isOwn ? const Radius.circular(4) : null,
              bottomLeft: message.isOwn ? null : const Radius.circular(4),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      message.author.name,
                      style: TextStyle(fontWeight: FontWeight.w800, color: colors.primary),
                    ),
                  ),
                  if (message.author.isGroupManager) ...[
                    const SizedBox(width: 6),
                    const Icon(Icons.verified_rounded, size: 15),
                  ],
                  if (message.isPinned) ...[
                    const SizedBox(width: 6),
                    const Icon(Icons.push_pin_rounded, size: 14),
                  ],
                ],
              ),
              if (message.replyTo != null) ...[
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerHighest.withValues(alpha: .7),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${message.replyTo!.author.name}: ${message.replyTo!.text ?? 'Pesan tidak tersedia'}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                _content,
                style: TextStyle(fontStyle: muted ? FontStyle.italic : null),
              ),
              const SizedBox(height: 5),
              Text(
                '${formatDate(message.createdAt)}${message.editedAt == null ? '' : ' · diedit'}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
