import 'models.dart';

/// Pencarian lokal pada mahasiswa kelas yang sudah dipilih PJ.
/// Nama: minimal 3 huruf. NIM: lengkap atau 2–4 digit terakhir.
Iterable<Student> searchStudents(
  Iterable<Student> students,
  String query,
) {
  final normalizedQuery = query.trim();
  if (RegExp(r'^[0-9]+$').hasMatch(normalizedQuery)) {
    if (normalizedQuery.length < 2) return const <Student>[];
    if (normalizedQuery.length <= 4) {
      return students.where(
        (student) => student.nim?.trim().endsWith(normalizedQuery) ?? false,
      );
    }
    return students.where(
      (student) => student.nim?.trim() == normalizedQuery,
    );
  }

  final normalizedName = normalizedQuery.toLowerCase();
  if (normalizedName.length < 3) {
    return const <Student>[];
  }

  return students.where(
    (student) => student.name.toLowerCase().contains(normalizedName),
  );
}

/// Tampilkan hanya akhiran NIM saat PJ membedakan hasil pencarian.
String studentNimLabel(String? nim) {
  final value = nim?.trim() ?? '';
  if (value.isEmpty) return 'NIM belum ada';
  final suffix = value.length <= 4 ? value : value.substring(value.length - 4);
  return 'NIM ••••$suffix';
}
