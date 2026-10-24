class AttendanceRegisterDate {
  final String dateKey;
  final DateTime date;
  final int dayOfMonth;
  final String dayOfWeek;
  final String status;

  const AttendanceRegisterDate({
    required this.dateKey,
    required this.date,
    required this.dayOfMonth,
    required this.dayOfWeek,
    required this.status,
  });

  factory AttendanceRegisterDate.fromJson(Map<String, dynamic> json) {
    return AttendanceRegisterDate(
      dateKey: json['dateKey']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      dayOfMonth: (json['dayOfMonth'] as num?)?.toInt() ?? 0,
      dayOfWeek: json['dayOfWeek']?.toString() ?? '',
      status: json['status']?.toString() ?? 'CONFIRMED',
    );
  }
}

class StudentRegisterRecord {
  final String studentId;
  final String studentName;
  final String rollNo;
  final String? parentPhone;
  final Map<String, String> dayStatuses;
  final int totalPresent;
  final int totalAbsent;
  final int totalLate;
  final int totalLeave;
  final int totalDays;
  final double percentage;

  const StudentRegisterRecord({
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    this.parentPhone,
    required this.dayStatuses,
    required this.totalPresent,
    required this.totalAbsent,
    required this.totalLate,
    required this.totalLeave,
    required this.totalDays,
    required this.percentage,
  });

  List<String> get absentDateKeys {
    return dayStatuses.entries
        .where((e) => e.value == 'ABSENT')
        .map((e) => e.key)
        .toList();
  }

  factory StudentRegisterRecord.fromJson(Map<String, dynamic> json) {
    final rawStatuses = json['dayStatuses'];
    final Map<String, String> dayMap = {};
    if (rawStatuses is Map) {
      rawStatuses.forEach((k, v) {
        dayMap[k.toString()] = v?.toString() ?? '—';
      });
    }

    return StudentRegisterRecord(
      studentId: json['studentId']?.toString() ?? '',
      studentName: json['studentName']?.toString() ?? 'Student',
      rollNo: json['rollNo']?.toString() ?? '-',
      parentPhone: json['parentPhone']?.toString(),
      dayStatuses: dayMap,
      totalPresent: (json['totalPresent'] as num?)?.toInt() ?? 0,
      totalAbsent: (json['totalAbsent'] as num?)?.toInt() ?? 0,
      totalLate: (json['totalLate'] as num?)?.toInt() ?? 0,
      totalLeave: (json['totalLeave'] as num?)?.toInt() ?? 0,
      totalDays: (json['totalDays'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class DailyAbsentStudent {
  final String studentId;
  final String studentName;
  final String rollNo;
  final String? parentPhone;
  final String? remarks;
  final bool verifiedByAdmin;

  const DailyAbsentStudent({
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    this.parentPhone,
    this.remarks,
    this.verifiedByAdmin = false,
  });

  factory DailyAbsentStudent.fromJson(Map<String, dynamic> json) {
    return DailyAbsentStudent(
      studentId: json['studentId']?.toString() ?? '',
      studentName: json['studentName']?.toString() ?? 'Student',
      rollNo: json['rollNo']?.toString() ?? '-',
      parentPhone: json['parentPhone']?.toString(),
      remarks: json['remarks']?.toString(),
      verifiedByAdmin: json['verifiedByAdmin'] == true,
    );
  }
}

class DailyAbsenteeLog {
  final String dateKey;
  final DateTime date;
  final int absentCount;
  final List<DailyAbsentStudent> absents;

  const DailyAbsenteeLog({
    required this.dateKey,
    required this.date,
    required this.absentCount,
    required this.absents,
  });

  factory DailyAbsenteeLog.fromJson(Map<String, dynamic> json) {
    final rawList = json['absents'];
    final List<DailyAbsentStudent> list = [];
    if (rawList is List) {
      for (final item in rawList) {
        if (item is Map<String, dynamic>) {
          list.add(DailyAbsentStudent.fromJson(item));
        }
      }
    }

    return DailyAbsenteeLog(
      dateKey: json['dateKey']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      absentCount: (json['absentCount'] as num?)?.toInt() ?? list.length,
      absents: list,
    );
  }
}

class AttendanceRegisterModel {
  final int month;
  final int year;
  final String standard;
  final String division;
  final String medium;
  final int totalStudents;
  final int totalWorkingDays;
  final List<AttendanceRegisterDate> dates;
  final List<StudentRegisterRecord> register;
  final List<DailyAbsenteeLog> dailyAbsentees;

  const AttendanceRegisterModel({
    required this.month,
    required this.year,
    required this.standard,
    required this.division,
    required this.medium,
    required this.totalStudents,
    required this.totalWorkingDays,
    required this.dates,
    required this.register,
    required this.dailyAbsentees,
  });

  double get averagePercentage {
    if (register.isEmpty) return 0.0;
    final sum = register.fold<double>(0.0, (acc, r) => acc + r.percentage);
    return double.parse((sum / register.length).toStringAsFixed(1));
  }

  int get totalAbsencesInMonth {
    return register.fold<int>(0, (acc, r) => acc + r.totalAbsent);
  }

  int get perfectAttendanceCount {
    return register.where((r) => r.totalDays > 0 && r.totalAbsent == 0).length;
  }

  factory AttendanceRegisterModel.fromJson(Map<String, dynamic> json) {
    final rawDates = json['dates'];
    final List<AttendanceRegisterDate> datesList = [];
    if (rawDates is List) {
      for (final d in rawDates) {
        if (d is Map<String, dynamic>) {
          datesList.add(AttendanceRegisterDate.fromJson(d));
        }
      }
    }

    final rawReg = json['register'];
    final List<StudentRegisterRecord> regList = [];
    if (rawReg is List) {
      for (final r in rawReg) {
        if (r is Map<String, dynamic>) {
          regList.add(StudentRegisterRecord.fromJson(r));
        }
      }
    }

    final rawDaily = json['dailyAbsentees'];
    final List<DailyAbsenteeLog> dailyList = [];
    if (rawDaily is List) {
      for (final l in rawDaily) {
        if (l is Map<String, dynamic>) {
          dailyList.add(DailyAbsenteeLog.fromJson(l));
        }
      }
    }

    return AttendanceRegisterModel(
      month: (json['month'] as num?)?.toInt() ?? 1,
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      standard: json['standard']?.toString() ?? '',
      division: json['division']?.toString() ?? '',
      medium: json['medium']?.toString() ?? 'English',
      totalStudents: (json['totalStudents'] as num?)?.toInt() ?? regList.length,
      totalWorkingDays: (json['totalWorkingDays'] as num?)?.toInt() ?? datesList.length,
      dates: datesList,
      register: regList,
      dailyAbsentees: dailyList,
    );
  }
}
