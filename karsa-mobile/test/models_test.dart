import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/core/models.dart';
import 'package:karsa_mobile/core/student_search.dart';

void main() {
  test('AppUser membaca kapabilitas PJ dan mahasiswa', () {
    final user = AppUser.fromJson({
      'id': 'user-1',
      'email': 'student@untidar.ac.id',
      'name': 'Mahasiswa',
      'nim': '12345',
      'kelas_id': 'class-1',
      'capabilities': {
        'record_points': true,
        'view_report': true,
        'view_leaderboard': true,
      },
    });
    expect(user.capabilities.recordPoints, isTrue);
    expect(user.capabilities.viewReport, isTrue);
    expect(user.nim, '12345');
  });

  test('StudentReport membaca struktur respons API', () {
    final report = StudentReport.fromJson({
      'empty': false,
      'total_poin': 7,
      'semester': {'name': 'Ganjil'},
      'kelas': {'name': 'A'},
      'prodi': {'name': 'Informatika'},
      'courses': [
        {
          'id': 'assignment-1',
          'matkul': {'name': 'Basis Data', 'code': 'IF101'},
          'pj': {'name': 'PJ'},
          'total_poin': 7,
          'history': <Map<String, dynamic>>[],
        },
      ],
    });
    expect(report.totalPoints, 7);
    expect(report.courses.single.name, 'Basis Data');
    expect(report.programName, 'Informatika');
  });

  test('LeaderboardEntry mempertahankan penanda pengguna aktif', () {
    final entry = LeaderboardEntry.fromJson({
      'rank': 2,
      'nama': 'Saya',
      'nim': '12345',
      'totalPoin': 9,
      'isCurrentUser': true,
    });
    expect(entry.rank, 2);
    expect(entry.points, 9);
    expect(entry.isCurrentUser, isTrue);
  });

  test('pencarian mahasiswa aktif mulai tiga huruf dan tidak peka kapital', () {
    const students = [
      Student(id: '1', name: 'YUSUF WILDAN AFFANDI', nim: '22001'),
      Student(id: '2', name: 'DEWILSON', nim: '22002'),
      Student(id: '3', name: 'BUDI SANTOSO', nim: '22003'),
    ];

    expect(searchStudentsByName(students, 'wi'), isEmpty);
    expect(
      searchStudentsByName(students, 'wil').map((student) => student.name),
      ['YUSUF WILDAN AFFANDI', 'DEWILSON'],
    );
    expect(
      searchStudentsByName(students, 'WIL').map((student) => student.name),
      ['YUSUF WILDAN AFFANDI', 'DEWILSON'],
    );
  });
}
