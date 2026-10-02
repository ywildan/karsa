import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:app_links/app_links.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'legal_links.dart';
import 'models.dart';

enum SessionState { loading, unavailable, signedOut, authenticating, signedIn }

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
  int _authAttempt = 0;
  bool _exchanging = false;

  bool get waitingForBrowser => state == SessionState.authenticating && !_exchanging;

  Future<void> initialize() async {
    try {
      _linkSubscription = _appLinks.uriLinkStream.listen(
        handleAuthLink,
        onError: (_) => _setError('Tautan masuk tidak dapat dibaca.'),
      );
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null && _isAuthLink(initialLink)) {
        await handleAuthLink(initialLink);
        return;
      }
      await retrySession();
    } catch (_) {
      state = SessionState.unavailable;
      error = 'Aplikasi belum dapat dibuka. Periksa koneksi dan coba lagi.';
      notifyListeners();
    }
  }

  Future<void> retrySession() async {
    state = SessionState.loading;
    error = null;
    notifyListeners();
    try {
      if (await api.restoreSession()) {
        user = await api.me();
        state = SessionState.signedIn;
      } else {
        state = SessionState.signedOut;
      }
    } catch (exception) {
      if (exception is ApiException && exception.statusCode == 401) {
        await api.clearSession();
        user = null;
        state = SessionState.signedOut;
      } else {
        state = SessionState.unavailable;
        error = 'Sesi belum dapat diperiksa. Periksa koneksi dan coba lagi.';
      }
    }
    notifyListeners();
  }

  Future<void> signIn({required bool termsAccepted}) async {
    if (state == SessionState.authenticating) return;
    if (!termsAccepted) {
      _setError('Baca dan setujui Syarat Penggunaan sebelum masuk.');
      return;
    }
    final attempt = ++_authAttempt;
    _exchanging = false;
    error = null;
    state = SessionState.authenticating;
    notifyListeners();
    try {
      final stateValue = _randomToken(32);
      final verifier = _randomToken(64);
      final challenge = base64Url
          .encode(sha256.convert(ascii.encode(verifier)).bytes)
          .replaceAll('=', '');
      await _storage.write(key: 'oauth_state', value: stateValue);
      await _storage.write(key: 'oauth_verifier', value: verifier);
      await _storage.write(key: 'oauth_legal_version', value: legalDocumentVersion);
      if (attempt != _authAttempt) return;

      final uri = Uri.parse('$apiBaseUrl/api/mobile/v1/auth/start').replace(
        queryParameters: {
          'state': stateValue,
          'code_challenge': challenge,
          'redirect_uri': 'karsa://auth/callback',
        },
      );
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && attempt == _authAttempt) {
        state = SessionState.signedOut;
        _setError('Browser tidak dapat dibuka. Coba lagi.');
      }
    } catch (exception) {
      if (attempt == _authAttempt) {
        state = SessionState.signedOut;
        _setError(_message(exception));
      }
    }
  }

  Future<void> cancelSignIn() async {
    if (!waitingForBrowser) return;
    ++_authAttempt;
    // Tetap menonaktifkan tombol masuk sampai data percobaan lama dibersihkan.
    _exchanging = true;
    notifyListeners();
    try {
      await _clearOAuthValues();
    } finally {
      _exchanging = false;
      state = SessionState.signedOut;
      error = null;
      notifyListeners();
    }
  }

  Future<void> handleAuthLink(Uri uri) async {
    if (!_isAuthLink(uri) || _exchanging) return;
    final attempt = ++_authAttempt;
    _exchanging = true;
    state = SessionState.authenticating;
    error = null;
    notifyListeners();
    try {
      final expectedState = await _storage.read(key: 'oauth_state');
      final verifier = await _storage.read(key: 'oauth_verifier');
      final acceptedLegalVersion = await _storage.read(key: 'oauth_legal_version');
      final returnedState = uri.queryParameters['state'];
      final code = uri.queryParameters['code'];
      final authError = uri.queryParameters['error'];
      if (authError == 'not_eligible') {
        throw const ApiException('Aplikasi ini hanya tersedia untuk akun mahasiswa UNTIDAR.');
      }
      if (authError == 'temporarily_unavailable') {
        throw const ApiException('Layanan data sedang tidak tersedia. Coba lagi sebentar.');
      }
      if (expectedState == null || verifier == null ||
          acceptedLegalVersion == null || expectedState != returnedState ||
          code == null) {
        throw const ApiException('Proses masuk tidak valid atau sudah kedaluwarsa. Silakan masuk lagi.');
      }
      await api.exchangeCode(code, verifier, acceptedTermsVersion: acceptedLegalVersion);
      final profile = await api.me();
      if (attempt != _authAttempt) return;
      await _clearOAuthValues();
      user = profile;
      state = SessionState.signedIn;
    } catch (exception) {
      if (attempt == _authAttempt) {
        state = SessionState.signedOut;
        error = _message(exception);
      }
    } finally {
      if (attempt == _authAttempt) {
        _exchanging = false;
        notifyListeners();
      }
    }
  }

  Future<void> refreshUser() async {
    final profile = await api.me();
    if (state != SessionState.signedIn) return;
    user = profile;
    notifyListeners();
  }

  Future<void> signOut() async {
    ++_authAttempt;
    _exchanging = false;
    state = SessionState.loading;
    notifyListeners();
    try {
      await api.logout();
    } catch (exception) {
      error = _message(exception);
    } finally {
      user = null;
      state = SessionState.signedOut;
      notifyListeners();
    }
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
    await _storage.delete(key: 'oauth_legal_version');
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
