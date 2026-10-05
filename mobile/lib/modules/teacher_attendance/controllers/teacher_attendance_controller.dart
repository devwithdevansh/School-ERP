import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../data/models/class_allocation_model.dart';
import '../../../data/models/student_model.dart';
import '../../../data/repositories/allocation_repository.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../../data/repositories/student_repository.dart';

class TeacherAttendanceController extends GetxController {
  final _allocationRepo = AllocationRepository();
  final _studentRepo = StudentRepository();
  final _attendanceRepo = AttendanceRepository();

  final isLoading = true.obs;
  final isSaving = false.obs;
  final hasClass = false.obs;
  final myClasses = <ClassAllocationModel>[].obs;
  final selectedClass = Rxn<ClassAllocationModel>();

  final students = <StudentModel>[].obs;
  final statusByStudentId = <String, String>{}.obs;

  /// NONE, SUBMITTED (admin has not confirmed yet) or CONFIRMED (locked).
  final sheetStatus = 'NONE'.obs;
  bool get isLocked => sheetStatus.value == 'CONFIRMED';
  String? lastError;

  final today = DateTime.now();
  String get dateKey =>
      '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

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

    final classes = await _allocationRepo.getMyClasses(academicYearId, teacherId);
    myClasses.assignAll(classes);
    hasClass.value = classes.isNotEmpty;

    if (classes.isNotEmpty) {
      selectedClass.value = classes.first;
      await loadClass();
    } else {
      isLoading.value = false;
    }
  }

  Future<void> selectClass(ClassAllocationModel cls) async {
    selectedClass.value = cls;
    await loadClass();
  }

  Future<void> loadClass() async {
    final cls = selectedClass.value;
    if (cls == null) return;
    isLoading.value = true;

    final roster = await _studentRepo.getStudentsForClass(
      standard: cls.standard,
      division: cls.division,
      medium: cls.medium,
    );
    roster.sort((a, b) => a.name.compareTo(b.name));
    students.assignAll(roster);

    final sheet = await _attendanceRepo.getClassSheet(
      date: dateKey,
      standard: cls.standard,
      division: cls.division,
      medium: cls.medium,
    );

    sheetStatus.value = sheet.status;
    final map = <String, String>{};
    for (final s in roster) {
      map[s.id] = sheet.statuses[s.id] ?? 'PRESENT';
    }
    statusByStudentId.assignAll(map);

    isLoading.value = false;
  }

  void setStatus(String studentId, String status) {
    if (isLocked) return;
    statusByStudentId[studentId] = status;
    statusByStudentId.refresh();
  }

  void markAllPresent() {
    if (isLocked) return;
    for (final s in students) {
      statusByStudentId[s.id] = 'PRESENT';
    }
    statusByStudentId.refresh();
  }

  Future<bool> submitAttendance() async {
    final cls = selectedClass.value;
    if (cls == null || isLocked) return false;
    lastError = null;
    isSaving.value = true;
    final records = students
        .map((s) => {'studentId': s.id, 'status': statusByStudentId[s.id] ?? 'PRESENT'})
        .toList();
    final ok = await _attendanceRepo.saveClassAttendance(
      date: dateKey,
      standard: cls.standard,
      division: cls.division,
      medium: cls.medium,
      records: records,
    );
    isSaving.value = false;
    lastError = ok.error;
    if (ok.success) sheetStatus.value = 'SUBMITTED';
    return ok.success;
  }
}
