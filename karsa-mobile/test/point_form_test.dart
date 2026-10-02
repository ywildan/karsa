import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/core/api_client.dart';
import 'package:karsa_mobile/core/models.dart';
import 'package:karsa_mobile/screens/point_form_screen.dart';

const assignmentA = Assignment(
  id: 'a',
  courseName: 'Course A',
  courseCode: 'A',
  className: 'Class A',
);
const assignmentB = Assignment(
  id: 'b',
  courseName: 'Course B',
  courseCode: 'B',
  className: 'Class B',
);

class AssignmentApi extends ApiClient {
  final requests = <String, Completer<List<Student>>>{};

  @override
  Future<List<Assignment>> assignments() async => [assignmentA, assignmentB];

  @override
  Future<List<PointCategory>> categories() async => [
    const PointCategory(id: 'category', name: 'Bertanya'),
  ];

  @override
  Future<List<Student>> students(String assignmentId) {
    final request = Completer<List<Student>>();
    requests[assignmentId] = request;
    return request.future;
  }
}

void main() {
  testWidgets('late student response cannot replace the current class', (
    tester,
  ) async {
    final api = AssignmentApi();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: PointFormScreen(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    final dropdown = find.byWidgetPredicate(
      (widget) => widget is DropdownButtonFormField<Assignment>,
    );
    tester.widget<DropdownButtonFormField<Assignment>>(dropdown).onChanged!(
      assignmentA,
    );
    await tester.pump();
    tester.widget<DropdownButtonFormField<Assignment>>(dropdown).onChanged!(
      assignmentB,
    );
    await tester.pump();

    api.requests['b']!.complete([const Student(id: 'budi', name: 'Budi')]);
    await tester.pumpAndSettle();
    api.requests['a']!.complete([const Student(id: 'alice', name: 'Alice')]);
    await tester.pumpAndSettle();
    final autocomplete = tester.widget<RawAutocomplete<Student>>(
      find.byType(RawAutocomplete<Student>),
    );
    final results = await autocomplete.optionsBuilder(
      const TextEditingValue(text: 'Budi'),
    );
    expect(results.map((student) => student.id), ['budi']);
    final oldResults = await autocomplete.optionsBuilder(
      const TextEditingValue(text: 'Alice'),
    );
    expect(oldResults, isEmpty);
  });

  testWidgets(
    'stale failure cannot show an error or stop loading the current class',
    (tester) async {
      final api = AssignmentApi();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: PointFormScreen(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      final dropdown = find.byWidgetPredicate(
        (widget) => widget is DropdownButtonFormField<Assignment>,
      );
      tester.widget<DropdownButtonFormField<Assignment>>(dropdown).onChanged!(
        assignmentA,
      );
      await tester.pump();
      tester.widget<DropdownButtonFormField<Assignment>>(dropdown).onChanged!(
        assignmentB,
      );
      api.requests['a']!.completeError(
        const ApiException('Old request failed'),
      );
      await tester.pump();
      expect(find.text('Old request failed'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      api.requests['b']!.complete([const Student(id: 'budi', name: 'Budi')]);
      await tester.pumpAndSettle();
      expect(find.text('Old request failed'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
    },
  );
}
