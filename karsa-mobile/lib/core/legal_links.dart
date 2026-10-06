import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';

const termsPath = '/syarat-penggunaan';
const privacyPath = '/kebijakan-privasi';
const legalDocumentVersion = '1.1';

Future<void> openLegalDocument(BuildContext context, String path) async {
  try {
    final opened = await launchUrl(
      Uri.parse(apiBaseUrl).resolve(path),
      mode: LaunchMode.externalApplication,
    );
    if (opened) return;
  } catch (_) {
    // Tampilkan pesan yang sama bila browser tidak tersedia atau gagal dibuka.
  }

  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Halaman dokumen tidak dapat dibuka. Coba lagi saat terhubung ke internet.')),
    );
  }
}
