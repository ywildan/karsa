import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'models.dart';

const apiBaseUrl = String.fromEnvironment(
  'KARSA_API_BASE_URL',
  defaultValue: 'https://www.sikarsa.id',
);

class ApiException implements Exception {
  const ApiException(this.message, {this.code, this.statusCode});
  final String message;
  final String? code;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? httpClient, FlutterSecureStorage? storage})
      : _http = httpClient ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  final http.Client _http;
  final FlutterSecureStorage _storage;
  String? _accessToken;
  String? _refreshToken;
  Future<bool>? _refreshInFlight;

  Uri endpoint(String path, [Map<String, String>? query]) =>
      Uri.parse('$apiBaseUrl/api/mobile/v1$path').replace(queryParameters: query);

  Future<bool> restoreSession() async {
    _accessToken = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');
    return _accessToken != null && _refreshToken != null;
  }

  Future<void> exchangeCode(String code, String verifier) async {
    final data = await _request(
      'POST',
      '/auth/exchange',
      authenticated: false,
      body: {
        'code': code,
        'code_verifier': verifier,
        'device_name': 'Karsa Mobile',
      },
    ) as Map<String, dynamic>;
    await _storeTokens(data);
  }

  Future<AppUser> me() async {
    final data = await _request('GET', '/me') as Map<String, dynamic>;
    return AppUser.fromJson(data);
  }

  Future<void> logout() async {
    try {
      if (_accessToken != null) {
        await _request('POST', '/auth/logout');
      }
    } finally {
      await clearSession();
    }
  }

  Future<void> clearSession() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  Future<List<Assignment>> assignments() async {
    final data = await _request('GET', '/pj/assignments') as List;
    return data
        .map((item) => Assignment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Student>> students(String assignmentId) async {
    final data = await _request(
      'GET',
      '/pj/assignments/$assignmentId/students',
    ) as Map<String, dynamic>;
    return (data['students'] as List)
        .map((item) => Student.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<PointCategory>> categories() async {
    final data = await _request('GET', '/point-categories') as List;
    return data
        .map((item) => PointCategory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<String> createPoint({
    required String assignmentId,
    required String studentId,
    required String categoryId,
    required int points,
    String? note,
    required String idempotencyKey,
  }) async {
    final data = await _request(
      'POST',
      '/points',
      extraHeaders: {'Idempotency-Key': idempotencyKey},
      body: {
        'kelas_matkul_id': assignmentId,
        'mahasiswa_id': studentId,
        'kategori_id': categoryId,
        'poin': points,
        'catatan': note,
      },
    ) as Map<String, dynamic>;
    return data['message'] as String? ?? 'Poin berhasil dicatat.';
  }

  Future<List<PointHistory>> pointHistory() async {
    final data = await _request('GET', '/points') as List;
    return data
        .map((item) => PointHistory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<String> deletePoint(String id) async {
    final data = await _request('DELETE', '/points/$id') as Map<String, dynamic>;
    return data['message'] as String? ?? 'Poin berhasil dihapus.';
  }

  Future<StudentReport> report() async {
    final data = await _request('GET', '/report') as Map<String, dynamic>;
    return StudentReport.fromJson(data);
  }

  Future<List<LeaderboardOption>> leaderboardOptions() async {
    final data = await _request('GET', '/leaderboard/options') as List;
    return data
        .map((item) => LeaderboardOption.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<LeaderboardEntry>> leaderboard(String assignmentId) async {
    final data = await _request(
      'GET',
      '/leaderboard/$assignmentId',
    ) as Map<String, dynamic>;
    return (data['rows'] as List)
        .map((item) => LeaderboardEntry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<GroupSummary>> groups() async {
    final data = await _request('GET', '/groups') as List;
    return data
        .map((item) => GroupSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<GroupMessagePage> groupMessages(
    String assignmentId, {
    String? cursor,
  }) async {
    final data = await _request(
      'GET',
      '/groups/$assignmentId/messages${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
    ) as Map<String, dynamic>;
    return GroupMessagePage.fromJson(data);
  }

  Future<GroupMessageItem> sendGroupMessage({
    required String assignmentId,
    required String text,
    required String idempotencyKey,
    String? replyToId,
  }) async {
    final data = await _request(
      'POST',
      '/groups/$assignmentId/messages',
      extraHeaders: {'Idempotency-Key': idempotencyKey},
      body: {'text': text, 'reply_to_id': replyToId},
    ) as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<GroupMessageItem> editGroupMessage(
    String assignmentId,
    String messageId,
    String text,
  ) async {
    final data = await _request(
      'PATCH',
      '/groups/$assignmentId/messages/$messageId',
      body: {'text': text},
    ) as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<GroupMessageItem> deleteGroupMessage(
    String assignmentId,
    String messageId,
  ) async {
    final data = await _request(
      'DELETE',
      '/groups/$assignmentId/messages/$messageId',
    ) as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<GroupMessageItem> pinGroupMessage(
    String assignmentId,
    String messageId,
    bool pinned,
  ) async {
    final data = await _request(
      'POST',
      '/groups/$assignmentId/messages/$messageId/pin',
      body: {'pinned': pinned},
    ) as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<void> lockGroup(String assignmentId, bool locked) async {
    await _request(
      'POST',
      '/groups/$assignmentId/lock',
      body: {'locked': locked},
    );
  }

  Future<GroupMessageItem> hideGroupMessage(
    String assignmentId,
    String messageId, {
    required bool hidden,
    String? reason,
  }) async {
    final data = await _request(
      'POST',
      '/groups/$assignmentId/messages/$messageId/hide',
      body: {'hidden': hidden, 'reason': reason},
    ) as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<bool> reportGroupMessage(
    String assignmentId,
    String messageId, {
    required String reason,
    String? details,
  }) async {
    final data = await _request(
      'POST',
      '/groups/$assignmentId/messages/$messageId/reports',
      body: {'reason': reason, 'details': details},
    ) as Map<String, dynamic>;
    return data['auto_hidden'] == true;
  }

  Future<void> setGroupBlock(String userId, bool blocked) async {
    await _request(blocked ? 'PUT' : 'DELETE', '/groups/blocks/$userId');
  }

  Future<List<GroupReportItem>> groupReports(String assignmentId) async {
    final data = await _request('GET', '/groups/$assignmentId/reports') as List;
    return data
        .map((item) => GroupReportItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> resolveGroupReport(
    String assignmentId,
    String reportId,
    String action,
  ) async {
    await _request(
      'POST',
      '/groups/$assignmentId/reports/$reportId/resolve',
      body: {'action': action},
    );
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Object? body,
    bool authenticated = true,
    Map<String, String>? extraHeaders,
    bool retry = true,
  }) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (authenticated && _accessToken != null)
        'Authorization': 'Bearer $_accessToken',
      ...?extraHeaders,
    };
    final request = http.Request(method, endpoint(path))
      ..headers.addAll(headers);
    if (body != null) {
      request.body = jsonEncode(body);
    }

    final streamed = await _http.send(request).timeout(const Duration(seconds: 20));
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode == 401 && authenticated && retry && await _refresh()) {
      return _request(
        method,
        path,
        body: body,
        authenticated: authenticated,
        extraHeaders: extraHeaders,
        retry: false,
      );
    }

    Map<String, dynamic> envelope;
    try {
      envelope = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(
        'Server memberikan respons yang tidak dapat dibaca.',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300 || envelope['ok'] != true) {
      final error = envelope['error'] as Map<String, dynamic>?;
      throw ApiException(
        error?['message'] as String? ?? 'Permintaan tidak dapat diproses.',
        code: error?['code'] as String?,
        statusCode: response.statusCode,
      );
    }
    return envelope['data'];
  }

  Future<bool> _refresh() {
    final activeRefresh = _refreshInFlight;
    if (activeRefresh != null) {
      return activeRefresh;
    }
    final refresh = _performRefresh();
    _refreshInFlight = refresh;
    return refresh.whenComplete(() => _refreshInFlight = null);
  }

  Future<bool> _performRefresh() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null) {
      return false;
    }
    try {
      final data = await _request(
        'POST',
        '/auth/refresh',
        authenticated: false,
        retry: false,
        body: {'refresh_token': refreshToken},
      ) as Map<String, dynamic>;
      await _storeTokens(data);
      return true;
    } catch (_) {
      await clearSession();
      return false;
    }
  }

  Future<void> _storeTokens(Map<String, dynamic> data) async {
    _accessToken = data['access_token'] as String;
    _refreshToken = data['refresh_token'] as String;
    await _storage.write(key: 'access_token', value: _accessToken);
    await _storage.write(key: 'refresh_token', value: _refreshToken);
  }
}
