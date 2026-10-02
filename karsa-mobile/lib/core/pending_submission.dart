import 'dart:convert';
import 'dart:math';

/// Reuse the key while retrying the same payload after an uncertain response.
class PendingSubmission {
  String? _payload;
  String? _key;

  String keyFor(Map<String, Object?> payload) {
    final encoded = jsonEncode(payload);
    if (_payload != encoded || _key == null) {
      _payload = encoded;
      final random = Random.secure();
      _key = base64Url.encode(
        List<int>.generate(24, (_) => random.nextInt(256)),
      );
    }
    return _key!;
  }

  void complete() {
    _payload = null;
    _key = null;
  }
}
