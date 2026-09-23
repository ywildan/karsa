class Capabilities {
  const Capabilities({
    required this.recordPoints,
    required this.viewReport,
    required this.viewLeaderboard,
  });

  final bool recordPoints;
  final bool viewReport;
  final bool viewLeaderboard;

  factory Capabilities.fromJson(Map<String, dynamic> json) => Capabilities(
        recordPoints: json['record_points'] == true,
        viewReport: json['view_report'] == true,
        viewLeaderboard: json['view_leaderboard'] == true,
      );
}

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.capabilities,
    this.name,
    this.image,
    this.nim,
    this.classId,
  });

  final String id;
  final String email;
  final String? name;
  final String? image;
  final String? nim;
  final String? classId;
  final Capabilities capabilities;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        name: json['name'] as String?,
        image: json['image'] as String?,
        nim: json['nim'] as String?,
        classId: json['kelas_id'] as String?,
        capabilities: Capabilities.fromJson(
          json['capabilities'] as Map<String, dynamic>,
        ),
      );
}

class Assignment {
  const Assignment({
    required this.id,
    required this.courseName,
    required this.courseCode,
    required this.className,
    this.programName,
    this.semesterName,
    this.studentCount = 0,
  });

  final String id;
  final String courseName;
  final String courseCode;
  final String className;
  final String? programName;
  final String? semesterName;
  final int studentCount;

  factory Assignment.fromJson(Map<String, dynamic> json) {
    final course = json['matkul'] as Map<String, dynamic>? ?? const {};
    final classData = json['kelas'] as Map<String, dynamic>? ?? const {};
    return Assignment(
      id: json['id'] as String,
      courseName: course['name'] as String? ?? 'Mata kuliah',
      courseCode: course['code'] as String? ?? '',
      className: classData['name'] as String? ?? 'Kelas',
      programName: (classData['prodi'] as Map<String, dynamic>?)?['name'] as String?,
      semesterName:
          (classData['semester'] as Map<String, dynamic>?)?['name'] as String?,
      studentCount: (json['student_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class Student {
  const Student({
    required this.id,
    required this.name,
    this.nim,
    this.isSelf = false,
  });

  final String id;
  final String name;
  final String? nim;
  final bool isSelf;

  factory Student.fromJson(Map<String, dynamic> json) => Student(
        id: json['id'] as String,
        name: (json['name'] as String?)?.trim().isNotEmpty == true
            ? (json['name'] as String).trim()
            : 'Tanpa nama',
        nim: json['nim'] as String?,
        isSelf: json['is_self'] == true,
      );
}

class PointCategory {
  const PointCategory({required this.id, required this.name});
  final String id;
  final String name;

  factory PointCategory.fromJson(Map<String, dynamic> json) => PointCategory(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Kategori',
      );
}

class PointHistory {
  const PointHistory({
    required this.id,
    required this.points,
    required this.createdAt,
    required this.studentName,
    required this.categoryName,
    required this.courseName,
    required this.className,
    this.note,
    this.studentNim,
  });

  final String id;
  final int points;
  final DateTime createdAt;
  final String studentName;
  final String? studentNim;
  final String categoryName;
  final String courseName;
  final String className;
  final String? note;

  factory PointHistory.fromJson(Map<String, dynamic> json) {
    final student = json['mahasiswa'] as Map<String, dynamic>? ?? const {};
    final category = json['kategori'] as Map<String, dynamic>? ?? const {};
    final course = json['matkul'] as Map<String, dynamic>? ?? const {};
    final classData = json['kelas'] as Map<String, dynamic>? ?? const {};
    return PointHistory(
      id: json['id'] as String,
      points: (json['poin'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      studentName: student['name'] as String? ?? 'Tanpa nama',
      studentNim: student['nim'] as String?,
      categoryName: category['name'] as String? ?? 'Kategori',
      courseName: course['name'] as String? ?? 'Mata kuliah',
      className: classData['name'] as String? ?? 'Kelas',
      note: json['catatan'] as String?,
    );
  }
}

class ReportPoint {
  const ReportPoint({
    required this.id,
    required this.points,
    required this.category,
    required this.createdAt,
    this.note,
  });
  final String id;
  final int points;
  final String category;
  final DateTime createdAt;
  final String? note;

  factory ReportPoint.fromJson(Map<String, dynamic> json) => ReportPoint(
        id: json['id'] as String,
        points: (json['poin'] as num?)?.toInt() ?? 0,
        category:
            (json['kategori'] as Map<String, dynamic>?)?['name'] as String? ??
                'Kategori',
        createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
        note: json['catatan'] as String?,
      );
}

class ReportCourse {
  const ReportCourse({
    required this.id,
    required this.name,
    required this.code,
    required this.totalPoints,
    required this.history,
    this.pjName,
  });
  final String id;
  final String name;
  final String code;
  final int totalPoints;
  final String? pjName;
  final List<ReportPoint> history;

  factory ReportCourse.fromJson(Map<String, dynamic> json) {
    final course = json['matkul'] as Map<String, dynamic>? ?? const {};
    return ReportCourse(
      id: json['id'] as String,
      name: course['name'] as String? ?? 'Mata kuliah',
      code: course['code'] as String? ?? '',
      totalPoints: (json['total_poin'] as num?)?.toInt() ?? 0,
      pjName: (json['pj'] as Map<String, dynamic>?)?['name'] as String?,
      history: ((json['history'] as List?) ?? const [])
          .map((item) => ReportPoint.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class StudentReport {
  const StudentReport({
    required this.isEmpty,
    required this.totalPoints,
    required this.courses,
    this.semesterName,
    this.className,
    this.programName,
  });
  final bool isEmpty;
  final int totalPoints;
  final String? semesterName;
  final String? className;
  final String? programName;
  final List<ReportCourse> courses;

  factory StudentReport.fromJson(Map<String, dynamic> json) => StudentReport(
        isEmpty: json['empty'] == true,
        totalPoints: (json['total_poin'] as num?)?.toInt() ?? 0,
        semesterName:
            (json['semester'] as Map<String, dynamic>?)?['name'] as String?,
        className: (json['kelas'] as Map<String, dynamic>?)?['name'] as String?,
        programName: (json['prodi'] as Map<String, dynamic>?)?['name'] as String?,
        courses: ((json['courses'] as List?) ?? const [])
            .map((item) => ReportCourse.fromJson(item as Map<String, dynamic>))
            .toList(),
      );
}

class LeaderboardOption {
  const LeaderboardOption({required this.id, required this.name, required this.code});
  final String id;
  final String name;
  final String code;

  factory LeaderboardOption.fromJson(Map<String, dynamic> json) =>
      LeaderboardOption(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Mata kuliah',
        code: json['code'] as String? ?? '',
      );
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.points,
    required this.isCurrentUser,
    this.nim,
  });
  final int rank;
  final String name;
  final String? nim;
  final int points;
  final bool isCurrentUser;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) => LeaderboardEntry(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        name: json['nama'] as String? ?? 'Tanpa nama',
        nim: json['nim'] as String?,
        points: (json['totalPoin'] as num?)?.toInt() ?? 0,
        isCurrentUser: json['isCurrentUser'] == true,
      );
}
