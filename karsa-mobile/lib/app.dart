import 'package:flutter/material.dart';

import 'core/app_controller.dart';
import 'screens/home_shell.dart';
import 'screens/sign_in_screen.dart';

class KarsaApp extends StatelessWidget {
  const KarsaApp({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFFC65D16);
    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
      surface: const Color(0xFFFFFBF7),
    );
    return MaterialApp(
      title: 'SiKarsa',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: scheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFFFFBF7),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFFFFBF7),
          surfaceTintColor: Colors.transparent,
          centerTitle: false,
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
          SessionState.signedOut || SessionState.authenticating =>
            SignInScreen(controller: controller),
          SessionState.signedIn => HomeShell(controller: controller),
        },
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
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(size * .3),
        ),
        alignment: Alignment.center,
        child: Text(
          'K',
          style: TextStyle(
            color: Colors.white,
            fontSize: size * .5,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
}
