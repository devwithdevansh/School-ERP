/// A scheduled exam (teacher's marks-entry picker). Distinct from
/// [ExamResultModel], which is one student's already-populated result.
class ExamModel {
  final String id;
  final String examName;
  final String standard;
  final String medium;
  final List<String> divisions;
  final List<SubjectRef> subjects;

  const ExamModel({
    required this.id,
    required this.examName,
    required this.standard,
    required this.medium,
    required this.divisions,
    required this.subjects,
  });

  factory ExamModel.fromJson(Map<String, dynamic> json) {
    final subjectsJson = json['subjects'] as List<dynamic>? ?? [];
    return ExamModel(
      id: (json['_id'] ?? '').toString(),
      examName: json['examName'] as String? ?? 'Exam',
      standard: (json['standard'] ?? '').toString(),
      medium: json['medium'] as String? ?? 'English',
      divisions: (json['divisions'] as List<dynamic>? ?? []).map((d) => d.toString()).toList(),
      subjects: subjectsJson.map((s) => SubjectRef.fromJson(s as Map<String, dynamic>)).toList(),
    );
  }
}

class SubjectRef {
  final String id;
  final String name;
  final String gradingSystem;
  final num maxMarks;
  final num passingMarks;

  const SubjectRef({
    required this.id, 
    required this.name,
    this.gradingSystem = 'Marks',
    this.maxMarks = 100,
    this.passingMarks = 35,
  });

  factory SubjectRef.fromJson(Map<String, dynamic> json) {
    final subject = json['subjectId'];
    String id = '';
    String name = 'Subject';
    
    if (subject is Map) {
      id = (subject['_id'] ?? '').toString();
      name = subject['subjectName'] as String? ?? 'Subject';
    } else {
      id = (subject ?? '').toString();
    }

    return SubjectRef(
      id: id, 
      name: name,
      gradingSystem: json['gradingSystem'] as String? ?? 'Marks',
      maxMarks: json['maxMarks'] as num? ?? 100,
      passingMarks: json['passingMarks'] as num? ?? 35,
    );
  }
}

/// One student's editable row while a teacher is entering marks for a
/// specific exam+subject.
class MarksEntry {
  final String studentId;
  final String studentName;
  String marksObtained;
  String remarks;

  MarksEntry({
    required this.studentId,
    required this.studentName,
    this.marksObtained = '',
    this.remarks = '',
  });
}
