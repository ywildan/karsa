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
      surface: KarsaColors.background,
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
              minimumSize: const Size(48, 52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(KarsaRadius.md),
              ),
            ),
          ),
          snackBarTheme: SnackBarThemeData(
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(KarsaRadius.md)),
            ),
            actionTextColor: scheme.onPrimary,
          ),
          scaffoldBackgroundColor: KarsaColors.background,
          // SliverAppBar jatuh balik ke tema ini untuk warna, elevasi, dan
          // titleTextStyle, sehingga AppBar dan SliverAppBar tampil identik.
          appBarTheme: AppBarTheme(
            backgroundColor: KarsaColors.background,
            foregroundColor: KarsaColors.ink,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            centerTitle: false,
            iconTheme: const IconThemeData(color: KarsaColors.ink, size: 24),
            actionsIconTheme: const IconThemeData(color: KarsaColors.ink, size: 24),
            titleTextStyle: const TextStyle(
              color: KarsaColors.ink,
              fontSize: KarsaType.headline,
              fontWeight: FontWeight.w800,
            ),
          ),
          cardTheme: CardThemeData(
            elevation: 0,
            margin: EdgeInsets.zero,
            color: KarsaColors.card,
            shadowColor: Colors.black.withValues(alpha: .04),
            shape: RoundedRectangleBorder(
              borderRadius: const BorderRadius.all(Radius.circular(KarsaRadius.card)),
              side: const BorderSide(color: KarsaColors.border),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: KarsaSpace.lg, vertical: KarsaSpace.lg,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: const BorderRadius.all(Radius.circular(KarsaRadius.md)),
              borderSide: const BorderSide(color: KarsaColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: const BorderRadius.all(Radius.circular(KarsaRadius.md)),
              borderSide: BorderSide(color: scheme.primary, width: 1.6),
            ),
            filled: true,
            fillColor: KarsaColors.card,
            border: OutlineInputBorder(
              borderRadius: const BorderRadius.all(Radius.circular(KarsaRadius.md)),
            ),
          ),
          chipTheme: ChipThemeData(
            shape: const StadiumBorder(),
            side: const BorderSide(color: KarsaColors.border),
            materialTapTargetSize: MaterialTapTargetSize.padded,
            selectedColor: scheme.primaryContainer,
            checkmarkColor: scheme.onPrimaryContainer,
            labelStyle: const TextStyle(
              color: KarsaColors.ink,
              fontSize: KarsaType.body,
              fontWeight: FontWeight.w700,
            ),
          ),
          bottomSheetTheme: BottomSheetThemeData(
            backgroundColor: KarsaColors.background,
            surfaceTintColor: Colors.transparent,
            modalBackgroundColor: KarsaColors.background,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(KarsaRadius.sheet),
              ),
            ),
          ),
          dialogTheme: DialogThemeData(
            backgroundColor: KarsaColors.card,
            surfaceTintColor: Colors.transparent,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(KarsaRadius.card)),
            ),
          ),
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: KarsaColors.card,
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
