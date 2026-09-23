import 'models.dart';

Iterable<Student> searchStudentsByName(
  Iterable<Student> students,
  String query,
) {
  final normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 3) {
    return const <Student>[];
  }

  return students.where(
    (student) => student.name.toLowerCase().contains(normalizedQuery),
  );
}
