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
  AppController(this.api, {AppLinks? appLinks, FlutterSecureStorage? storage})
    : _appLinks = appLinks ?? AppLinks(),
      _storage = storage ?? const FlutterSecureStorage() {
    // Didaftarkan dari konstruktor agar tetap aktif walau initialize()
    // belum sempat berjalan, misalnya ketika diuji secara langsung.
    api.sessionExpired.addListener(_handleSessionExpired);
  }

  final ApiClient api;
  final AppLinks _appLinks;
  final FlutterSecureStorage _storage;
  StreamSubscription<Uri>? _linkSubscription;

  SessionState state = SessionState.loading;
  AppUser? user;
  String? error;
  int _authAttempt = 0;
  bool _exchanging = false;
  Future<void>? _authLinkInFlight;
  Uri? _activeAuthLink;

  bool get waitingForBrowser =>
      state == SessionState.authenticating && !_exchanging;

  Future<void> initialize() async {
    try {
      _linkSubscription = _appLinks.uriLinkStream.listen(
        handleAuthLink,
        onError: (_) => _setError('Tautan masuk tidak dapat dibaca.'),
      );
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null && _isAuthLink(initialLink)) {
        await handleAuthLink(initialLink);
        // Android STILL menyimpan intent callback yang lama pada task yang
        // sama. Bila pertukaran kodenya gagal (tautan basi, kode habis,
        // jaringan putus), langsung periksa sesi tersimpan agar token yang
        // sah tidak terlempar hanya karena tautan basi.
        if (state == SessionState.signedIn) return;
      }
      await _authLinkInFlight;
      if (state == SessionState.signedIn) return;
      await retrySession();
    } catch (_) {
      state = SessionState.unavailable;
      error = 'Aplikasi belum dapat dibuka. Periksa koneksi dan coba lagi.';
      notifyListeners();
    }
  }

  Future<void> retrySession() async {
    final attempt = ++_authAttempt;
    state = SessionState.loading;
    error = null;
    notifyListeners();
    try {
      final restored = await api.restoreSession();
      if (attempt != _authAttempt) return;
      if (restored) {
        final profile = await api.me();
        if (attempt != _authAttempt) return;
        user = profile;
        state = SessionState.signedIn;
      } else {
        user = null;
        state = SessionState.signedOut;
      }
    } catch (exception) {
      if (attempt != _authAttempt) return;
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
    if (state != SessionState.signedOut || _exchanging) return;
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
      await _storage.write(
        key: 'oauth_legal_version',
        value: legalDocumentVersion,
      );
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
        await _clearOAuthValues();
      }
    } catch (exception) {
      if (attempt == _authAttempt) {
        state = SessionState.signedOut;
        _setError(_message(exception));
        await _clearOAuthValues();
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

  Future<void> handleAuthLink(Uri uri) {
    if (!_isAuthLink(uri) || state == SessionState.signedIn) {
      return Future<void>.value();
    }
    final pending = _authLinkInFlight;
    if (pending != null) {
      if (_activeAuthLink == uri) return pending;
      return pending.then((_) => handleAuthLink(uri));
    }
    final operation = _handleAuthLink(uri);
    _activeAuthLink = uri;
    _authLinkInFlight = operation;
    return operation.whenComplete(() {
      if (identical(_authLinkInFlight, operation)) {
        _authLinkInFlight = null;
        _activeAuthLink = null;
      }
    });
  }

  Future<void> _handleAuthLink(Uri uri) async {
    if (_exchanging) return;
    var attempt = _authAttempt;
    var accepted = false;
    try {
      final expectedState = await _storage.read(key: 'oauth_state');
      final verifier = await _storage.read(key: 'oauth_verifier');
      final acceptedLegalVersion = await _storage.read(
        key: 'oauth_legal_version',
      );
      final returnedState = uri.queryParameters['state'];
      final code = uri.queryParameters['code'];
      final authError = uri.queryParameters['error'];
      // Unrelated/stale links must not cancel a valid login or clear its PKCE
      // verifier. Error callbacks are subject to the same state validation.
      if (attempt != _authAttempt ||
          expectedState == null ||
          verifier == null ||
          acceptedLegalVersion == null ||
          expectedState != returnedState)
        return;
      attempt = ++_authAttempt;
      accepted = true;
      _exchanging = true;
      state = SessionState.authenticating;
      error = null;
      notifyListeners();
      if (authError == 'not_eligible') {
        throw const ApiException(
          'Aplikasi ini hanya tersedia untuk akun mahasiswa UNTIDAR.',
        );
      }
      if (authError == 'temporarily_unavailable') {
        throw const ApiException(
          'Layanan data sedang tidak tersedia. Coba lagi sebentar.',
        );
      }
      if (code == null || code.isEmpty) {
        throw const ApiException(
          'Proses masuk tidak valid atau sudah kedaluwarsa. Silakan masuk lagi.',
        );
      }
      await api.exchangeCode(
        code,
        verifier,
        acceptedTermsVersion: acceptedLegalVersion,
      );
      if (attempt != _authAttempt) return;
      final profile = await api.me();
      if (attempt != _authAttempt) return;
      await _clearOAuthValues();
      if (attempt != _authAttempt) return;
      user = profile;
      state = SessionState.signedIn;
    } catch (exception) {
      if (accepted && attempt == _authAttempt) {
        state = SessionState.signedOut;
        error = _message(exception);
        // An accepted attempt is finished; the same code cannot be reused.
        await _clearOAuthValues();
      }
    } finally {
      if (accepted && attempt == _authAttempt) {
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
    _exchanging = true;
    error = null;
    state = SessionState.loading;
    notifyListeners();
    try {
      await api.logout();
    } catch (exception) {
      error = _message(exception);
    } finally {
      user = null;
      // Jangan biarkan percobaan OAuth menggantung di perangkat.
      await _clearOAuthValues();
      _exchanging = false;
      state = SessionState.signedOut;
      notifyListeners();
    }
  }

  /// Dipanggil ApiClient saat refresh token ditolak server. Tanpa ini
  /// aplikasi tetap menampilkan data pengguna yang sudah basi padahal
  /// tiap permintaan berikutnya akan gagal 401.
  void _handleSessionExpired() {
    if (state != SessionState.signedIn) return;
    ++_authAttempt;
    _exchanging = false;
    user = null;
    state = SessionState.signedOut;
    error = 'Sesi kamu sudah berakhir. Silakan masuk kembali.';
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

  bool _isAuthLink(Uri uri) =>
      uri.scheme == 'karsa' && uri.host == 'auth' && uri.path == '/callback';

  Future<void> _clearOAuthValues() async {
    await _storage.delete(key: 'oauth_state');
    await _storage.delete(key: 'oauth_verifier');
    await _storage.delete(key: 'oauth_legal_version');
  }

  void _setError(String message) {
    error = message;
    notifyListeners();
  }

  String _message(Object exception) => exception is ApiException
      ? exception.message
      : 'Terjadi gangguan. Silakan coba lagi.';

  @override
  void dispose() {
    api.sessionExpired.removeListener(_handleSessionExpired);
    _linkSubscription?.cancel();
    super.dispose();
  }
}
