import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:karsa_mobile/core/api_client.dart';
import 'package:karsa_mobile/core/app_controller.dart';
import 'package:karsa_mobile/core/models.dart';
import 'package:karsa_mobile/app.dart';
import 'package:karsa_mobile/screens/sign_in_screen.dart';

class SessionApi extends ApiClient {
  Object? meError;
  bool cleared = false;
  int exchanges = 0;
  Completer<void>? exchangeGate;

  @override
  Future<void> exchangeCode(
    String code,
    String verifier, {
    required String acceptedTermsVersion,
  }) async {
    exchanges++;
    await exchangeGate?.future;
    cleared = false;
  }

  @override
  Future<bool> restoreSession() async => !cleared;

  @override
  Future<AppUser> me() async {
    if (meError != null) throw meError!;
    return AppUser.fromJson({
      'id': 'student',
      'email': 'student@example.com',
      'capabilities': <String, dynamic>{},
    });
  }

  @override
  Future<void> clearSession() async => cleared = true;

  @override
  Future<void> logout() async {
    cleared = true;
    throw http.ClientException('Offline');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // AppController memakai FlutterSecureStorage asli untuk nilai OAuth.
  // Tanpa mock, panggilan delete akan melempar MissingPluginException
  // karena tidak ada platform di dalam flutter test.
  setUp(() {
    FlutterSecureStorage.setMockInitialValues(<String, String>{});
  });

  test(
    'startup keeps session on temporary failure and supports retry',
    () async {
      final api = SessionApi()..meError = http.ClientException('Offline');
      final controller = AppController(api);
      addTearDown(controller.dispose);
      await controller.retrySession();
      expect(api.cleared, isFalse);
      expect(controller.state, SessionState.unavailable);
      api.meError = null;
      await controller.retrySession();
      expect(controller.state, SessionState.signedIn);
      expect(controller.user!.id, 'student');
      expect(controller.error, isNull);
    },
  );

  test('startup clears a genuinely expired session', () async {
    final api = SessionApi()
      ..meError = const ApiException('Expired', statusCode: 401);
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    expect(api.cleared, isTrue);
    expect(controller.state, SessionState.signedOut);
  });

  test('logout reaches signedOut even when remote request fails', () async {
    final api = SessionApi();
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    expect(controller.state, SessionState.signedIn);
    await controller.signOut();
    expect(api.cleared, isTrue);
    expect(controller.state, SessionState.signedOut);
    expect(controller.user, isNull);
  });

  test('token kedaluwarsa mengembalikan layar ke signedOut', () async {
    final api = SessionApi();
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    expect(controller.state, SessionState.signedIn);

    // ApiClient menaikkan sessionExpired setelah refresh ditolak server
    // dan token lokal dihapus. Aplikasi tidak boleh tetap menampilkan
    // data basi dengan state signedIn.
    api.sessionExpired.value++;
    expect(controller.state, SessionState.signedOut);
    expect(controller.user, isNull);
    expect(controller.error, isNotNull);
  });

  test('keluar menghapus sisa nilai OAuth di perangkat', () async {
    FlutterSecureStorage.setMockInitialValues(<String, String>{
      'oauth_state': 'state-token',
      'oauth_verifier': 'verifier-token',
      'oauth_legal_version': '1.0',
    });
    final api = SessionApi();
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    await controller.signOut();

    const storage = FlutterSecureStorage();
    expect(await storage.read(key: 'oauth_state'), isNull);
    expect(await storage.read(key: 'oauth_verifier'), isNull);
    expect(await storage.read(key: 'oauth_legal_version'), isNull);
  });

  test(
    'token kedaluwarsa saat sudah signedOut tidak mengubah apa pun',
    () async {
      final api = SessionApi()..cleared = true;
      final controller = AppController(api);
      addTearDown(controller.dispose);
      await controller.retrySession();
      expect(controller.state, SessionState.signedOut);
      expect(controller.error, isNull);

      api.sessionExpired.value++;
      expect(controller.state, SessionState.signedOut);
      expect(controller.error, isNull);
    },
  );

  test('stale callback does not sign out an active account', () async {
    final api = SessionApi();
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    await controller.handleAuthLink(
      Uri.parse('karsa://auth/callback?state=wrong&code=old'),
    );
    expect(controller.state, SessionState.signedIn);
    expect(controller.user!.id, 'student');
    expect(api.exchanges, 0);
  });

  for (final suffix in ['code=old', 'error=not_eligible']) {
    test('wrong OAuth state preserves the pending login ($suffix)', () async {
      FlutterSecureStorage.setMockInitialValues({
        'oauth_state': 'expected',
        'oauth_verifier': 'verifier',
        'oauth_legal_version': '1.0',
      });
      final api = SessionApi()..cleared = true;
      final controller = AppController(api)
        ..state = SessionState.authenticating;
      addTearDown(controller.dispose);
      await controller.handleAuthLink(
        Uri.parse('karsa://auth/callback?state=wrong&$suffix'),
      );
      expect(controller.state, SessionState.authenticating);
      expect(controller.error, isNull);
      expect(
        await const FlutterSecureStorage().read(key: 'oauth_verifier'),
        'verifier',
      );
      expect(api.exchanges, 0);
    });
  }

  test(
    'duplicate startup and stream callbacks exchange the code only once',
    () async {
      FlutterSecureStorage.setMockInitialValues({
        'oauth_state': 'expected',
        'oauth_verifier': 'verifier',
        'oauth_legal_version': '1.0',
      });
      final gate = Completer<void>();
      final api = SessionApi()..exchangeGate = gate;
      final controller = AppController(api);
      addTearDown(controller.dispose);
      final link = Uri.parse('karsa://auth/callback?state=expected&code=valid');
      final first = controller.handleAuthLink(link);
      final second = controller.handleAuthLink(link);
      await Future<void>.delayed(Duration.zero);
      expect(api.exchanges, 1);
      gate.complete();
      await Future.wait([first, second]);
      expect(controller.state, SessionState.signedIn);
      expect(
        await const FlutterSecureStorage().read(key: 'oauth_state'),
        isNull,
      );
    },
  );

  test('matching error callback finishes only its own login attempt', () async {
    FlutterSecureStorage.setMockInitialValues({
      'oauth_state': 'expected',
      'oauth_verifier': 'verifier',
      'oauth_legal_version': '1.0',
    });
    final controller = AppController(SessionApi())
      ..state = SessionState.authenticating;
    addTearDown(controller.dispose);
    await controller.handleAuthLink(
      Uri.parse('karsa://auth/callback?state=expected&error=not_eligible'),
    );
    expect(controller.state, SessionState.signedOut);
    expect(controller.error, contains('UNTIDAR'));
    expect(await const FlutterSecureStorage().read(key: 'oauth_state'), isNull);
  });

  testWidgets(
    'expiration removes private routes even if they block back navigation',
    (tester) async {
      final api = SessionApi();
      final controller = AppController(api);
      addTearDown(controller.dispose);
      await controller.retrySession();
      await tester.pumpWidget(KarsaApp(controller: controller));
      final navigator = tester.state<NavigatorState>(find.byType(Navigator));
      unawaited(
        navigator.push<void>(
          MaterialPageRoute(
            builder: (_) => const PopScope(
              canPop: false,
              child: Scaffold(body: Text('PRIVATE EDITOR DATA')),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('PRIVATE EDITOR DATA'), findsOneWidget);
      api.sessionExpired.value++;
      await tester.pumpAndSettle();
      expect(find.text('PRIVATE EDITOR DATA'), findsNothing);
      expect(find.byType(SignInScreen), findsOneWidget);
      expect(
        tester.state<NavigatorState>(find.byType(Navigator)).canPop(),
        isFalse,
      );
    },
  );
}
