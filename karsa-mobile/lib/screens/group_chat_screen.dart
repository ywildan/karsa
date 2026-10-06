import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../core/pending_submission.dart';
import '../widgets/common.dart';
import 'group_reports_screen.dart';

class GroupChatScreen extends StatefulWidget {
  const GroupChatScreen({required this.api, required this.group, super.key});
  final ApiClient api;
  final GroupSummary group;

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  final _composer = TextEditingController();
  final _composerFocus = FocusNode();
  final _scroll = ScrollController();
  final _stageKey = GlobalKey();
  final _chatViewportKey = GlobalKey();
  final _sendButtonKey = GlobalKey();
  final _submission = PendingSubmission();
  final Map<String, GlobalKey> _messageKeys = {};
  final Set<String> _justSentMessageIds = {};
  final Set<String> _incomingMessageIds = {};
  late final AnimationController _sendFlightController;
  String? _flyingText;
  Offset _flightStart = Offset.zero;
  Offset _flightEnd = Offset.zero;
  double _flightWidth = 0;
  bool _nearBottom = true;
  bool _hasNewMessages = false;
  bool _locking = false;
  final List<GroupMessageItem> _messages = [];
  List<GroupMessageItem> _pinnedMessages = [];
  static bool _pinHintShown = false;
  String? _highlightedMessageId;
  Timer? _highlightTimer;
  Timer? _pollTimer;
  String? _nextCursor;
  GroupMessageItem? _replyTo;
  Object? _error;
  bool _loading = true;
  bool _loadingOlder = false;
  bool _sending = false;
  Future<void>? _refreshInFlight;
  late bool _isManager;
  late bool _isLocked;

  @override
  void initState() {
    super.initState();
    _sendFlightController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    WidgetsBinding.instance.addObserver(this);
    _scroll.addListener(_trackScroll);
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
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _highlightTimer?.cancel();
    _scroll.removeListener(_trackScroll);
    _composer.dispose();
    _composerFocus.dispose();
    _scroll.dispose();
    _sendFlightController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _pollTimer?.cancel();
    if (state == AppLifecycleState.resumed) {
      _refreshLatest(silent: true);
      _pollTimer = Timer.periodic(
        const Duration(seconds: 12),
        (_) => _refreshLatest(silent: true),
      );
    }
  }

  void _trackScroll() {
    if (!_scroll.hasClients) return;
    final near = _scroll.position.extentAfter < 120;
    if (near == _nearBottom && !(near && _hasNewMessages)) return;
    setState(() {
      _nearBottom = near;
      if (near) _hasNewMessages = false;
    });
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
        _pruneMessageKeys();
        _pinnedMessages = page.pinnedMessages;
        _nextCursor = page.nextCursor;
        _isManager = page.isManager;
        _isLocked = page.isLocked;
      });
      _jumpToBottom();
      _maybeShowPinHint();
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _maybeShowPinHint() {
    if (!_isManager || _messages.isEmpty || _pinnedMessages.isNotEmpty ||
        _pinHintShown) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _pinHintShown || !_isManager ||
          _pinnedMessages.isNotEmpty) return;
      _pinHintShown = true;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Tekan lama pesan untuk menyematkannya.'),
        duration: Duration(seconds: 4),
      ));
    });
  }

  Future<void> _openPinnedMessage(GroupMessageItem selected) async {
    final matches = _pinnedMessages.where((item) => item.id == selected.id);
    if (matches.isEmpty || !mounted) return;
    final message = matches.first;
    final target = _messageKeys[message.id]?.currentContext;
    if (target == null) {
      await _showMessageDetail(message);
      return;
    }
    _highlightTimer?.cancel();
    setState(() => _highlightedMessageId = message.id);
    _highlightTimer = Timer(const Duration(milliseconds: 1600), () {
      if (mounted) setState(() => _highlightedMessageId = null);
    });
    await Scrollable.ensureVisible(
      target,
      alignment: .4,
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero : const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _showPinnedMessages() async {
    final pins = List<GroupMessageItem>.of(_pinnedMessages);
    if (pins.isEmpty) return;
    final selected = await showModalBottomSheet<GroupMessageItem>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => FractionallySizedBox(
        heightFactor: .65,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Row(children: [
              Icon(Icons.push_pin_rounded,
                  color: Theme.of(sheetContext).colorScheme.primary, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text('Pesan disematkan',
                  style: Theme.of(sheetContext).textTheme.titleMedium)),
              Text('${pins.length}'),
            ]),
          ),
          Expanded(child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
            itemCount: pins.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (_, index) {
              final message = pins[index];
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                title: Text(message.author.name, maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_pinnedMessagePreview(message), maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Text(formatDate(message.createdAt),
                        style: Theme.of(sheetContext).textTheme.labelSmall),
                  ],
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => Navigator.of(sheetContext).pop(message),
              );
            },
          )),
        ]),
      ),
    );
    if (mounted && selected != null) await _openPinnedMessage(selected);
  }

  Future<void> _refreshLatest({bool silent = false}) async {
    if (_loading || _sending || _loadingOlder) return;
    final active = _refreshInFlight;
    if (active != null) {
      if (silent) return;
      await active;
      if (!mounted) return;
    }
    final refresh = _refreshLoadedMessages(silent: silent);
    _refreshInFlight = refresh;
    try {
      await refresh;
    } finally {
      if (identical(_refreshInFlight, refresh)) _refreshInFlight = null;
    }
  }

  Future<void> _refreshLoadedMessages({required bool silent}) async {
    try {
      final page = await widget.api.refreshGroupMessages(
        widget.group.id,
        oldestMessageId: _messages.isEmpty ? null : _messages.first.id,
      );
      if (!mounted) return;
      final byId = {for (final message in _messages) message.id: message};
      for (final message in page.messages) {
        if (!byId.containsKey(message.id) &&
            !message.isOwn &&
            message.state == 'active') {
          _incomingMessageIds.add(message.id);
          Future<void>.delayed(const Duration(milliseconds: 300), () {
            _incomingMessageIds.remove(message.id);
          });
        }
      }
      for (final message in page.messages) {
        byId[message.id] = message;
      }
      final previousIndex = <String, int>{
        for (var i = 0; i < _messages.length; i += 1) _messages[i].id: i,
      };
      final merged = byId.values.toList()
        ..sort((a, b) {
          final byTime = a.createdAt.compareTo(b.createdAt);
          if (byTime != 0) return byTime;
          // Pesan dengan timestamp sama menjaga urutan aslinya supaya
          // balon tidak bertukar posisi saat polling.
          return (previousIndex[a.id] ?? previousIndex.length) -
              (previousIndex[b.id] ?? previousIndex.length);
        });
      final oldNewest = _messages.isEmpty ? null : _messages.last.id;
      final hasNew = merged.isNotEmpty && merged.last.id != oldNewest;
      final follow = _nearBottom;
      setState(() {
        _messages
          ..clear()
          ..addAll(merged);
        _pruneMessageKeys();
        // Refresh background yang sukses membuktikan grup kembali
        // terjangkau; jangan biarkan ErrorState lama bertahan.
        _error = null;
        if (hasNew && !follow) _hasNewMessages = true;
        _pinnedMessages = page.pinnedMessages;
        _nextCursor = page.nextCursor;
        _isManager = page.isManager;
        _isLocked = page.isLocked;
      });
      if (hasNew && follow) _jumpToBottom();
    } catch (error) {
      if (!silent && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyError(error))));
      }
    }
  }

  Future<void> _loadOlder() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingOlder || _refreshInFlight != null) return;
    setState(() => _loadingOlder = true);
    try {
      final page = await widget.api.groupMessages(
        widget.group.id,
        cursor: cursor,
      );
      if (!mounted) return;
      final oldExtent = _scroll.hasClients
          ? _scroll.position.maxScrollExtent
          : 0.0;
      final oldOffset = _scroll.hasClients ? _scroll.offset : 0.0;
      final existing = _messages.map((item) => item.id).toSet();
      setState(() {
        _messages.insertAll(
          0,
          page.messages.where((item) => !existing.contains(item.id)),
        );
        _nextCursor = page.nextCursor;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_scroll.hasClients) return;
        final offset = oldOffset + _scroll.position.maxScrollExtent - oldExtent;
        _scroll.jumpTo(offset.clamp(0.0, _scroll.position.maxScrollExtent));
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyError(error))));
      }
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  void _startSendFlight(String text) {
    if (MediaQuery.disableAnimationsOf(context)) return;
    final stage = _stageKey.currentContext?.findRenderObject();
    final button = _sendButtonKey.currentContext?.findRenderObject();
    final viewport = _chatViewportKey.currentContext?.findRenderObject();
    if (stage is! RenderBox || button is! RenderBox || viewport is! RenderBox)
      return;

    final previewWidth = stage.size.width * .62;
    final maxWidth = previewWidth > 230 ? 230.0 : previewWidth;
    final textPainter = TextPainter(
      text: TextSpan(text: text, style: DefaultTextStyle.of(context).style),
      textDirection: Directionality.of(context),
      maxLines: 2,
      ellipsis: '…',
    )..layout(maxWidth: maxWidth - 20);
    final width = textPainter.width + 20;
    final height = textPainter.height + 16;
    textPainter.dispose();
    final buttonCenter = button.localToGlobal(
      button.size.center(Offset.zero),
      ancestor: stage,
    );
    final chatBottom = viewport
        .localToGlobal(Offset(0, viewport.size.height), ancestor: stage)
        .dy;
    setState(() {
      _flyingText = text;
      _flightWidth = width;
      _flightStart = Offset(
        buttonCenter.dx - width * .68,
        buttonCenter.dy - height / 2,
      );
      _flightEnd = Offset(
        stage.size.width - width - 16,
        chatBottom - height - 10,
      );
    });
    _sendFlightController.forward(from: 0);
  }

  Future<void> _send() async {
    final draft = _composer.text;
    final text = draft.trim();
    if (text.isEmpty || _sending) return;
    _composerFocus.requestFocus();
    _startSendFlight(text);
    setState(() => _sending = true);
    try {
      final message = await widget.api.sendGroupMessage(
        assignmentId: widget.group.id,
        text: text,
        idempotencyKey: _submission.keyFor({
          'assignment': widget.group.id,
          'text': text,
          'reply_to': _replyTo?.id,
        }),
        replyToId: _replyTo?.id,
      );
      _submission.complete();
      if (!mounted) return;
      if (_flyingText != null && _sendFlightController.isAnimating) {
        try {
          await _sendFlightController.forward().orCancel;
        } catch (_) {
          return;
        }
        if (!mounted) return;
      }
      _sendFlightController.stop();
      _justSentMessageIds.add(message.id);
      Future<void>.delayed(const Duration(milliseconds: 300), () {
        _justSentMessageIds.remove(message.id);
      });
      setState(() {
        _messages.removeWhere((item) => item.id == message.id);
        _messages.add(message);
        _pruneMessageKeys();
        // Jangan hapus pesan baru yang diketik selagi pengiriman berlangsung.
        if (_composer.text == draft) {
          _composer.clear();
        } else if (_composer.text.startsWith(draft)) {
          final nextDraft = _composer.text.substring(draft.length);
          _composer.value = TextEditingValue(
            text: nextDraft,
            selection: TextSelection.collapsed(offset: nextDraft.length),
          );
        }
        _replyTo = null;
        _flyingText = null;
      });
      _jumpToBottom();
    } catch (error) {
      if (mounted) {
        _sendFlightController.stop();
        setState(() => _flyingText = null);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyError(error))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Buang GlobalKey milik pesan yang sudah tidak ada di daftar,
  /// sehingga peta kunci tidak membesar tanpa batas saat sesi panjang.
  void _pruneMessageKeys() {
    final ids = _messages.map((message) => message.id).toSet();
    _messageKeys.removeWhere((id, _) => !ids.contains(id));
  }

  void _replace(GroupMessageItem message) {
    // Semua pemanggil datang dari await request; user bisa saja menekan
    // tombol back selagi permintaan masih berjalan.
    if (!mounted) return;
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
    _hasNewMessages = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleLock() async {
    if (_locking) return;
    setState(() => _locking = true);
    try {
      await widget.api.lockGroup(widget.group.id, !_isLocked);
      if (mounted) setState(() => _isLocked = !_isLocked);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyError(error))));
      }
    } finally {
      if (mounted) setState(() => _locking = false);
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
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
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
      _replace(
        await widget.api.editGroupMessage(widget.group.id, message.id, text),
      );
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
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (approved != true) return;
    try {
      _replace(
        await widget.api.deleteGroupMessage(widget.group.id, message.id),
      );
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _togglePin(GroupMessageItem message) async {
    try {
      _replace(
        await widget.api.pinGroupMessage(
          widget.group.id,
          message.id,
          !message.isPinned,
        ),
      );
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
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
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
      _replace(
        await widget.api.hideGroupMessage(
          widget.group.id,
          message.id,
          hidden: true,
          reason: reason,
        ),
      );
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
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.key,
                        child: Text(item.value),
                      ),
                    )
                    .toList(),
                onChanged: (value) =>
                    setDialogState(() => reason = value ?? reason),
                decoration: const InputDecoration(labelText: 'Alasan'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: details,
                maxLength: 500,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Keterangan opsional',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Kirim laporan'),
            ),
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
        SnackBar(
          content: Text(
            hidden
                ? 'Laporan dikirim dan pesan disembunyikan.'
                : 'Laporan dikirim.',
          ),
        ),
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
        content: const Text(
          'Pesannya akan disamarkan untukmu. Kamu tetap dapat membuka placeholder bila diperlukan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Blokir'),
          ),
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

  Future<void> _unblock(GroupMessageItem message) async {
    try {
      await widget.api.setGroupBlock(message.author.id, false);
      await _refreshLatest();
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _showMessageDetail(GroupMessageItem message) async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.author.name,
                style: Theme.of(sheetContext).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                formatDate(message.createdAt),
                style: const TextStyle(fontSize: 12, color: KarsaColors.muted),
              ),
              const SizedBox(height: 16),
              SelectableText(
                message.state == 'active'
                    ? message.text ?? ''
                    : 'Pesan tidak tersedia.',
                style: const TextStyle(fontSize: 16, height: 1.6),
              ),
              if (_messageKeys[message.id]?.currentContext != null) ...[
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    final target = _messageKeys[message.id]?.currentContext;
                    if (target != null)
                      Scrollable.ensureVisible(
                        target,
                        duration: MediaQuery.disableAnimationsOf(context)
                            ? Duration.zero
                            : const Duration(milliseconds: 240),
                      );
                  },
                  icon: const Icon(Icons.arrow_downward_rounded),
                  label: const Text('Lihat di percakapan'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openReply(GroupReply reply) async {
    final match = _messages.where((item) => item.id == reply.id);
    if (match.isNotEmpty) {
      await _showMessageDetail(match.first);
    } else {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reply.author.name,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 14),
                SelectableText(
                  reply.state == 'active'
                      ? reply.text ?? ''
                      : 'Pesan tidak tersedia.',
                  style: const TextStyle(fontSize: 16, height: 1.6),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(friendlyError(error))));
  }

  Future<void> _showActions(GroupMessageItem message) async {
    if (message.state == 'blocked') {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Buka blokir ${message.author.name}?'),
          content: const Text(
            'Pesan dari pengguna ini akan kembali terlihat di grup.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Buka blokir'),
            ),
          ],
        ),
      );
      if (confirmed == true) await _unblock(message);
      return;
    }
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
                leading: Icon(
                  message.isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                ),
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
          Text(
            widget.group.courseName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            '${widget.group.memberCount} anggota · PJ ${widget.group.manager.name}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
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
            onPressed: _locking ? null : _toggleLock,
            icon: Icon(
              _isLocked ? Icons.lock_rounded : Icons.lock_open_rounded,
            ),
          ),
      ],
    ),
    body: Stack(
      key: _stageKey,
      fit: StackFit.expand,
      children: [
        Column(
          children: [
            AnimatedSize(
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero : const Duration(milliseconds: 180),
              alignment: Alignment.topCenter,
              child: _pinnedMessages.isEmpty
                  ? const SizedBox.shrink()
                  : _PinnedMessagesStrip(
                      messages: _pinnedMessages,
                      onTap: _openPinnedMessage,
                      onShowAll: _showPinnedMessages,
                    ),
            ),
            Expanded(
              child: Stack(
                key: _chatViewportKey,
                children: [
                  _body(),
                  if (_hasNewMessages || !_nearBottom)
                    Positioned(
                      right: 16,
                      bottom: 12,
                      child: FilledButton.tonalIcon(
                        onPressed: _jumpToBottom,
                        icon: const Icon(Icons.arrow_downward_rounded),
                        label: Text(
                          _hasNewMessages ? 'Pesan baru' : 'Pesan terbaru',
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (_replyTo != null)
              _ReplyComposer(
                message: _replyTo!,
                onClose: () => setState(() => _replyTo = null),
              ),
            _composerBar(),
          ],
        ),
        if (_flyingText != null) _sendFlightPreview(),
      ],
    ),
  );

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null)
      return ErrorState(message: friendlyError(_error!), onRetry: _loadInitial);
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
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.expand_less_rounded),
                label: const Text('Muat pesan sebelumnya'),
              ),
            );
          }
          final offset = _nextCursor == null ? 0 : 1;
          final message = _messages[index - offset];
          final newDay =
              index - offset == 0 ||
              formatDay(_messages[index - offset - 1].createdAt) !=
                  formatDay(message.createdAt);
          return Column(
            children: [
              if (newDay)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: StatusBadge(
                    label: formatDay(message.createdAt),
                    color: KarsaColors.muted,
                  ),
                ),
              _MessageBubble(
                key: _messageKeys.putIfAbsent(message.id, () => GlobalKey()),
                message: message,
                highlighted: _highlightedMessageId == message.id,
                onLongPress: () => _showActions(message),
                animateOnInsert: _justSentMessageIds.contains(message.id),
                popOnInsert: _incomingMessageIds.contains(message.id),
                onReplyTap: message.replyTo == null
                    ? null
                    : () => _openReply(message.replyTo!),
              ),
            ],
          );
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
                focusNode: _composerFocus,
                enabled: !disabled,
                maxLength: 2000,
                minLines: 1,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: disabled ? 'Grup dikunci oleh PJ' : 'Tulis pesan',
                  counterText: '',
                ),
                // Aksi submit bawaan melepas fokus dan menutup keyboard.
                onEditingComplete: () {},
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              key: _sendButtonKey,
              tooltip: 'Kirim',
              onPressed: disabled || _sending ? null : _send,
              icon: _sending
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sendFlightPreview() {
    final text = _flyingText!;
    return Positioned(
      left: _flightEnd.dx,
      top: _flightEnd.dy,
      child: IgnorePointer(
        child: AnimatedBuilder(
          animation: _sendFlightController,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: _flightWidth),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(
                  14,
                ).copyWith(bottomRight: const Radius.circular(4)),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                child: Text(text, maxLines: 2, overflow: TextOverflow.ellipsis),
              ),
            ),
          ),
          builder: (context, child) {
            final progress = const Cubic(
              .23,
              1,
              .32,
              1,
            ).transform(_sendFlightController.value);
            return Transform.translate(
              offset: Offset(
                (_flightStart.dx - _flightEnd.dx) * (1 - progress),
                (_flightStart.dy - _flightEnd.dy) * (1 - progress),
              ),
              child: Transform.scale(
                scale: .95 + .05 * progress,
                alignment: Alignment.bottomRight,
                child: Opacity(opacity: .96, child: child),
              ),
            );
          },
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

String _pinnedMessagePreview(GroupMessageItem message) => switch (message.state) {
  'active' => message.text ?? '',
  'deleted' => 'Pesan telah dihapus',
  'hidden' => 'Pesan disembunyikan oleh PJ',
  'blocked' => 'Pesan dari pengguna yang diblokir',
  _ => 'Pesan tidak tersedia',
};

class _PinnedMessagesStrip extends StatefulWidget {
  const _PinnedMessagesStrip({
    required this.messages,
    required this.onTap,
    required this.onShowAll,
  });
  final List<GroupMessageItem> messages;
  final ValueChanged<GroupMessageItem> onTap;
  final VoidCallback onShowAll;

  @override
  State<_PinnedMessagesStrip> createState() => _PinnedMessagesStripState();
}

class _PinnedMessagesStripState extends State<_PinnedMessagesStrip> {
  String? _activeId;
  double _dragDistance = 0;
  int _direction = 1;

  int get _index {
    final index = widget.messages.indexWhere((item) => item.id == _activeId);
    return index < 0 ? 0 : index;
  }

  @override
  void initState() {
    super.initState();
    if (widget.messages.isNotEmpty) _activeId = widget.messages.first.id;
  }

  @override
  void didUpdateWidget(covariant _PinnedMessagesStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.messages.any((item) => item.id == _activeId)) {
      _activeId = widget.messages.isEmpty ? null : widget.messages.first.id;
    }
  }

  void _step(int direction) {
    if (widget.messages.length < 2) return;
    final next = (_index + direction) % widget.messages.length;
    setState(() {
      _direction = direction;
      _activeId = widget.messages[next].id;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.messages.isEmpty) return const SizedBox.shrink();
    final colors = Theme.of(context).colorScheme;
    final message = widget.messages[_index];
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
      child: Material(
        color: const Color(0xFFFFF5E8).withValues(alpha: .9),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: colors.primary.withValues(alpha: .12)),
        ),
        clipBehavior: Clip.antiAlias,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 60),
          child: Row(children: [
            Expanded(child: Semantics(
              onIncrease: widget.messages.length > 1 ? () => _step(1) : null,
              onDecrease: widget.messages.length > 1 ? () => _step(-1) : null,
              child: GestureDetector(
                onHorizontalDragStart: (_) => _dragDistance = 0,
                onHorizontalDragUpdate: (details) => _dragDistance += details.delta.dx,
                onHorizontalDragEnd: (details) {
                  final velocity = details.primaryVelocity ?? 0;
                  if (_dragDistance.abs() > 24 || velocity.abs() > 120) {
                    _step((_dragDistance.abs() > 24 ? _dragDistance : velocity) < 0 ? 1 : -1);
                  }
                },
                child: InkWell(
                  onTap: () => widget.onTap(message),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    child: Row(children: [
                      Container(width: 3, height: 32,
                          decoration: BoxDecoration(color: colors.primary,
                              borderRadius: BorderRadius.circular(3))),
                      const SizedBox(width: 8),
                      Icon(Icons.push_pin_rounded, size: 16, color: colors.primary),
                      const SizedBox(width: 8),
                      Expanded(child: AnimatedSwitcher(
                        duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 160),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeOutCubic,
                        layoutBuilder: (current, previous) => Stack(
                          alignment: Alignment.centerLeft,
                          children: [...previous, if (current != null) current],
                        ),
                        transitionBuilder: (child, animation) => FadeTransition(
                          opacity: animation,
                          child: SlideTransition(
                            position: Tween<Offset>(
                              begin: reduceMotion ? Offset.zero : Offset(.08 * _direction, 0),
                              end: Offset.zero,
                            ).animate(animation),
                            child: child,
                          ),
                        ),
                        child: Column(
                          key: ValueKey(message.id),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Pesan disematkan · ${message.author.name}',
                                maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, color: colors.primary,
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 3),
                            Text(_pinnedMessagePreview(message), maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13)),
                          ],
                        ),
                      )),
                    ]),
                  ),
                ),
              ),
            )),
            Text('${_index + 1}/${widget.messages.length}',
                style: TextStyle(fontSize: 11, color: colors.onSurfaceVariant)),
            IconButton(
              tooltip: 'Semua pesan disematkan',
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              onPressed: widget.onShowAll,
              icon: Icon(Icons.format_list_bulleted_rounded, size: 20, color: colors.primary),
            ),
          ]),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatefulWidget {
  const _MessageBubble({
    required this.message,
    required this.onLongPress,
    this.onReplyTap,
    this.animateOnInsert = false,
    this.popOnInsert = false,
    this.highlighted = false,
    super.key,
  });
  final GroupMessageItem message;
  final VoidCallback onLongPress;
  final VoidCallback? onReplyTap;
  final bool animateOnInsert;
  final bool popOnInsert;
  final bool highlighted;

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble> {
  late bool _visible;

  @override
  void initState() {
    super.initState();
    _visible = !(widget.animateOnInsert || widget.popOnInsert);
    if (!_visible) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _visible = true);
      });
    }
  }

  String get _content => switch (widget.message.state) {
    'deleted' => 'Pesan telah dihapus',
    'hidden' => widget.message.hiddenReason ?? 'Pesan disembunyikan oleh PJ',
    'blocked' => 'Pesan dari pengguna yang kamu blokir',
    _ => widget.message.text ?? '',
  };

  @override
  Widget build(BuildContext context) {
    final message = widget.message;
    final colors = Theme.of(context).colorScheme;
    final muted = message.state != 'active';
    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth * .8;
        final maxBubbleWidth = availableWidth > 300 ? 300.0 : availableWidth;
        final reduceMotion = MediaQuery.disableAnimationsOf(context);
        final duration = Duration(
          milliseconds: reduceMotion
              ? 120
              : widget.popOnInsert
              ? 180
              : 160,
        );
        const easing = Cubic(.23, 1, .32, 1);
        return AnimatedOpacity(
          opacity: _visible ? 1 : 0,
          duration: duration,
          curve: easing,
          child: AnimatedScale(
            scale: reduceMotion || !widget.popOnInsert || _visible ? 1 : .94,
            alignment: Alignment.bottomLeft,
            duration: duration,
            curve: easing,
            child: AnimatedSlide(
              offset: reduceMotion || _visible || widget.popOnInsert
                  ? Offset.zero
                  : Offset(message.isOwn ? .05 : -.05, .10),
              duration: duration,
              curve: easing,
              child: Align(
                alignment: message.isOwn
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: GestureDetector(
                  onLongPress: widget.onLongPress,
                  onTap: message.state == 'blocked' ? widget.onLongPress : null,
                  child: AnimatedContainer(
                    duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 180),
                    constraints: BoxConstraints(maxWidth: maxBubbleWidth),
                    margin: const EdgeInsets.symmetric(vertical: 3),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: widget.highlighted
                          ? colors.primary.withValues(alpha: .12)
                          : message.isOwn
                          ? colors.primaryContainer
                          : Colors.white,
                      border: Border.all(color: widget.highlighted
                          ? colors.primary : const Color(0xFFF0E7DE)),
                      borderRadius: BorderRadius.circular(14).copyWith(
                        bottomRight: message.isOwn
                            ? const Radius.circular(4)
                            : null,
                        bottomLeft: message.isOwn
                            ? null
                            : const Radius.circular(4),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!message.isOwn || message.isPinned) ...[
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (!message.isOwn)
                                Flexible(
                                  child: Text(
                                    message.author.name,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: colors.primary,
                                    ),
                                  ),
                                ),
                              if (!message.isOwn &&
                                  message.author.isGroupManager) ...[
                                const SizedBox(width: 6),
                                const Icon(Icons.verified_rounded, size: 15),
                              ],
                              if (message.isPinned) ...[
                                if (!message.isOwn) const SizedBox(width: 6),
                                const Icon(Icons.push_pin_rounded, size: 14),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                        ],
                        if (message.replyTo != null) ...[
                          InkWell(
                            onTap: widget.onReplyTap,
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: colors.surfaceContainerHighest
                                    .withValues(alpha: .7),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${message.replyTo!.author.name}: ${message.replyTo!.text ?? 'Pesan tidak tersedia'}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: _content,
                                style: TextStyle(
                                  fontStyle: muted ? FontStyle.italic : null,
                                ),
                              ),
                              WidgetSpan(
                                alignment: PlaceholderAlignment.baseline,
                                baseline: TextBaseline.alphabetic,
                                child: Padding(
                                  padding: const EdgeInsets.only(left: 6),
                                  child: Text(
                                    '${formatTime(message.createdAt)}${message.editedAt == null ? '' : ' · diedit'}',
                                    style: Theme.of(context).textTheme.labelSmall
                                        ?.copyWith(
                                          color: colors.onSurfaceVariant,
                                        ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
