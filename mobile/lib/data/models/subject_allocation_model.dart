/// One subject a teacher is assigned to teach for a specific class
/// (standard/division/medium), for the active academic year.
class SubjectAllocationModel {
  final String standard;
  final String division;
  final String medium;
  final String subjectId;
  final String subjectName;

  const SubjectAllocationModel({
    required this.standard,
    required this.division,
    required this.medium,
    required this.subjectId,
    required this.subjectName,
  });

  String get classLabel => 'Std $standard-$division';

  static String _teacherIdOf(dynamic v) {
    if (v == null) return '';
    if (v is Map) return (v['_id'] ?? '').toString();
    return v.toString();
  }

  static bool belongsTo(Map<String, dynamic> json, String teacherId) {
    return _teacherIdOf(json['teacherId']) == teacherId;
  }

  factory SubjectAllocationModel.fromJson(Map<String, dynamic> json) {
    final subject = json['subjectId'];
    String subjectId = '';
    String subjectName = 'Subject';
    if (subject is Map) {
      subjectId = (subject['_id'] ?? '').toString();
      subjectName = subject['subjectName'] as String? ?? 'Subject';
    } else if (subject != null) {
      subjectId = subject.toString();
    }
    return SubjectAllocationModel(
      standard: (json['standard'] ?? '').toString(),
      division: (json['division'] ?? '').toString(),
      medium: (json['medium'] ?? '').toString(),
      subjectId: subjectId,
      subjectName: subjectName,
    );
  }
}
