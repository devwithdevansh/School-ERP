/// One class (standard/division/medium) a teacher is the homeroom
/// (class) teacher for, for the active academic year.
class ClassAllocationModel {
  final String standard;
  final String division;
  final String medium;

  const ClassAllocationModel({
    required this.standard,
    required this.division,
    required this.medium,
  });

  String get label => 'Std $standard-$division';

  static String _teacherIdOf(dynamic v) {
    if (v == null) return '';
    if (v is Map) return (v['_id'] ?? '').toString();
    return v.toString();
  }

  static bool belongsTo(Map<String, dynamic> json, String teacherId) {
    return _teacherIdOf(json['teacherId']) == teacherId;
  }

  factory ClassAllocationModel.fromJson(Map<String, dynamic> json) {
    return ClassAllocationModel(
      standard: (json['standard'] ?? '').toString(),
      division: (json['division'] ?? '').toString(),
      medium: (json['medium'] ?? '').toString(),
    );
  }
}
