import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../widgets/common.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({required this.controller, super.key});
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final user = controller.user!;
    return CustomScrollView(
      slivers: [
        const SliverAppBar(title: Text('Akun')),
        SliverToBoxAdapter(
          child: ScreenPadding(
            child: Column(
              children: [
                const SizedBox(height: 18),
                CircleAvatar(
                  radius: 42,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  backgroundImage: user.image == null ? null : NetworkImage(user.image!),
                  child: user.image == null
                      ? Text(
                          (user.name?.isNotEmpty == true ? user.name![0] : 'K').toUpperCase(),
                          style: Theme.of(context).textTheme.headlineMedium,
                        )
                      : null,
                ),
                const SizedBox(height: 16),
                Text(user.name ?? 'Mahasiswa', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(user.email, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                if (user.nim != null) ...[
                  const SizedBox(height: 4),
                  Text(user.nim!),
                ],
                const SizedBox(height: 24),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.verified_user_outlined),
                    title: const Text('Akses aplikasi'),
                    subtitle: Text(
                      user.capabilities.recordPoints
                          ? 'Mahasiswa · PJ mata kuliah'
                          : 'Mahasiswa',
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _confirmLogout(context),
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Keluar dari aplikasi'),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('SiKarsa Mobile 2.0', style: TextStyle(color: Colors.black45, fontSize: 12)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar dari aplikasi?'),
        content: const Text('Kamu perlu masuk kembali untuk membuka data Karsa.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Keluar')),
        ],
      ),
    );
    if (confirmed == true) await controller.signOut();
  }
}
