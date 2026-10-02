import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../widgets/common.dart';

class KarsaLibAuthorRequestScreen extends StatefulWidget {
  const KarsaLibAuthorRequestScreen({required this.api, super.key});
  final ApiClient api;
  @override
  State<KarsaLibAuthorRequestScreen> createState() => _KarsaLibAuthorRequestScreenState();
}

class _KarsaLibAuthorRequestScreenState extends State<KarsaLibAuthorRequestScreen> {
  final _form = GlobalKey<FormState>();
  final _motivation = TextEditingController();
  final _topics = TextEditingController();
  bool _accepted = false;
  bool _sending = false;
  String? _error;

  @override
  void dispose() { _motivation.dispose(); _topics.dispose(); super.dispose(); }

  Future<void> _send() async {
    if (_sending || !_accepted || !_form.currentState!.validate()) return;
    setState(() { _sending = true; _error = null; });
    try {
      await widget.api.requestLibAuthor(motivation: _motivation.text.trim(), topics: _topics.text.trim());
      if (mounted) {
        setState(() => _sending = false);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) Navigator.pop(context, true);
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = friendlyError(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_sending,
    child: Scaffold(
      appBar: AppBar(title: const Text('Jadi penulis')),
      body: Form(key: _form, child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const InfoNotice(
            title: 'Bagikan ilmu untuk satu prodi',
            message: 'Admin akan meninjau permohonanmu. Sambil menunggu, kamu tetap bisa membaca dan berdiskusi.',
            icon: Icons.edit_note_rounded,
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _motivation, enabled: !_sending, minLines: 4, maxLines: 7,
            maxLength: 2000, textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Mengapa ingin menjadi penulis?', alignLabelWithHint: true,
                hintText: 'Ceritakan tujuanmu berbagi pengetahuan.'),
            validator: (value) => value?.trim().isEmpty != false ? 'Ceritakan alasanmu terlebih dahulu.' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _topics, enabled: !_sending, maxLength: 500, minLines: 2, maxLines: 4,
            decoration: const InputDecoration(labelText: 'Topik yang ingin ditulis', alignLabelWithHint: true,
                hintText: 'Misalnya: akuntansi dasar, pajak, atau tips belajar.'),
            validator: (value) => value?.trim().isEmpty != false ? 'Tambahkan topik yang ingin dibagikan.' : null,
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero, checkboxShape: const CircleBorder(),
            value: _accepted, onChanged: _sending ? null : (value) => setState(() => _accepted = value ?? false),
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text('Saya akan mengikuti panduan komunitas Karsa Lib.'),
          ),
          if (_error != null) Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _sending || !_accepted ? null : _send,
            icon: _sending ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send_rounded, size: 18),
            label: Text(_sending ? 'Mengirim permohonan...' : 'Kirim permohonan'),
          ),
        ],
      )),
    ),
  );
}
