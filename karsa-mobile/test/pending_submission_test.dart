import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/core/pending_submission.dart';

void main() {
  test(
    'retries reuse key, changed payload and completed submission use new keys',
    () {
      final submission = PendingSubmission();
      final payload = <String, Object?>{'student': 'student', 'points': 1};
      final firstKey = submission.keyFor(payload);
      expect(firstKey, matches(RegExp(r'^[A-Za-z0-9._:-]{16,128}$')));
      expect(submission.keyFor(Map.of(payload)), firstKey);
      final changedKey = submission.keyFor({...payload, 'points': 2});
      expect(changedKey, isNot(firstKey));
      submission.complete();
      expect(submission.keyFor({...payload, 'points': 2}), isNot(changedKey));
    },
  );
}
