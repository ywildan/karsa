import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:karsa_mobile/core/api_client.dart';
import 'package:karsa_mobile/core/app_controller.dart';
import 'package:karsa_mobile/core/models.dart';

class SessionApi extends ApiClient {
  Object? meError;
  bool cleared = false;

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

  test('token kedaluwarsa saat sudah signedOut tidak mengubah apa pun', () async {
    final api = SessionApi()..cleared = true;
    final controller = AppController(api);
    addTearDown(controller.dispose);
    await controller.retrySession();
    expect(controller.state, SessionState.signedOut);
    expect(controller.error, isNull);

    api.sessionExpired.value++;
    expect(controller.state, SessionState.signedOut);
    expect(controller.error, isNull);
  });
}
