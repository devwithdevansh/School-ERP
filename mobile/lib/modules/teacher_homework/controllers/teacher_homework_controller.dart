import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../data/models/homework_model.dart';
import '../../../data/models/subject_allocation_model.dart';
import '../../../data/repositories/allocation_repository.dart';
import '../../../data/repositories/homework_repository.dart';

class TeacherHomeworkController extends GetxController {
  final _allocationRepo = AllocationRepository();
  final _homeworkRepo = HomeworkRepository();

  final isLoading = true.obs;
  final isPublishing = false.obs;

  /// 0 = All, 1 = Active, 2 = Overdue (see [TeacherHomeworkView]).
  final filter = 0.obs;
  final hasAssignment = false.obs;

  final mySubjects = <SubjectAllocationModel>[].obs;
  final myHomework = <HomeworkModel>[].obs;

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

    await refreshHomework();
    isLoading.value = false;
  }

  Future<void> refreshHomework() async {
    final list = await _homeworkRepo.getMyHomework();
    list.sort((a, b) => b.dueDate.compareTo(a.dueDate));
    myHomework.assignAll(list);
  }

  Future<({bool success, String? error})> publishHomework({
    required SubjectAllocationModel subject,
    required String title,
    required String description,
    required DateTime dueDate,
  }) async {
    if (title.trim().isEmpty) return (success: false, error: 'Please enter a title.');
    if (description.trim().isEmpty) return (success: false, error: 'Please enter a description.');
    isPublishing.value = true;
    final result = await _homeworkRepo.createHomework(
      standard: subject.standard,
      division: subject.division,
      medium: subject.medium,
      subjectId: subject.subjectId,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate,
    );
    if (result.success) await refreshHomework();
    isPublishing.value = false;
    return result;
  }

  Future<bool> deleteHomeworkItem(String id) async {
    final ok = await _homeworkRepo.deleteHomework(id);
    if (ok) myHomework.removeWhere((h) => h.id == id);
    return ok;
  }
}
