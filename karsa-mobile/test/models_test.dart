import 'package:flutter_test/flutter_test.dart';
import 'package:karsa_mobile/core/models.dart';
import 'package:karsa_mobile/core/student_search.dart';
import 'package:karsa_mobile/widgets/common.dart';

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

    expect(searchStudents(students, 'wi'), isEmpty);
    expect(
      searchStudents(students, 'wil').map((student) => student.name),
      ['YUSUF WILDAN AFFANDI', 'DEWILSON'],
    );
    expect(
      searchStudents(students, 'WIL').map((student) => student.name),
      ['YUSUF WILDAN AFFANDI', 'DEWILSON'],
    );
  });

  test('cari NIM lengkap atau 2–4 digit akhir tanpa menebak hasil bentrok', () {
    const students = [
      Student(id: '68', name: 'Mahasiswa Satu', nim: '2601060068'),
      Student(id: '23', name: 'Mahasiswa Dua', nim: '2601060023'),
      Student(id: '41', name: 'Mahasiswa Tiga', nim: '2420106041'),
      Student(id: '42', name: 'Mahasiswa Empat', nim: '2420106042'),
      Student(id: 'x42', name: 'Mahasiswa Lima', nim: '2601060042'),
    ];

    expect(searchStudents(students, '6'), isEmpty);
    expect(searchStudents(students, '68').map((item) => item.id), ['68']);
    expect(searchStudents(students, '0023').map((item) => item.id), ['23']);
    expect(searchStudents(students, '2420106041').map((item) => item.id), ['41']);
    expect(searchStudents(students, '26010600'), isEmpty);
    expect(searchStudents(students, '42').map((item) => item.id), ['42', 'x42']);
    expect(studentNimLabel('2601060068'), 'NIM ••••0068');
    expect(studentNimLabel(null), 'NIM belum ada');
  });

  test('NPM hanya menampilkan tiga digit pertama di layar bersama', () {
    expect(maskNim('123456789'), '123******');
    expect(maskNim('12'), '12');
    expect(maskNim(null), '');
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

  test('Karsa Lib membaca profil, artikel, dan balasan dari respons API', () {
    final bootstrap = LibBootstrap.fromJson({
      'profile': {
        'display_name': 'Yusuf',
        'faculty': 'Ekonomi',
        'prodi_id': 'prodi-1',
        'kelas_id': null,
      },
      'faculties': [
        {'id': 'faculty-1', 'name': 'Ekonomi'},
      ],
      'programs': [
        {'id': 'prodi-1', 'name': 'Akuntansi', 'faculty_id': 'faculty-1'},
      ],
      'classes': <Map<String, dynamic>>[],
      'can_write': false,
    });
    expect(bootstrap.profile?.programId, 'prodi-1');
    expect(bootstrap.programs.single.facultyId, 'faculty-1');
    expect(bootstrap.canWrite, isFalse);

    final article = LibArticle.fromJson({
      'id': 'article-1',
      'title': 'Jurnal umum',
      'body': 'Isi lengkap',
      'author': {
        'id': 'author-1',
        'name': 'Yusuf',
        'prodi_name': 'Akuntansi',
      },
      'views': 2,
      'period_views': 1,
      'comments_count': 1,
      'published_at': '2026-09-30T10:00:00.000Z',
    });
    expect(article.authorId, 'author-1');
    expect(article.views, 2);
    expect(article.periodViews, 1);
    expect(article.publishedAt, isNotNull);

    final comment = LibComment.fromJson({
      'id': 'comment-1',
      'author': 'Yusuf',
      'body': null,
      'is_deleted': true,
      'is_own': false,
      'created_at': '2026-09-30T10:00:00.000Z',
      'replies': [
        {
          'id': 'reply-1',
          'author': 'Teman',
          'body': 'Terima kasih',
          'is_deleted': false,
          'is_own': true,
        },
      ],
    });
    expect(comment.isDeleted, isTrue);
    expect(comment.replies.single.body, 'Terima kasih');
  });

  test('waktu relatif Karsa Lib menangani waktu baru dan lampau', () {
    final now = DateTime.now();
    expect(formatRelativeTime(now.add(const Duration(minutes: 1))), 'Baru saja');
    expect(formatRelativeTime(now.subtract(const Duration(minutes: 5))), '5 menit lalu');
    expect(formatRelativeTime(now.subtract(const Duration(days: 2))), '2 hari lalu');
  });
}
