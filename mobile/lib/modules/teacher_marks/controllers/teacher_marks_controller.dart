import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../data/models/subject_allocation_model.dart';
import '../../../data/models/exam_model.dart';
import '../../../data/repositories/allocation_repository.dart';
import '../../../data/repositories/results_repository.dart';
import '../../../data/repositories/student_repository.dart';

class TeacherMarksController extends GetxController {
  final _allocationRepo = AllocationRepository();
  final _resultsRepo = ResultsRepository();
  final _studentRepo = StudentRepository();

  final isLoading = true.obs;
  final isSaving = false.obs;
  final hasAssignment = false.obs;

  final mySubjects = <SubjectAllocationModel>[].obs;
  final selectedSubject = Rxn<SubjectAllocationModel>();

  final exams = <ExamModel>[].obs;
  final selectedExam = Rxn<ExamModel>();

  final entries = <MarksEntry>[].obs;

  /// The selected subject's grading rules within the selected exam, if any.
  SubjectRef? get _currentConfig {
    final exam = selectedExam.value;
    final subject = selectedSubject.value;
    if (exam == null || subject == null) return null;
    for (final s in exam.subjects) {
      if (s.id == subject.subjectId) return s;
    }
    return null;
  }

  num get currentMaxMarks => _currentConfig?.maxMarks ?? 100;
  num get currentPassingMarks => _currentConfig?.passingMarks ?? 35;

  /// Letter-graded subjects can't be entered as numbers.
  bool get isGradeBased => _currentConfig?.gradingSystem.toLowerCase() == 'grades';

  @override
  void onInit() {
    super.onInit();
    _init();
  }

  Future<void> _init() async {
    isLoading.value = true;
    final prefs = await SharedPreferences.getInstance();
    final teacherId = prefs.getString(StorageKeys.staffId);
    if (teacherId == null || teacherId.isEmpty) {
      isLoading.value = false;
      return;
    }

    final academicYearId = await _allocationRepo.getActiveAcademicYearId();
    if (academicYearId == null) {
      isLoading.value = false;
      return;
    }

    final subjects = await _allocationRepo.getMySubjectAllocations(academicYearId, teacherId);
    mySubjects.assignAll(subjects);
    hasAssignment.value = subjects.isNotEmpty;

    if (subjects.isNotEmpty) {
      await selectSubject(subjects.first);
    } else {
      isLoading.value = false;
    }
  }

  Future<void> selectSubject(SubjectAllocationModel subject) async {
    selectedSubject.value = subject;
    isLoading.value = true;
    entries.clear();
    selectedExam.value = null;

    final examsForClass = await _resultsRepo.getExams(standard: subject.standard, medium: subject.medium);
    exams.assignAll(examsForClass);

    if (examsForClass.isNotEmpty) {
      await selectExam(examsForClass.first);
    } else {
      isLoading.value = false;
    }
  }

  Future<void> selectExam(ExamModel exam) async {
    selectedExam.value = exam;
    final subject = selectedSubject.value;
    if (subject == null) return;
    isLoading.value = true;

    final roster = await _studentRepo.getStudentsForClass(
      standard: subject.standard,
      division: subject.division,
      medium: subject.medium,
    );
    roster.sort((a, b) => a.name.compareTo(b.name));

    final existing = await _resultsRepo.getClassResults(
      examId: exam.id,
      subjectId: subject.subjectId,
      division: subject.division,
    );

    entries.assignAll(roster.map((s) => MarksEntry(
          studentId: s.id,
          studentName: s.name,
          marksObtained: existing[s.id]?.toString() ?? '',
        )));

    isLoading.value = false;
  }

  void updateMarks(int index, String value) {
    entries[index].marksObtained = value;
    entries.refresh();
  }

  Future<bool> submitMarks() async {
    final subject = selectedSubject.value;
    final exam = selectedExam.value;
    if (subject == null || exam == null) return false;
    isSaving.value = true;
    final results = entries
        .where((e) => e.marksObtained.trim().isNotEmpty)
        .map((e) => {
              'studentId': e.studentId,
              'marksObtained': num.tryParse(e.marksObtained.trim()) ?? 0,
            })
        .toList();
    final ok = await _resultsRepo.saveClassResults(
      examId: exam.id,
      subjectId: subject.subjectId,
      division: subject.division,
      results: results,
    );
    isSaving.value = false;
    return ok;
  }
}
