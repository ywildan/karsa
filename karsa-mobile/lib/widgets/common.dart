import 'dart:async';

import 'package:flutter/material.dart';

abstract final class KarsaColors {
  static const orange = Color(0xFFCF6A12);
  static const background = Color(0xFFFFFBF7);
  static const ink = Color(0xFF37271C);
  static const muted = Color(0xFF71675F);
  static const border = Color(0xFFF0E7DE);
}

class ScreenPadding extends StatelessWidget {
  const ScreenPadding({required this.child, super.key});
  final Widget child;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28), child: child,
      );
}

class SectionHeading extends StatelessWidget {
  const SectionHeading({required this.title, this.subtitle, this.trailing, super.key});
  final String title;
  final String? subtitle;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
            ],
          ])),
          if (trailing != null) trailing!,
        ],
      );
}

class InitialAvatar extends StatelessWidget {
  const InitialAvatar({required this.name, this.image, this.radius = 22, super.key});
  final String name;
  final String? image;
  final double radius;
  @override
  Widget build(BuildContext context) {
    final words = name.trim().split(RegExp(r'\s+')).where((word) => word.isNotEmpty);
    final initials = words.take(2).map((word) => word.substring(0, 1)).join().toUpperCase();
    final fallback = CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xFFFFE9D6),
      child: Text(initials.isEmpty ? 'K' : initials,
          style: TextStyle(color: KarsaColors.orange, fontWeight: FontWeight.w800, fontSize: radius * .6)),
    );
    if (image?.trim().isNotEmpty != true) return fallback;
    return ClipOval(child: Image.network(
      image!, width: radius * 2, height: radius * 2, fit: BoxFit.cover,
      errorBuilder: (_, error, stackTrace) => fallback,
      loadingBuilder: (_, child, progress) => progress == null ? child : fallback,
    ));
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.label, this.color = KarsaColors.orange, super.key});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(9),
        ),
        child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
      );
}

class InfoNotice extends StatelessWidget {
  const InfoNotice({required this.message, this.title, this.icon = Icons.info_outline_rounded, super.key});
  final String message;
  final String? title;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity, padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF2E6), border: Border.all(color: const Color(0xFFF0D7C2)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 20, color: KarsaColors.orange),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (title != null) ...[
              Text(title!, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
            ],
            Text(message, style: Theme.of(context).textTheme.bodySmall),
          ])),
        ]),
      );
}

class LoadingState extends StatelessWidget {
  const LoadingState({this.message = 'Memuat data...', super.key});
  final String message;
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const CircularProgressIndicator(strokeWidth: 3),
      const SizedBox(height: 18),
      Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
    ]),
  ));
}

class EmptyState extends StatelessWidget {
  const EmptyState({required this.title, required this.message, this.icon = Icons.inbox_outlined, super.key});
  final String title;
  final String message;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Center(child: SingleChildScrollView(
    padding: const EdgeInsets.all(28),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: const BoxDecoration(color: Color(0xFFFFECDD), shape: BoxShape.circle),
        child: Icon(icon, size: 32, color: KarsaColors.orange),
      ),
      const SizedBox(height: 20),
      Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
    ]),
  ));
}

class ErrorState extends StatelessWidget {
  const ErrorState({required this.message, required this.onRetry, super.key});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: SingleChildScrollView(
    padding: const EdgeInsets.all(28),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.cloud_off_rounded, size: 36, color: KarsaColors.muted),
      const SizedBox(height: 16),
      Text('Belum bisa memuat data', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
      const SizedBox(height: 20),
      OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Coba lagi')),
    ]),
  ));
}

String friendlyError(Object error) {
  if (error is TimeoutException) return 'Koneksi membutuhkan waktu lebih lama. Coba lagi sebentar.';
  final text = error.toString();
  if (text.contains('SocketException') || text.contains('ClientException') || text.contains('Failed host lookup')) {
    return 'Koneksi belum tersedia. Periksa internetmu dan coba lagi.';
  }
  return text.startsWith('Exception: ') ? text.substring(11) : text;
}

String formatDay(DateTime date) {
  final local = date.toLocal();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return '${local.day} ${months[local.month - 1]} ${local.year}';
}

String formatTime(DateTime date) {
  final local = date.toLocal();
  return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

String formatDate(DateTime date) => '${formatDay(date)}, ${formatTime(date)}';

String formatRelativeTime(DateTime date) {
  final elapsed = DateTime.now().difference(date.toLocal());
  if (elapsed.isNegative || elapsed.inMinutes < 1) return 'Baru saja';
  if (elapsed.inMinutes < 60) return '${elapsed.inMinutes} menit lalu';
  if (elapsed.inHours < 24) return '${elapsed.inHours} jam lalu';
  if (elapsed.inDays < 7) return '${elapsed.inDays} hari lalu';
  return formatDate(date);
}

/// Identitas mahasiswa disamarkan pada layar bersama.
String maskNim(String? nim) {
  final value = nim?.trim() ?? '';
  if (value.isEmpty) return '';
  if (value.length <= 3) return value;
  return '${value.substring(0, 3)}${List.filled(value.length - 3, '*').join()}';
}
