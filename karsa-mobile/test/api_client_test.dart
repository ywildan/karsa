import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:karsa_mobile/core/api_client.dart';

http.Response ok(Object data) =>
    http.Response(jsonEncode({'ok': true, 'data': data}), 200);

http.Response failure(int status) => http.Response(
  jsonEncode({
    'ok': false,
    'error': {'message': 'Request failed'},
  }),
  status,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({
      'access_token': 'old-access',
      'refresh_token': 'old-refresh',
    });
  });

  for (final note in <String?>[null, '', '   ', ' Catatan ']) {
    test('point payload handles optional note: $note', () async {
      final api = ApiClient(
        httpClient: MockClient((request) async {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(request.headers['Idempotency-Key'], 'submission-key-1234');
          if (note == null || note.trim().isEmpty) {
            expect(body.containsKey('catatan'), isFalse);
          } else {
            expect(body['catatan'], 'Catatan');
          }
          return ok({'message': 'Saved'});
        }),
      );
      await api.createPoint(
        assignmentId: 'assignment',
        studentId: 'student',
        categoryId: 'category',
        points: 1,
        note: note,
        idempotencyKey: 'submission-key-1234',
      );
    });
  }

  test('group report omits empty optional details', () async {
    final api = ApiClient(
      httpClient: MockClient((request) async {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body, {'reason': 'SPAM'});
        return ok({'auto_hidden': false});
      }),
    );
    for (final details in <String?>[null, '', '   ']) {
      await api.reportGroupMessage(
        'group',
        'message',
        reason: 'SPAM',
        details: details,
      );
    }
  });

  test('unhide omits absent reason', () async {
    final api = ApiClient(
      httpClient: MockClient((request) async {
        expect(jsonDecode(request.body), {'hidden': false});
        return ok({
          'id': 'message',
          'created_at': '2026-10-01T00:00:00Z',
          'updated_at': '2026-10-01T00:00:00Z',
          'author': {'id': 'author'},
        });
      }),
    );
    await api.hideGroupMessage('group', 'message', hidden: false);
  });

  for (final networkFailure in [true, false]) {
    test(
      'temporary refresh failure preserves tokens (network: $networkFailure)',
      () async {
        final api = ApiClient(
          httpClient: MockClient((request) async {
            if (request.url.path.endsWith('/auth/refresh')) {
              if (networkFailure) throw http.ClientException('Offline');
              return failure(503);
            }
            return failure(401);
          }),
        );
        await api.restoreSession();
        await expectLater(api.me(), throwsA(isA<Exception>()));
        const storage = FlutterSecureStorage();
        expect(await storage.read(key: 'access_token'), 'old-access');
        expect(await storage.read(key: 'refresh_token'), 'old-refresh');
      },
    );
  }

  test('expired refresh token clears session', () async {
    final api = ApiClient(httpClient: MockClient((_) async => failure(401)));
    await api.restoreSession();
    await expectLater(api.me(), throwsA(isA<ApiException>()));
    expect(await api.restoreSession(), isFalse);
  });

  test(
    'successful refresh retries original request with new access token',
    () async {
      var requests = 0;
      final api = ApiClient(
        httpClient: MockClient((request) async {
          requests++;
          if (request.url.path.endsWith('/auth/refresh')) {
            expect(jsonDecode(request.body), {'refresh_token': 'old-refresh'});
            return ok({
              'access_token': 'new-access',
              'refresh_token': 'new-refresh',
            });
          }
          if (request.headers['Authorization'] == 'Bearer old-access')
            return failure(401);
          expect(request.headers['Authorization'], 'Bearer new-access');
          return ok({
            'id': 'student',
            'email': 'student@example.com',
            'capabilities': {},
          });
        }),
      );
      await api.restoreSession();
      expect((await api.me()).id, 'student');
      expect(requests, 3);
      expect(
        await const FlutterSecureStorage().read(key: 'refresh_token'),
        'new-refresh',
      );
    },
  );

  test('failed remote logout still clears local session', () async {
    final api = ApiClient(
      httpClient: MockClient((_) async {
        throw http.ClientException('Offline');
      }),
    );
    await api.restoreSession();
    await expectLater(api.logout(), throwsA(isA<http.ClientException>()));
    expect(await api.restoreSession(), isFalse);
  });
}
