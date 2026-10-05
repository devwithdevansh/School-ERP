import '../../core/utils/date_labels.dart';

class HomeworkModel {
  final String id;
  final String subjectName;
  final String teacherName;
  final String title;
  final String description;
  final DateTime dueDate;
  final String? standard;
  final String? division;
  final String? medium;

  const HomeworkModel({
    required this.id,
    required this.subjectName,
    required this.teacherName,
    required this.title,
    required this.description,
    required this.dueDate,
    this.standard,
    this.division,
    this.medium,
  });

  /// Overdue only once the due *day* has passed — work due today is still due.
  bool get isOverdue => daysUntil(dueDate) < 0;

  String get classLabel => (standard != null && division != null) ? 'Std $standard-$division' : '';

  factory HomeworkModel.fromJson(Map<String, dynamic> json) {
    final subject = json['subjectId'];
    final teacher = json['teacherId'];
    return HomeworkModel(
      id: (json['_id'] ?? '').toString(),
      subjectName: subject is Map ? (subject['subjectName'] as String? ?? 'Subject') : 'Subject',
      teacherName: teacher is Map ? (teacher['name'] as String? ?? '') : '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      dueDate: DateTime.tryParse(json['dueDate']?.toString() ?? '') ?? DateTime.now(),
      standard: json['standard'] as String?,
      division: json['division'] as String?,
      medium: json['medium'] as String?,
    );
  }
}
