import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import 'common.dart';

/// Alur impor .docx yang dipakai halaman Tulisan saya dan menu Karsa
/// Lib: pilih file -> unggah -> server mengonversi menjadi DRAF artikel.
/// [onImported] dipanggil dengan draf hasilnya agar pemanggil bisa
/// membuka editor untuk peninjauan.
Future<void> importDocxFlow(
  BuildContext context, {
  required ApiClient api,
  required void Function(String message) onMessage,
  required Future<void> Function(LibDocxImportResult result) onImported,
}) async {
  final file = await FilePicker.pickFile(
    type: FileType.custom,
    allowedExtensions: ['docx'],
  );
  if (!context.mounted) return;
  if (file == null) return;
  if (!file.name.toLowerCase().endsWith('.docx')) {
    onMessage('Pilih file berekstensi .docx.');
    return;
  }
  final bytes = await file.readAsBytes();
  if (!context.mounted) return;
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const AlertDialog(
      content: Row(children: [
        CircularProgressIndicator(),
        SizedBox(width: 16),
        Expanded(child: Text('Mengimpor dokumen…')),
      ]),
    ),
  );
  try {
    final result = await api.importLibDocx(fileName: file.name, bytes: bytes);
    if (!context.mounted) return;
    Navigator.of(context).pop();
    onMessage(
      result.droppedImages > 0
          ? 'Dokumen menjadi draf. ${result.droppedImages} gambar di dalamnya belum ikut tersimpan.'
          : 'Dokumen berhasil diimpor sebagai draf.',
    );
    await onImported(result);
  } catch (error) {
    if (!context.mounted) return;
    Navigator.of(context).pop();
    onMessage(friendlyError(error));
  }
}
