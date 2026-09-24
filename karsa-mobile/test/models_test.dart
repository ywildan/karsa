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

  test('GroupSummary membaca hak PJ hanya pada grup terkait', () {
    final group = GroupSummary.fromJson({
      'id': 'assignment-1',
      'matkul': {'name': 'Basis Data', 'code': 'IF201'},
      'kelas': {'name': 'A'},
      'pj': {'id': 'pj-1', 'name': 'PJ Basis Data', 'image': null},
      'member_count': 50,
      'is_manager': true,
      'is_locked': false,
      'last_message': null,
    });
    expect(group.courseName, 'Basis Data');
    expect(group.memberCount, 50);
    expect(group.isManager, isTrue);
  });

  test('GroupMessagePage mempertahankan tombstone tanpa body', () {
    final page = GroupMessagePage.fromJson({
      'group': {'is_manager': false, 'is_locked': false},
      'messages': [
        {
          'id': 'message-1',
          'state': 'deleted',
          'text': null,
          'hidden_reason': null,
          'edited_at': null,
          'created_at': '2026-09-24T10:00:00.000Z',
          'updated_at': '2026-09-24T10:01:00.000Z',
          'is_pinned': false,
          'is_own': true,
          'can_edit': false,
          'can_delete': false,
          'can_manage': false,
          'author': {
            'id': 'user-1',
            'name': 'Mahasiswa',
            'image': null,
            'is_group_manager': false,
          },
          'reply_to': null,
        },
      ],
      'next_cursor': null,
    });
    expect(page.messages.single.state, 'deleted');
    expect(page.messages.single.text, isNull);
    expect(page.messages.single.canEdit, isFalse);
  });
}
