class TimetablePeriodModel {
  final String id;
  final String dayOfWeek; // 'Monday' .. 'Sunday'
  final String periodName;
  final String startTime;
  final String endTime;
  final String? subjectName;
  final String? teacherName;
  final String? standard;
  final String? division;

  const TimetablePeriodModel({
    required this.id,
    required this.dayOfWeek,
    required this.periodName,
    required this.startTime,
    required this.endTime,
    this.subjectName,
    this.teacherName,
    this.standard,
    this.division,
  });

  bool get isBreak => subjectName == null;

  String get classLabel => (standard != null && division != null) ? '$standard-$division' : '';

  factory TimetablePeriodModel.fromJson(Map<String, dynamic> json) {
    final subject = json['subjectId'];
    final teacher = json['teacherId'];
    return TimetablePeriodModel(
      id: (json['_id'] ?? '').toString(),
      dayOfWeek: json['dayOfWeek'] as String? ?? '',
      periodName: json['periodName'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      subjectName: subject is Map ? subject['subjectName'] as String? : null,
      teacherName: teacher is Map ? teacher['name'] as String? : null,
      standard: json['standard'] as String?,
      division: json['division'] as String?,
    );
  }
}
