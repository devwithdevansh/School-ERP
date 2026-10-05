class ExamResultModel {
  final String id;
  final String examName;
  final String examType;
  final String subjectName;
  final num maxMarks;
  final num passingMarks;
  final num? marksObtained;
  final String? gradeObtained;
  final String? remarks;

  const ExamResultModel({
    required this.id,
    required this.examName,
    required this.examType,
    required this.subjectName,
    required this.maxMarks,
    required this.passingMarks,
    this.marksObtained,
    this.gradeObtained,
    this.remarks,
  });

  bool get isPass => (marksObtained ?? 0) >= passingMarks;

  /// Graded by a letter grade rather than marks — has no numeric total.
  bool get isGradeBased => examType.toLowerCase() == 'grades';

  factory ExamResultModel.fromJson(Map<String, dynamic> json) {
    final exam = json['examId'];
    final subject = json['subjectId'];
    return ExamResultModel(
      id: (json['_id'] ?? '').toString(),
      examName: exam is Map ? (exam['examName'] as String? ?? 'Exam') : 'Exam',
      examType: json['gradingSystem'] as String? ?? 'Marks',
      subjectName: subject is Map ? (subject['subjectName'] as String? ?? 'Subject') : 'Subject',
      maxMarks: json['maxMarks'] as num? ?? 100,
      passingMarks: json['passingMarks'] as num? ?? 35,
      marksObtained: json['marksObtained'] as num?,
      gradeObtained: json['gradeObtained'] as String?,
      remarks: json['remarks'] as String?,
    );
  }
}
