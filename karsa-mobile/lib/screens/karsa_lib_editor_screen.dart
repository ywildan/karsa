import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import '../widgets/markdown_text.dart';

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
  bool _preview = false;
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

  /// Membungkus teks terpilih (atau kursor) dengan penanda Markdown,
  /// mis. **tebal**. Teks hasil sisipan tetap terpilih agar penulis bisa
  /// langsung menggantinya.
  void _wrapSelection(String before, String after, {String placeholder = 'teks'}) {
    final text = _body.text;
    final selection = _body.selection.isValid
        ? _body.selection
        : TextSelection.collapsed(offset: text.length);
    final selected = text.substring(selection.start, selection.end);
    final inserted = selected.isEmpty ? placeholder : selected;
    _body.value = TextEditingValue(
      text: text.replaceRange(selection.start, selection.end, '$before$inserted$after'),
      selection: TextSelection(
        baseOffset: selection.start + before.length,
        extentOffset: selection.start + before.length + inserted.length,
      ),
    );
  }

  /// Menerapkan [transform] ke setiap baris tak kosong dalam pilihan
  /// (atau baris kursor). Dipakai untuk heading, daftar, dan kutipan.
  void _transformLines(String Function(String line, int index) transform,
      {bool firstLineOnly = false}) {
    final text = _body.text;
    final selection = _body.selection.isValid
        ? _body.selection
        : TextSelection.collapsed(offset: text.length);
    final start = selection.start <= 0
        ? 0
        : text.lastIndexOf('\n', selection.start - 1) + 1;
    var end = selection.end;
    if (end > start && end <= text.length && text[end - 1] == '\n') end -= 1;
    final newlineAfter = text.indexOf('\n', end);
    final endIndex = newlineAfter == -1 ? text.length : newlineAfter;
    final lines = text.substring(start, endIndex).split('\n');
    final changed = <String>[];
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      if (line.trim().isEmpty || (firstLineOnly && i > 0)) {
        changed.add(line);
      } else {
        changed.add(transform(line, i));
      }
    }
    final segment = changed.join('\n');
    _body.value = TextEditingValue(
      text: text.replaceRange(start, endIndex, segment),
      selection: TextSelection(baseOffset: start, extentOffset: start + segment.length),
    );
  }

  void _applyHeading(int level) {
    final marks = '#' * level;
    _transformLines(
      (line, _) => '$marks ${line.replaceFirst(RegExp(r'^#{1,6}\s+'), '')}',
      firstLineOnly: true,
    );
  }

  Widget _formatButton({
    required String tooltip,
    required VoidCallback onPressed,
    Widget? icon,
    String? label,
  }) {
    return IconButton(
      tooltip: tooltip,
      onPressed: _saving ? null : onPressed,
      icon: icon ??
          Text(label ?? '',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
    );
  }

  Widget _formatToolbar() {
    var number = 0;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        _formatButton(tooltip: 'Judul besar', label: 'H1', onPressed: () => _applyHeading(1)),
        _formatButton(tooltip: 'Subjudul', label: 'H2', onPressed: () => _applyHeading(2)),
        _formatButton(
          tooltip: 'Tebal', icon: const Icon(Icons.format_bold_rounded),
          onPressed: () => _wrapSelection('**', '**'),
        ),
        _formatButton(
          tooltip: 'Miring', icon: const Icon(Icons.format_italic_rounded),
          onPressed: () => _wrapSelection('*', '*'),
        ),
        _formatButton(
          tooltip: 'Kode', icon: const Icon(Icons.code_rounded),
          onPressed: () => _wrapSelection('`', '`', placeholder: 'kode'),
        ),
        _formatButton(
          tooltip: 'Daftar poin',
          icon: const Icon(Icons.format_list_bulleted_rounded),
          onPressed: () => _transformLines((line, _) =>
              '- ${line.replaceFirst(RegExp(r'^([-*]|\d{1,3}[.)])\s+'), '')}'),
        ),
        _formatButton(
          tooltip: 'Daftar bernomor',
          icon: const Icon(Icons.format_list_numbered_rounded),
          onPressed: () => _transformLines((line, _) {
            number += 1;
            final plain = line.replaceFirst(RegExp(r'^([-*]|\d{1,3}[.)])\s+'), '');
            return '$number. $plain';
          }),
        ),
        _formatButton(
          tooltip: 'Kutipan', icon: const Icon(Icons.format_quote_rounded),
          onPressed: () => _transformLines((line, _) => line.startsWith('> ') ? line : '> $line'),
        ),
        _formatButton(
          tooltip: 'Tautan', icon: const Icon(Icons.link_rounded),
          onPressed: () => _wrapSelection('[', '](https://)', placeholder: 'teks tautan'),
        ),
      ]),
    );
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
    if (_saving) return;
    if (_preview) {
      // Form tidak sedang tampil; validasi manual dengan pesan yang sama.
      if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
        setState(() => _error = 'Judul dan isi artikel wajib diisi.');
        return;
      }
    } else if (!_formKey.currentState!.validate()) {
      return;
    }
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

  Widget _previewBody() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        const InfoNotice(
          icon: Icons.visibility_outlined,
          title: 'Pratinjau artikel',
          message: 'Begini tampilan tulisanmu bagi pembaca. Ketuk ikon pensil di atas untuk kembali menulis.',
        ),
        const SizedBox(height: 24),
        Text(
          _title.text.trim().isEmpty ? 'Tanpa judul' : _title.text.trim(),
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, height: 1.3),
        ),
        const Divider(height: 32),
        if (_body.text.trim().isEmpty)
          const Text('Isi artikel belum ditulis.',
              style: TextStyle(fontSize: 16, height: 1.85, color: KarsaColors.muted))
        else
          SelectionArea(
            child: MarkdownBody(body: _body.text, onTapLink: openMarkdownLink),
          ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
      ],
    );
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
          actions: [
            IconButton(
              tooltip: _preview ? 'Kembali menulis' : 'Pratinjau tampilan artikel',
              onPressed: _saving ? null : () => setState(() => _preview = !_preview),
              icon: Icon(_preview ? Icons.edit_rounded : Icons.visibility_outlined),
            ),
          ],
        ),
        body: _preview ? _previewBody() : Form(
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
              const SizedBox(height: 8),
              _formatToolbar(),
              const SizedBox(height: 4),
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
