import 'dart:async';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:karsa_mobile/core/api_client.dart';

class ControlledStorage extends FlutterSecureStorage {
  PlatformException? readError;
  int resets = 0;
  Completer<void>? writeGate;
  final writeStarted = Completer<void>();

  @override
  Future<String?> read({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (readError != null) throw readError!;
    return super.read(key: key);
  }

  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (key == 'access_token' && writeGate != null) {
      writeStarted.complete();
      await writeGate!.future;
      writeGate = null;
    }
    await super.write(key: key, value: value);
  }

  @override
  Future<void> deleteAll({
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    resets++;
    readError = null;
    await super.deleteAll();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(
    () => FlutterSecureStorage.setMockInitialValues({
      'access_token': 'old-access',
      'refresh_token': 'old-refresh',
      'oauth_state': 'old-state',
    }),
  );

  test('unreadable backup is reset so a fresh login can proceed', () async {
    final storage = ControlledStorage()
      ..readError = PlatformException(
        code: 'Exception encountered',
        message: 'Failed to unwrap key',
        details: 'java.security.InvalidKeyException',
      );
    final api = ApiClient(storage: storage);
    expect(await api.restoreSession(), isFalse);
    expect(storage.resets, 1);
    expect(await storage.read(key: 'oauth_state'), isNull);
  });

  test('temporary platform failure preserves existing secure values', () async {
    final storage = ControlledStorage()
      ..readError = PlatformException(
        code: 'unavailable',
        message: 'Device is locked',
      );
    final api = ApiClient(storage: storage);
    await expectLater(api.restoreSession(), throwsA(isA<PlatformException>()));
    expect(storage.resets, 0);
    expect(
      await const FlutterSecureStorage().read(key: 'refresh_token'),
      'old-refresh',
    );
  });

  test(
    'clearing during a token write leaves no partially stored session',
    () async {
      final gate = Completer<void>();
      final storage = ControlledStorage()..writeGate = gate;
      final api = ApiClient(
        storage: storage,
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'ok': true,
              'data': {'access_token': 'new', 'refresh_token': 'new-refresh'},
            }),
            200,
          ),
        ),
      );
      final exchange = expectLater(
        api.exchangeCode('code', 'verifier', acceptedTermsVersion: '1.0'),
        throwsA(isA<ApiException>()),
      );
      await storage.writeStarted.future;
      final clear = api.clearSession();
      gate.complete();
      await Future.wait([exchange, clear]);
      expect(await api.restoreSession(), isFalse);
      expect(await storage.read(key: 'access_token'), isNull);
      expect(await storage.read(key: 'refresh_token'), isNull);
    },
  );
}
