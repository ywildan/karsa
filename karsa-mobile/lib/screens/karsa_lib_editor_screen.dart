import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class KarsaLibEditorScreen extends StatefulWidget {
  const KarsaLibEditorScreen({required this.api, this.article, super.key});
  final ApiClient api;
  final LibArticle? article;
  @override
  State<KarsaLibEditorScreen> createState() => _KarsaLibEditorScreenState();
}

class _KarsaLibEditorScreenState extends State<KarsaLibEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.article?.title ?? '');
  late final _body = TextEditingController(text: widget.article?.body ?? '');
  bool _saving = false;
  bool _saved = false;
  String? _error;

  bool get _dirty => _title.text != (widget.article?.title ?? '') ||
      _body.text != (widget.article?.body ?? '');

  @override
  void initState() {
    super.initState();
    _title.addListener(_changed);
    _body.addListener(_changed);
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _leave() async {
    if (_saving) return;
    if (!_dirty) {
      Navigator.pop(context, _saved);
      return;
    }
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tinggalkan tulisan ini?'),
        content: const Text('Perubahan terakhir belum disimpan. Kamu bisa kembali menulis atau keluar tanpa menyimpannya.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Lanjut menulis')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Keluar')),
        ],
      ),
    );
    if (discard == true && mounted) {
      setState(() => _saved = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.pop(context, false);
      });
    }
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() { _saving = true; _error = null; });
    try {
      if (widget.article == null) {
        await widget.api.createLibArticle(title: _title.text.trim(), body: _body.text.trim());
      } else {
        await widget.api.updateLibArticle(widget.article!.id,
            action: 'EDIT', title: _title.text.trim(), body: _body.text.trim());
      }
      if (!mounted) return;
      setState(() { _saved = true; _saving = false; });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.pop(context, true);
      });
    } catch (error) {
      if (mounted) setState(() { _saving = false; _error = friendlyError(error); });
    }
  }

  @override
  Widget build(BuildContext context) {
    final published = widget.article?.status == 'PUBLISHED';
    return PopScope(
      canPop: _saved || (!_dirty && !_saving),
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _leave();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            tooltip: 'Kembali', onPressed: _saving ? null : _leave,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          title: Text(widget.article == null ? 'Tulis artikel' : 'Edit artikel'),
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              InfoNotice(
                icon: published ? Icons.public_rounded : Icons.edit_note_rounded,
                title: published ? 'Memperbarui artikel terbit' : 'Ruang untuk ide-idemu',
                message: published
                    ? 'Perubahan akan langsung terlihat pada artikel yang sudah diterbitkan di prodimu.'
                    : 'Simpan sebagai draf. Kamu dapat menerbitkannya dari halaman Tulisan saya.',
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _title, enabled: !_saving, maxLength: 120,
                minLines: 1, maxLines: 3, textCapitalization: TextCapitalization.sentences,
                style: Theme.of(context).textTheme.titleLarge,
                decoration: const InputDecoration(labelText: 'Judul artikel', hintText: 'Apa yang ingin kamu bagikan?'),
                validator: (value) => value?.trim().isEmpty != false ? 'Tambahkan judul artikel.' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _body, enabled: !_saving, minLines: 14, maxLines: null,
                maxLength: 20000, keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.8),
                decoration: const InputDecoration(
                  labelText: 'Isi artikel', alignLabelWithHint: true,
                  hintText: 'Mulai dari pengalaman, pertanyaan, atau pengetahuanmu...',
                ),
                validator: (value) => value?.trim().isEmpty != false ? 'Isi artikel belum ditulis.' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
            ],
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
            child: FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_outlined, size: 20),
              label: Text(_saving ? 'Menyimpan tulisan...' : widget.article == null ? 'Simpan draf' : 'Simpan perubahan'),
            ),
          ),
        ),
      ),
    );
  }
}
