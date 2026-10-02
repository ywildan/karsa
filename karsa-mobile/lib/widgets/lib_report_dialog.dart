import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'common.dart';

Future<bool?> showLibReportDialog(BuildContext context, {
  required ApiClient api, String? articleId, String? commentId,
}) => showDialog<bool>(
  context: context, barrierDismissible: false,
  builder: (_) => _LibReportDialog(api: api, articleId: articleId, commentId: commentId),
);

class _LibReportDialog extends StatefulWidget {
  const _LibReportDialog({required this.api, this.articleId, this.commentId});
  final ApiClient api;
  final String? articleId;
  final String? commentId;
  @override
  State<_LibReportDialog> createState() => _LibReportDialogState();
}

class _LibReportDialogState extends State<_LibReportDialog> {
  final _details = TextEditingController();
  String? _reason;
  String? _error;
  bool _sending = false;
  @override
  void dispose() { _details.dispose(); super.dispose(); }

  Future<void> _send() async {
    if (_sending || _reason == null) return;
    setState(() { _sending = true; _error = null; });
    try {
      await widget.api.reportLibContent(
        articleId: widget.articleId, commentId: widget.commentId,
        reason: _reason!, details: _details.text.trim(),
      );
      if (mounted) {
        setState(() => _sending = false);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) Navigator.pop(context, true);
        });
      }
    } catch (error) {
      if (mounted) setState(() { _sending = false; _error = friendlyError(error); });
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_sending,
    child: AlertDialog(
      title: Text(widget.commentId == null ? 'Laporkan artikel' : 'Laporkan komentar'),
      content: SingleChildScrollView(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _reason, isExpanded: true,
            decoration: const InputDecoration(labelText: 'Alasan laporan'),
            items: const [
              DropdownMenuItem(value: 'MISINFORMATION', child: Text('Informasi keliru')),
              DropdownMenuItem(value: 'INAPPROPRIATE', child: Text('Konten tidak pantas')),
              DropdownMenuItem(value: 'SPAM', child: Text('Spam atau promosi')),
              DropdownMenuItem(value: 'COPYRIGHT', child: Text('Hak cipta')),
              DropdownMenuItem(value: 'OTHER', child: Text('Lainnya')),
            ],
            onChanged: _sending ? null : (value) => setState(() => _reason = value),
          ),
          const SizedBox(height: 16),
          TextField(controller: _details, enabled: !_sending, maxLines: 3, maxLength: 1000,
              decoration: const InputDecoration(labelText: 'Keterangan (opsional)', alignLabelWithHint: true)),
          if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
      )),
      actions: [
        TextButton(onPressed: _sending ? null : () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(
          onPressed: _sending || _reason == null ? null : _send,
          child: Text(_sending ? 'Mengirim...' : 'Kirim laporan'),
        ),
      ],
    ),
  );
}
