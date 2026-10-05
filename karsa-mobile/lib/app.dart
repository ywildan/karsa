import 'package:flutter/material.dart';

import 'core/app_controller.dart';
import 'screens/home_shell.dart';
import 'screens/sign_in_screen.dart';
import 'widgets/common.dart';

class KarsaApp extends StatelessWidget {
  const KarsaApp({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFFCF6A12);
    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
      primary: KarsaColors.orange,
      surface: const Color(0xFFFFFBF7),
    );
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => MaterialApp(
        // Recreate the entire Navigator when a private session ends or the
        // account changes. Pushed routes and dialogs cannot cover sign-in.
        key: ValueKey(
          controller.state == SessionState.signedIn
              ? 'session:${controller.user!.id}'
              : 'signed-out',
        ),
        title: 'SiKarsa',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: scheme,
          useMaterial3: true,
          textTheme: const TextTheme(
            headlineMedium: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: KarsaColors.ink,
            ),
            headlineSmall: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: KarsaColors.ink,
            ),
            titleLarge: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: KarsaColors.ink,
            ),
            titleMedium: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: KarsaColors.ink,
            ),
            bodyLarge: TextStyle(
              fontSize: 16,
              height: 1.6,
              color: KarsaColors.ink,
            ),
            bodyMedium: TextStyle(
              fontSize: 14,
              height: 1.5,
              color: KarsaColors.ink,
            ),
            bodySmall: TextStyle(
              fontSize: 12,
              height: 1.5,
              color: KarsaColors.muted,
            ),
            labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            labelSmall: TextStyle(fontSize: 12, color: KarsaColors.muted),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size(48, 50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          snackBarTheme: const SnackBarThemeData(
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
          ),
          scaffoldBackgroundColor: const Color(0xFFFFFBF7),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFFFFFBF7),
            surfaceTintColor: Colors.transparent,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: KarsaColors.ink,
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
          ),
          cardTheme: const CardThemeData(
            elevation: 0,
            margin: EdgeInsets.zero,
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(20)),
              side: BorderSide(color: Color(0xFFF0E7DE)),
            ),
          ),
          inputDecorationTheme: const InputDecorationTheme(
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(14)),
              borderSide: BorderSide(color: KarsaColors.border),
            ),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(14)),
            ),
          ),
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: Colors.white,
            indicatorColor: scheme.primaryContainer,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          ),
        ),
        home: AnimatedBuilder(
          animation: controller,
          builder: (context, _) => switch (controller.state) {
            SessionState.loading => const _SplashScreen(),
            SessionState.unavailable => Scaffold(
              body: ErrorState(
                message: controller.error ?? 'Sesi belum dapat diperiksa.',
                onRetry: controller.retrySession,
              ),
            ),
            SessionState.signedOut ||
            SessionState.authenticating => SignInScreen(controller: controller),
            SessionState.signedIn => HomeShell(controller: controller),
          },
        ),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LogoMark(size: 64),
          SizedBox(height: 20),
          CircularProgressIndicator(),
        ],
      ),
    ),
  );
}

class _LogoMark extends StatelessWidget {
  const _LogoMark({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(size * .28),
    child: Image.asset(
      'assets/icon.png',
      width: size,
      height: size,
      semanticLabel: 'Logo SiKarsa',
    ),
  );
}
