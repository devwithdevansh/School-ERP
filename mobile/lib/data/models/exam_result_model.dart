class ExamResultModel {
  final String id;
  final String examId;
  final String examName;
  final String examCategory;
  final String examType;
  final String subjectName;
  final num maxMarks;
  final num passingMarks;
  final num? marksObtained;
  final String? gradeObtained;
  final String? remarks;
  final DateTime? date;
  final String attendance;

  const ExamResultModel({
    required this.id,
    this.examId = '',
    required this.examName,
    this.examCategory = 'FINAL',
    required this.examType,
    required this.subjectName,
    required this.maxMarks,
    required this.passingMarks,
    this.marksObtained,
    this.gradeObtained,
    this.remarks,
    this.date,
    this.attendance = 'PRESENT',
  });

  bool get isPass => (marksObtained ?? 0) >= passingMarks && !isAbsent;

  /// Whether the student was marked absent for this exam/subject
  bool get isAbsent => attendance.toUpperCase() == 'ABSENT';

  /// Graded by a letter grade rather than marks — has no numeric total.
  bool get isGradeBased => examType.toLowerCase() == 'grades';

  /// Whether this is a weekly test, quick quiz, or periodic assessment
  bool get isWeekly =>
      examCategory.toUpperCase() == 'WEEKLY' ||
      examName.toLowerCase().contains('weekly') ||
      examName.toLowerCase().contains('quick') ||
      examName.toLowerCase().contains('quiz');

  factory ExamResultModel.fromJson(Map<String, dynamic> json) {
    final exam = json['examId'];
    final subject = json['subjectId'];

    String examIdStr = '';
    String examNameStr = 'Exam';
    String examCategoryStr = 'FINAL';

    if (exam is Map) {
      examIdStr = (exam['_id'] ?? '').toString();
      examNameStr = exam['examName'] as String? ?? 'Exam';
      examCategoryStr = (exam['type'] as String? ?? 'FINAL').toUpperCase();
    } else if (exam != null) {
      examIdStr = exam.toString();
    }

    DateTime? createdAt;
    if (json['createdAt'] != null) {
      createdAt = DateTime.tryParse(json['createdAt'].toString());
    }

    return ExamResultModel(
      id: (json['_id'] ?? '').toString(),
      examId: examIdStr,
      examName: examNameStr,
      examCategory: examCategoryStr,
      examType: json['gradingSystem'] as String? ?? 'Marks',
      subjectName: subject is Map ? (subject['subjectName'] as String? ?? 'Subject') : 'Subject',
      maxMarks: json['maxMarks'] as num? ?? 100,
      passingMarks: json['passingMarks'] as num? ?? 35,
      marksObtained: json['marksObtained'] as num?,
      gradeObtained: json['gradeObtained'] as String?,
      remarks: json['remarks'] as String?,
      date: createdAt,
      attendance: (json['attendance'] as String? ?? 'PRESENT').toUpperCase(),
    );
  }
}
