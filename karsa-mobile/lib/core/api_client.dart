import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
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
  int _sessionGeneration = 0;
  Future<void> _storageQueue = Future<void>.value();
  final ValueNotifier<int> pointsRevision = ValueNotifier(0);

  /// Dinaikkan saat refresh token ditolak server dan sesi lokal sudah
  /// dihapus. AppController mendengarkan ini supaya layar langsung
  /// kembali ke halaman masuk, bukan menampilkan data basi selamanya.
  final ValueNotifier<int> sessionExpired = ValueNotifier<int>(0);

  Uri endpoint(String path, [Map<String, String>? query]) {
    final base = Uri.parse('$apiBaseUrl/api/mobile/v1$path');
    if (query == null || query.isEmpty) return base;
    // Gabungkan, jangan timpa: path kadang sudah membawa query sendiri
    // (mis. cursor paginasi) dan parameter tambahan tidak boleh
    // menghapusnya.
    return base.replace(queryParameters: {...base.queryParameters, ...query});
  }

  Future<bool> restoreSession() async {
    final generation = _sessionGeneration;
    return _withStorage(() async {
      if (generation != _sessionGeneration) return false;
      try {
        final access = await _storage.read(key: 'access_token');
        final refresh = await _storage.read(key: 'refresh_token');
        if (generation != _sessionGeneration) return false;
        _accessToken = access;
        _refreshToken = refresh;
        return access != null && refresh != null;
      } on PlatformException catch (error) {
        final diagnostic = '${error.message} ${error.details}';
        if (!RegExp(
          'Failed to unwrap key|InvalidKeyException|BadPaddingException|AEADBadTagException',
        ).hasMatch(diagnostic)) {
          rethrow;
        }
        // Backup ciphertext cannot be decrypted with another device's key.
        // Reset this app's secure store (including stale OAuth values).
        if (generation != _sessionGeneration) return false;
        _sessionGeneration++;
        _accessToken = null;
        _refreshToken = null;
        _refreshInFlight = null;
        await _storage.deleteAll();
        return false;
      }
    });
  }

  Future<void> exchangeCode(
    String code,
    String verifier, {
    required String acceptedTermsVersion,
  }) async {
    final generation = ++_sessionGeneration;
    _refreshInFlight = null;
    final data =
        await _request(
              'POST',
              '/auth/exchange',
              authenticated: false,
              body: {
                'code': code,
                'code_verifier': verifier,
                'device_name': 'Karsa Mobile',
                'accepted_terms_version': acceptedTermsVersion,
              },
            )
            as Map<String, dynamic>;
    if (!await _storeTokens(data, generation)) {
      throw const ApiException('Proses masuk sudah dibatalkan.');
    }
  }

  Future<AppUser> me() async {
    final data = await _request('GET', '/me') as Map<String, dynamic>;
    return AppUser.fromJson(data);
  }

  Future<void> logout() async {
    final accessToken = _accessToken;
    // Invalidate immediately, before waiting for the network. Late refresh
    // responses must never resurrect a session the user has signed out of.
    await clearSession();
    if (accessToken != null) {
      await _request(
        'POST',
        '/auth/logout',
        authenticated: false,
        retry: false,
        extraHeaders: {'Authorization': 'Bearer $accessToken'},
      );
    }
  }

  Future<void> clearSession() async {
    _sessionGeneration++;
    _accessToken = null;
    _refreshToken = null;
    _refreshInFlight = null;
    await _withStorage(() async {
      await _storage.delete(key: 'access_token');
      await _storage.delete(key: 'refresh_token');
    });
  }

  Future<List<Assignment>> assignments() async {
    final data = await _request('GET', '/pj/assignments') as List;
    return data
        .map((item) => Assignment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Student>> students(String assignmentId) async {
    final data =
        await _request('GET', '/pj/assignments/$assignmentId/students')
            as Map<String, dynamic>;
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
    final data =
        await _request(
              'POST',
              '/points',
              extraHeaders: {'Idempotency-Key': idempotencyKey},
              body: {
                'kelas_matkul_id': assignmentId,
                'mahasiswa_id': studentId,
                'kategori_id': categoryId,
                'poin': points,
                if (note != null && note.trim().isNotEmpty)
                  'catatan': note.trim(),
              },
            )
            as Map<String, dynamic>;
    pointsRevision.value++;
    return data['message'] as String? ?? 'Poin berhasil dicatat.';
  }

  Future<List<PointHistory>> pointHistory() async {
    final data = await _request('GET', '/points') as List;
    return data
        .map((item) => PointHistory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<String> deletePoint(String id) async {
    final data =
        await _request('DELETE', '/points/$id') as Map<String, dynamic>;
    pointsRevision.value++;
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
    final data =
        await _request('GET', '/leaderboard/$assignmentId')
            as Map<String, dynamic>;
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
    final data =
        await _request(
              'GET',
              '/groups/$assignmentId/messages${cursor == null ? '' : '?cursor=${Uri.encodeQueryComponent(cursor)}'}',
            )
            as Map<String, dynamic>;
    return GroupMessagePage.fromJson(data);
  }

  Future<GroupMessageItem> sendGroupMessage({
    required String assignmentId,
    required String text,
    required String idempotencyKey,
    String? replyToId,
  }) async {
    final data =
        await _request(
              'POST',
              '/groups/$assignmentId/messages',
              extraHeaders: {'Idempotency-Key': idempotencyKey},
              body: {'text': text, 'reply_to_id': replyToId},
            )
            as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  /// Refresh every loaded page, including old messages whose moderation or
  /// block status changed. The endpoint retains soft-deleted message IDs.
  Future<GroupMessagePage> refreshGroupMessages(
    String assignmentId, {
    String? oldestMessageId,
  }) async {
    final latest = await groupMessages(assignmentId);
    final messages = [...latest.messages];
    var cursor = latest.nextCursor;
    final seen = <String>{};
    while (oldestMessageId != null &&
        !messages.any((message) => message.id == oldestMessageId) &&
        cursor != null &&
        seen.add(cursor)) {
      final older = await groupMessages(assignmentId, cursor: cursor);
      messages.insertAll(0, older.messages);
      cursor = older.nextCursor;
    }
    return GroupMessagePage(
      messages: messages,
      pinnedMessages: latest.pinnedMessages,
      isManager: latest.isManager,
      isLocked: latest.isLocked,
      nextCursor: cursor,
    );
  }

  Future<GroupMessageItem> editGroupMessage(
    String assignmentId,
    String messageId,
    String text,
  ) async {
    final data =
        await _request(
              'PATCH',
              '/groups/$assignmentId/messages/$messageId',
              body: {'text': text},
            )
            as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<GroupMessageItem> deleteGroupMessage(
    String assignmentId,
    String messageId,
  ) async {
    final data =
        await _request('DELETE', '/groups/$assignmentId/messages/$messageId')
            as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<GroupMessageItem> pinGroupMessage(
    String assignmentId,
    String messageId,
    bool pinned,
  ) async {
    final data =
        await _request(
              'POST',
              '/groups/$assignmentId/messages/$messageId/pin',
              body: {'pinned': pinned},
            )
            as Map<String, dynamic>;
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
    final data =
        await _request(
              'POST',
              '/groups/$assignmentId/messages/$messageId/hide',
              body: {
                'hidden': hidden,
                if (reason != null && reason.trim().isNotEmpty)
                  'reason': reason.trim(),
              },
            )
            as Map<String, dynamic>;
    return GroupMessageItem.fromJson(data);
  }

  Future<bool> reportGroupMessage(
    String assignmentId,
    String messageId, {
    required String reason,
    String? details,
  }) async {
    final data =
        await _request(
              'POST',
              '/groups/$assignmentId/messages/$messageId/reports',
              body: {
                'reason': reason,
                if (details != null && details.trim().isNotEmpty)
                  'details': details.trim(),
              },
            )
            as Map<String, dynamic>;
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

  Future<LibBootstrap> libBootstrap() async {
    final data =
        await _request('GET', '/lib/bootstrap') as Map<String, dynamic>;
    return LibBootstrap.fromJson(data);
  }

  Future<LibProfileInfo> createLibProfile({
    required String displayName,
    required String facultyId,
    required String programId,
    String? classId,
  }) async {
    final data =
        await _request(
              'POST',
              '/lib/profile',
              body: {
                'display_name': displayName,
                'faculty_id': facultyId,
                'prodi_id': programId,
                'kelas_id': classId,
              },
            )
            as Map<String, dynamic>;
    return LibProfileInfo.fromJson(data);
  }

  Future<List<LibArticle>> libFeed({
    String sort = 'latest',
    String query = '',
  }) async {
    final data =
        await _request(
              'GET',
              '/lib/feed',
              query: {'sort': sort, if (query.isNotEmpty) 'q': query},
            )
            as List;
    return data
        .map((item) => LibArticle.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<LibArticle> libArticle(String articleId) async {
    final data =
        await _request('GET', '/lib/articles/$articleId')
            as Map<String, dynamic>;
    return LibArticle.fromJson(data);
  }

  Future<LibAiState> libAiState(String articleId, String revision) async {
    final data = await _request('GET', '/lib/articles/$articleId/ai',
      query: {'revision': revision}) as Map<String, dynamic>;
    return LibAiState.fromJson(data);
  }

  Future<Map<String, dynamic>> libAiSummary(String articleId, String revision) async {
    return await _request('POST', '/lib/articles/$articleId/ai/summary',
      body: {'revision': revision}, requestTimeout: const Duration(seconds: 45)) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> askLibAi(String articleId, {
    required String revision, required String question, required String requestId,
    bool webSearch = false,
  }) async {
    return await _request('POST', '/lib/articles/$articleId/ai/messages',
      body: {'revision': revision, 'question': question, 'request_id': requestId, 'web_search': webSearch},
      requestTimeout: const Duration(seconds: 45)) as Map<String, dynamic>;
  }

  Future<LibAuthorProfile> libAuthorProfile(String authorId) async {
    final data =
        await _request('GET', '/lib/authors/$authorId') as Map<String, dynamic>;
    return LibAuthorProfile.fromJson(data);
  }

  Future<List<LibArticle>> libVault() async {
    final data = await _request('GET', '/lib/vault') as List;
    return data
        .map((item) => LibArticle.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<LibArticle> createLibArticle({
    required String title,
    required String body,
  }) async {
    final data =
        await _request(
              'POST',
              '/lib/articles',
              body: {'title': title, 'body': body},
            )
            as Map<String, dynamic>;
    return LibArticle.fromJson(data);
  }

  Future<LibArticle> updateLibArticle(
    String articleId, {
    required String action,
    String? title,
    String? body,
  }) async {
    final data =
        await _request(
              'PATCH',
              '/lib/articles/$articleId',
              body: {
                'action': action,
                if (title != null) 'title': title,
                if (body != null) 'body': body,
              },
            )
            as Map<String, dynamic>;
    return LibArticle.fromJson(data);
  }

  Future<void> deleteLibDraft(String articleId) async {
    await _request('DELETE', '/lib/articles/$articleId');
  }

  Future<List<LibComment>> libComments(String articleId) async {
    final data =
        await _request('GET', '/lib/articles/$articleId/comments') as List;
    return data
        .map((item) => LibComment.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<LibComment> createLibComment(
    String articleId, {
    required String body,
    String? parentId,
  }) async {
    final data =
        await _request(
              'POST',
              '/lib/articles/$articleId/comments',
              body: {'body': body, 'parent_id': parentId},
            )
            as Map<String, dynamic>;
    return LibComment.fromJson(data);
  }

  Future<void> deleteLibComment(String commentId) async {
    await _request('DELETE', '/lib/comments/$commentId');
  }

  Future<Map<String, dynamic>> requestLibAuthor({
    required String motivation,
    required String topics,
    String? instagramUsername,
    String? tiktokUsername,
  }) async =>
      await _request(
            'POST',
            '/lib/author-requests',
            body: {
              'motivation': motivation,
              'topics': topics,
              if (instagramUsername != null) 'instagram_username': instagramUsername,
              if (tiktokUsername != null) 'tiktok_username': tiktokUsername,
              'accepted_guidelines': true,
            },
          )
          as Map<String, dynamic>;

  Future<void> reportLibContent({
    String? articleId,
    String? commentId,
    required String reason,
    String? details,
  }) async {
    await _request(
      'POST',
      '/lib/reports',
      body: {
        if (articleId != null) 'article_id': articleId,
        if (commentId != null) 'comment_id': commentId,
        'reason': reason,
        'details': details,
      },
    );
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    bool authenticated = true,
    Map<String, String>? extraHeaders,
    bool retry = true,
    Duration requestTimeout = const Duration(seconds: 20),
  }) async {
    final generation = _sessionGeneration;
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (authenticated && _accessToken != null)
        'Authorization': 'Bearer $_accessToken',
      ...?extraHeaders,
    };
    final request = http.Request(method, endpoint(path, query))
      ..headers.addAll(headers);
    if (body != null) {
      request.body = jsonEncode(body);
    }

    final streamed = await _http
        .send(request)
        .timeout(requestTimeout);
    // Timeout kedua menjaga badan respons yang menggantung setelah
    // header diterima; tanpa ini pembacaan stream bisa menunggu selamanya.
    final response = await http.Response.fromStream(
      streamed,
    ).timeout(requestTimeout);
    if (authenticated && generation != _sessionGeneration) {
      throw const ApiException(
        'Sesi telah berubah. Silakan masuk kembali.',
        statusCode: 401,
      );
    }
    if (response.statusCode == 401 &&
        authenticated &&
        retry &&
        await _refresh()) {
      if (generation != _sessionGeneration) {
        throw const ApiException('Sesi telah berubah.', statusCode: 401);
      }
      return _request(
        method,
        path,
        body: body,
        query: query,
        authenticated: authenticated,
        extraHeaders: extraHeaders,
        retry: false,
        requestTimeout: requestTimeout,
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
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        envelope['ok'] != true) {
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
    return refresh.whenComplete(() {
      if (identical(_refreshInFlight, refresh)) _refreshInFlight = null;
    });
  }

  Future<bool> _performRefresh() async {
    final generation = _sessionGeneration;
    final refreshToken = _refreshToken;
    if (refreshToken == null) {
      return false;
    }
    try {
      final data =
          await _request(
                'POST',
                '/auth/refresh',
                authenticated: false,
                retry: false,
                body: {'refresh_token': refreshToken},
              )
              as Map<String, dynamic>;
      return await _storeTokens(data, generation);
    } on ApiException catch (error) {
      if (generation != _sessionGeneration) return false;
      if (error.statusCode == 401) {
        await clearSession();
        sessionExpired.value++;
        return false;
      }
      rethrow;
    }
  }

  Future<bool> _storeTokens(Map<String, dynamic> data, int generation) =>
      _withStorage(() async {
        if (generation != _sessionGeneration) return false;
        final access = data['access_token'] as String;
        final refresh = data['refresh_token'] as String;
        await _storage.write(key: 'access_token', value: access);
        await _storage.write(key: 'refresh_token', value: refresh);
        if (generation != _sessionGeneration) return false;
        _accessToken = access;
        _refreshToken = refresh;
        return true;
      });

  Future<T> _withStorage<T>(Future<T> Function() operation) {
    final result = Completer<T>();
    _storageQueue = _storageQueue.then((_) async {
      try {
        result.complete(await operation());
      } catch (error, stack) {
        result.completeError(error, stack);
      }
    });
    return result.future;
  }
}
