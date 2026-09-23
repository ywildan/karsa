import 'package:flutter/material.dart';

import '../core/app_controller.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({required this.controller, super.key});
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final busy = controller.state == SessionState.authenticating;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(24),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'K',
                  style: TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'Poin akademik,\nlebih mudah dipantau.',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 14),
              Text(
                'Aplikasi resmi SiKarsa untuk mahasiswa dan PJ mata kuliah.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      height: 1.5,
                    ),
              ),
              if (controller.error != null) ...[
                const SizedBox(height: 24),
                MaterialBanner(
                  content: Text(controller.error!),
                  actions: [
                    TextButton(onPressed: controller.clearError, child: const Text('Tutup')),
                  ],
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton.icon(
                  onPressed: busy ? null : controller.signIn,
                  icon: busy
                      ? const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.login_rounded),
                  label: Text(busy ? 'Menyelesaikan proses masuk…' : 'Masuk dengan akun kampus'),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Login dibuka melalui browser sistem yang aman. Aplikasi tidak menyimpan kata sandi Google.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
