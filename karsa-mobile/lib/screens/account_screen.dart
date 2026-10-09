import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/app_controller.dart';
import '../core/legal_links.dart';
import '../core/models.dart';
import '../widgets/common.dart';
import 'karsa_lib_author_screen.dart';
import 'karsa_lib_vault_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({required this.controller, super.key});
  final AppController controller;
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}
class _AccountScreenState extends State<AccountScreen> {
  Future<LibBootstrap>? _lib;
  late final Future<String> _version = _readVersion();
  @override
  void initState() {
    super.initState();
    _loadProfile();
  }
  void _loadProfile() {
    if (widget.controller.user?.capabilities.viewKarsaLib == true) {
      _lib = widget.controller.api.libBootstrap();
    }
  }
  Future<void> _refresh() async {
    try {
      await widget.controller.refreshUser();
      if (mounted) setState(_loadProfile);
      await _lib;
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(error))));
    }
  }
  Future<String> _readVersion() async {
    try {
      final pubspec = await rootBundle.loadString('pubspec.yaml');
      final match = RegExp(r'^version:\s*(.+)$', multiLine: true).firstMatch(pubspec);
      final raw = match?.group(1)?.trim() ?? '';
      // Sembunyikan build number (+N): angka itu hanya penghitung
      // instalasi Android, bukan bagian dari versi yang dipublikasikan.
      final plus = raw.indexOf('+');
      return plus < 0 ? raw : raw.substring(0, plus);
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.controller.user!;
    return RefreshIndicator(onRefresh: _refresh, child: CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        const SliverAppBar(pinned: true, title: Text('Akun')),
        SliverToBoxAdapter(child: ScreenPadding(child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SizedBox(height: 18),
            Center(child: InitialAvatar(name: user.name ?? 'Mahasiswa', image: user.image, radius: 42)),
            const SizedBox(height: 16),
            Text(user.name ?? 'Mahasiswa', textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(user.email, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
            if (user.nim != null) Text(user.nim!, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: KarsaType.caption, color: KarsaColors.muted)),
            const SizedBox(height: 28),
            const SectionHeading(title: 'Identitas dan akses'),
            const SizedBox(height: 10),
            Card(child: Column(children: [
              ListTile(leading: const Icon(Icons.school_outlined),
                title: const Text('Akses Karsa'),
                subtitle: Text(user.capabilities.recordPoints ? 'Mahasiswa · PJ mata kuliah' : 'Mahasiswa')),
              if (user.capabilities.viewKarsaLib) ...[
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(leading: const Icon(Icons.account_balance_outlined),
                  title: const Text('Fakultas Karsa Lib'),
                  subtitle: FutureBuilder<LibBootstrap>(future: _lib, builder: (context, snapshot) => Text(
                    snapshot.data?.profile?.faculty ?? user.libProfile?.faculty ?? 'Memuat fakultas…'))),
                FutureBuilder<LibBootstrap>(future: _lib, builder: (context, snapshot) {
                  if (snapshot.hasError) return ListTile(
                    leading: const Icon(Icons.refresh_rounded),
                    title: const Text('Data Karsa Lib belum tersedia'),
                    subtitle: Text(friendlyError(snapshot.error!)),
                    onTap: () => setState(_loadProfile),
                  );
                  final bootstrap = snapshot.data;
                  final profile = bootstrap?.profile ?? user.libProfile;
                  final matches = bootstrap?.programs.where((p) => p.id == profile?.programId);
                  final program = matches == null || matches.isEmpty ? 'Memuat program studi…' : matches.first.name;
                  final classes = bootstrap?.classes.where((c) => c.id == profile?.classId);
                  final className = classes == null || classes.isEmpty ? null : classes.first.name;
                  return Column(children: [
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    ListTile(leading: const Icon(Icons.menu_book_outlined),
                      title: const Text('Program studi'), subtitle: Text(program)),
                    if (className != null) ...[
                      const Divider(height: 1, indent: 16, endIndent: 16),
                      ListTile(leading: const Icon(Icons.people_outline_rounded),
                        title: const Text('Kelas Karsa Lib'), subtitle: Text(className)),
                    ],
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    ListTile(leading: const Icon(Icons.edit_note_rounded),
                      title: const Text('Akses menulis'),
                      subtitle: Text(bootstrap?.canWrite == true
                        ? 'Penulis aktif' : bootstrap?.latestRequest?['status'] == 'PENDING'
                          ? 'Permohonan sedang ditinjau' : 'Pembaca'),
                      trailing: bootstrap?.canWrite == true ? const Icon(Icons.chevron_right_rounded) : null,
                      onTap: bootstrap?.canWrite == true ? () => Navigator.of(context).push<void>(
                        MaterialPageRoute(builder: (_) => KarsaLibVaultScreen(api: widget.controller.api))) : null),
                    if (bootstrap?.canWrite == true) ListTile(
                      leading: const Icon(Icons.person_outline_rounded),
                      title: const Text('Profil penulis saya'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => Navigator.of(context).push<void>(MaterialPageRoute(
                        builder: (_) => KarsaLibAuthorScreen(api: widget.controller.api, authorId: user.id))),
                    ),
                  ]);
                }),
              ],
            ])),
            const SizedBox(height: 24),
            const SectionHeading(title: 'Informasi aplikasi'),
            const SizedBox(height: 10),
            Card(child: Column(children: [
              ListTile(leading: const Icon(Icons.description_outlined),
                title: const Text('Syarat Penggunaan'),
                trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                onTap: () => openLegalDocument(context, termsPath)),
              const Divider(height: 1, indent: 16, endIndent: 16),
              ListTile(leading: const Icon(Icons.privacy_tip_outlined),
                title: const Text('Kebijakan Privasi'),
                trailing: const Icon(Icons.open_in_new_rounded, size: 18),
                onTap: () => openLegalDocument(context, privacyPath)),
            ])),
            const SizedBox(height: 20),
            OutlinedButton.icon(onPressed: () => _confirmLogout(context),
              icon: const Icon(Icons.logout_rounded), label: const Text('Keluar dari aplikasi')),
            const SizedBox(height: 18),
            FutureBuilder<String>(future: _version, builder: (context, snapshot) =>
              Text('SiKarsa Mobile ${snapshot.data ?? ''}', textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: KarsaColors.muted))),
          ],
        ))),
      ],
    ));
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Keluar dari aplikasi?'),
      content: const Text('Kamu perlu masuk kembali untuk membuka data Karsa.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Keluar')),
      ],
    ));
    if (confirmed == true) await widget.controller.signOut();
  }
}
