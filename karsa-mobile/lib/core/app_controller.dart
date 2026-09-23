import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:app_links/app_links.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'models.dart';

enum SessionState { loading, signedOut, authenticating, signedIn }

class AppController extends ChangeNotifier {
  AppController(
    this.api, {
    AppLinks? appLinks,
    FlutterSecureStorage? storage,
  })  : _appLinks = appLinks ?? AppLinks(),
        _storage = storage ?? const FlutterSecureStorage();

  final ApiClient api;
  final AppLinks _appLinks;
  final FlutterSecureStorage _storage;
  StreamSubscription<Uri>? _linkSubscription;

  SessionState state = SessionState.loading;
  AppUser? user;
  String? error;

  Future<void> initialize() async {
    _linkSubscription = _appLinks.uriLinkStream.listen(
      handleAuthLink,
      onError: (_) => _setError('Tautan masuk tidak dapat dibaca.'),
    );
    final initialLink = await _appLinks.getInitialLink();
    if (initialLink != null && _isAuthLink(initialLink)) {
      await handleAuthLink(initialLink);
      return;
    }

    if (await api.restoreSession()) {
      try {
        user = await api.me();
        state = SessionState.signedIn;
      } catch (_) {
        await api.clearSession();
        state = SessionState.signedOut;
      }
    } else {
      state = SessionState.signedOut;
    }
    notifyListeners();
  }

  Future<void> signIn() async {
    error = null;
    state = SessionState.authenticating;
    notifyListeners();

    final stateValue = _randomToken(32);
    final verifier = _randomToken(64);
    final challenge = base64Url
        .encode(sha256.convert(ascii.encode(verifier)).bytes)
        .replaceAll('=', '');
    await _storage.write(key: 'oauth_state', value: stateValue);
    await _storage.write(key: 'oauth_verifier', value: verifier);

    final uri = Uri.parse('$apiBaseUrl/api/mobile/v1/auth/start').replace(
      queryParameters: {
        'state': stateValue,
        'code_challenge': challenge,
        'redirect_uri': 'karsa://auth/callback',
      },
    );
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened) {
      state = SessionState.signedOut;
      _setError('Browser tidak dapat dibuka. Coba lagi.');
    }
  }

  Future<void> handleAuthLink(Uri uri) async {
    if (!_isAuthLink(uri)) return;
    state = SessionState.authenticating;
    error = null;
    notifyListeners();

    final expectedState = await _storage.read(key: 'oauth_state');
    final verifier = await _storage.read(key: 'oauth_verifier');
    final returnedState = uri.queryParameters['state'];
    final code = uri.queryParameters['code'];
    final authError = uri.queryParameters['error'];

    if (authError == 'not_eligible') {
      state = SessionState.signedOut;
      _setError('Aplikasi ini hanya tersedia untuk mahasiswa dan PJ aktif.');
      return;
    }
    if (expectedState == null || verifier == null || expectedState != returnedState || code == null) {
      state = SessionState.signedOut;
      _setError('Proses masuk tidak valid atau sudah kedaluwarsa.');
      return;
    }

    try {
      await api.exchangeCode(code, verifier);
      user = await api.me();
      state = SessionState.signedIn;
      await _clearOAuthValues();
      notifyListeners();
    } catch (exception) {
      state = SessionState.signedOut;
      _setError(_message(exception));
    }
  }

  Future<void> signOut() async {
    state = SessionState.loading;
    notifyListeners();
    await api.logout();
    user = null;
    state = SessionState.signedOut;
    notifyListeners();
  }

  void clearError() {
    error = null;
    notifyListeners();
  }

  String _randomToken(int byteCount) {
    final random = Random.secure();
    final bytes = List<int>.generate(byteCount, (_) => random.nextInt(256));
    return base64Url.encode(bytes).replaceAll('=', '');
  }

  bool _isAuthLink(Uri uri) => uri.scheme == 'karsa' && uri.host == 'auth' && uri.path == '/callback';

  Future<void> _clearOAuthValues() async {
    await _storage.delete(key: 'oauth_state');
    await _storage.delete(key: 'oauth_verifier');
  }

  void _setError(String message) {
    error = message;
    notifyListeners();
  }

  String _message(Object exception) =>
      exception is ApiException ? exception.message : 'Terjadi gangguan. Silakan coba lagi.';

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }
}
