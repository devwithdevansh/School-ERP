class AttendanceDayModel {
  final DateTime date;
  final String status; // 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'
  final String? remarks;

  const AttendanceDayModel({
    required this.date,
    required this.status,
    this.remarks,
  });

  factory AttendanceDayModel.fromJson(Map<String, dynamic> json) {
    return AttendanceDayModel(
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'PRESENT',
      remarks: json['remarks'] as String?,
    );
  }
}

class AbsentHistoryItem {
  final DateTime date;
  final String? remarks;
  const AbsentHistoryItem({required this.date, this.remarks});

  factory AbsentHistoryItem.fromJson(Map<String, dynamic> json) {
    return AbsentHistoryItem(
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      remarks: json['remarks'] as String?,
    );
  }
}

class AttendanceSummary {
  final int totalDays;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int leaveDays;
  final double percentage;

  const AttendanceSummary({
    this.totalDays = 0,
    this.presentDays = 0,
    this.absentDays = 0,
    this.lateDays = 0,
    this.leaveDays = 0,
    this.percentage = 0.0,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    return AttendanceSummary(
      totalDays: (json['totalDays'] as num?)?.toInt() ?? 0,
      presentDays: (json['presentDays'] as num?)?.toInt() ?? 0,
      absentDays: (json['absentDays'] as num?)?.toInt() ?? 0,
      lateDays: (json['lateDays'] as num?)?.toInt() ?? 0,
      leaveDays: (json['leaveDays'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class StudentAttendanceReport {
  final AttendanceSummary summary;
  final List<AttendanceDayModel> records;
  final List<AbsentHistoryItem> absentHistory;

  const StudentAttendanceReport({
    required this.summary,
    required this.records,
    required this.absentHistory,
  });

  factory StudentAttendanceReport.fromJson(Map<String, dynamic> json) {
    final rawRecords = json['records'] as List<dynamic>? ?? [];
    final rawAbsent = json['absentHistory'] as List<dynamic>? ?? [];
    return StudentAttendanceReport(
      summary: json['summary'] != null
          ? AttendanceSummary.fromJson(json['summary'] as Map<String, dynamic>)
          : const AttendanceSummary(),
      records: rawRecords.map((e) => AttendanceDayModel.fromJson(e as Map<String, dynamic>)).toList(),
      absentHistory: rawAbsent.map((e) => AbsentHistoryItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  factory StudentAttendanceReport.fromList(List<AttendanceDayModel> list) {
    int present = 0;
    int absent = 0;
    int late = 0;
    int leave = 0;
    final absents = <AbsentHistoryItem>[];

    for (final r in list) {
      if (r.status == 'PRESENT') {
        present++;
      } else if (r.status == 'ABSENT') {
        absent++;
        absents.add(AbsentHistoryItem(date: r.date, remarks: r.remarks));
      } else if (r.status == 'LATE') {
        late++;
        present++;
      } else if (r.status == 'LEAVE') {
        leave++;
      }
    }
    final total = list.length;
    final pct = total > 0 ? (present / total * 100) : 0.0;

    return StudentAttendanceReport(
      summary: AttendanceSummary(
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        leaveDays: leave,
        percentage: pct,
      ),
      records: list,
      absentHistory: absents,
    );
  }

  factory StudentAttendanceReport.empty() => const StudentAttendanceReport(
        summary: AttendanceSummary(),
        records: [],
        absentHistory: [],
      );
}
