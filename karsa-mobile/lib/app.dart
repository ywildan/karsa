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
          // Menu titik tiga (PopupMenuButton) sebelumnya jatuh ke default
          // Material karena temanya tidak pernah didefinisikan. Samakan
          // dengan bahasa desain card: putih, radius md, border hangat,
          // tanpa surface tint.
          popupMenuTheme: PopupMenuThemeData(
            color: KarsaColors.card,
            surfaceTintColor: Colors.transparent,
            elevation: 6,
            iconColor: KarsaColors.muted,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(KarsaRadius.md)),
              side: BorderSide(color: KarsaColors.border),
            ),
            textStyle: const TextStyle(
              color: KarsaColors.ink,
              fontSize: KarsaType.body,
              fontWeight: FontWeight.w600,
            ),
          ),
          menuTheme: MenuThemeData(
            style: MenuStyle(
              backgroundColor: const WidgetStatePropertyAll(KarsaColors.card),
              surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
              elevation: const WidgetStatePropertyAll(6),
              shape: WidgetStatePropertyAll(
                RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(KarsaRadius.md),
                  side: const BorderSide(color: KarsaColors.border),
                ),
              ),
            ),
          ),
          dropdownMenuTheme: DropdownMenuThemeData(
            menuStyle: MenuStyle(
              backgroundColor: const WidgetStatePropertyAll(KarsaColors.card),
              surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
              elevation: const WidgetStatePropertyAll(6),
              shape: WidgetStatePropertyAll(
                RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(KarsaRadius.md),
                  side: const BorderSide(color: KarsaColors.border),
                ),
              ),
            ),
            textStyle: const TextStyle(
              color: KarsaColors.ink,
              fontSize: KarsaType.body,
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

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();
  late final Animation<double> _logoOpacity = CurvedAnimation(
    parent: _controller, curve: const Interval(0, .55, curve: Curves.easeOut));
  late final Animation<double> _logoScale = Tween<double>(begin: .96, end: 1).animate(
    CurvedAnimation(parent: _controller, curve: const Interval(0, .55, curve: Curves.easeOutCubic)));
  late final Animation<double> _copyOpacity = CurvedAnimation(
    parent: _controller, curve: const Interval(.25, .85, curve: Curves.easeOut));
  late final Animation<Offset> _copySlide = Tween<Offset>(begin: const Offset(0, .06), end: Offset.zero).animate(
    CurvedAnimation(parent: _controller, curve: const Interval(.25, .85, curve: Curves.easeOutCubic)));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Animasi dekoratif saja: pengguna yang menonaktifkan animasi langsung
    // melihat versi akhir, tanpa mengubah status loading.
    if (MediaQuery.disableAnimationsOf(context)) _controller.value = 1;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(KarsaSpace.xl),
      child: Semantics(
        label: 'SiKarsa sedang menyiapkan aplikasi',
        container: true,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          FadeTransition(
            opacity: _logoOpacity,
            child: ScaleTransition(scale: _logoScale, child: const _LogoMark(size: 96)),
          ),
          const SizedBox(height: 24),
          FadeTransition(
            opacity: _copyOpacity,
            child: SlideTransition(position: _copySlide, child: const Column(mainAxisSize: MainAxisSize.min, children: [
              Text('SiKarsa', style: TextStyle(
                fontSize: KarsaType.display,
                fontWeight: FontWeight.w800,
                letterSpacing: -.3,
                color: KarsaColors.ink,
              )),
              SizedBox(height: 6),
              Text('Poin keaktifan, materi, dan diskusi kelas.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: KarsaType.body, height: 1.5, color: KarsaColors.muted)),
            ])),
          ),
          const SizedBox(height: 36),
          const SizedBox(width: 96, height: 3, child: ClipRRect(
            borderRadius: BorderRadius.all(Radius.circular(999)),
            child: LinearProgressIndicator(
              minHeight: 3,
              color: KarsaColors.accentInk,
              backgroundColor: KarsaColors.tintStrong,
            ),
          )),
        ]),
      ),
    ))),
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
