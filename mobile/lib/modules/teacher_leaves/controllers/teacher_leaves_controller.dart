import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../data/models/leave_request_model.dart';
import '../../../data/models/staff_leave_request_model.dart';
import '../../../data/models/class_allocation_model.dart';
import '../../../data/repositories/leave_repository.dart';
import '../../../data/repositories/allocation_repository.dart';

class TeacherLeavesController extends GetxController {
  final _leaveRepo = LeaveRepository();
  final _allocationRepo = AllocationRepository();

  final isLoading = true.obs;
  final hasClass = false.obs;
  final leaves = <LeaveRequestModel>[].obs;
  final updatingId = RxnString();

  // My own leave applications (every teacher, regardless of class allocation)
  final isLoadingMyLeaves = true.obs;
  final isSubmittingMyLeave = false.obs;
  final myLeaves = <StaffLeaveRequestModel>[].obs;

  List<ClassAllocationModel> _myClasses = [];

  @override
  void onInit() {
    super.onInit();
    loadLeaves();
    loadMyLeaves();
  }

  Future<void> loadMyLeaves() async {
    isLoadingMyLeaves.value = true;
    final list = await _leaveRepo.getMyStaffLeaves();
    list.sort((a, b) => b.startDate.compareTo(a.startDate));
    myLeaves.assignAll(list);
    isLoadingMyLeaves.value = false;
  }

  Future<bool> submitMyLeave({
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    required String type,
  }) async {
    if (reason.trim().isEmpty) return false;
    isSubmittingMyLeave.value = true;
    final ok = await _leaveRepo.createStaffLeave(
      startDate: startDate,
      endDate: endDate,
      reason: reason.trim(),
      type: type,
    );
    if (ok) await loadMyLeaves();
    isSubmittingMyLeave.value = false;
    return ok;
  }

  Future<void> loadLeaves() async {
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

    _myClasses = await _allocationRepo.getMyClasses(academicYearId, teacherId);
    hasClass.value = _myClasses.isNotEmpty;

    final results = <LeaveRequestModel>[];
    for (final cls in _myClasses) {
      final classLeaves = await _leaveRepo.getClassLeaveRequests(
        standard: cls.standard,
        division: cls.division,
        medium: cls.medium,
      );
      results.addAll(classLeaves);
    }
    results.sort((a, b) => b.startDate.compareTo(a.startDate));
    leaves.assignAll(results);
    isLoading.value = false;
  }

  Future<void> updateStatus(LeaveRequestModel leave, String status) async {
    updatingId.value = leave.id;
    final ok = await _leaveRepo.updateLeaveStatus(leave.id, status);
    if (ok) {
      await loadLeaves();
    } else {
      Get.snackbar('Error', 'Could not update the leave request. Please try again.');
    }
    updatingId.value = null;
  }
}
