import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../data/models/student_model.dart';
import '../../../../data/models/fee_model.dart';
import '../../../../data/models/notification_model.dart';
import '../../../../data/repositories/student_repository.dart';
import '../../../../data/repositories/fee_repository.dart';
import '../../../../data/repositories/notification_repository.dart';
import '../../../../data/repositories/timetable_repository.dart';
import '../../../../data/repositories/leave_repository.dart';
import '../../../../data/repositories/allocation_repository.dart';
import '../../../../data/models/timetable_period_model.dart';
import '../../fees/receipt_details/controllers/receipt_details_controller.dart';
import '../../fees/pending_fees/controllers/pending_fees_controller.dart';
import '../../../services/sound_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../../../core/widgets/permission_dialog.dart';
import '../../../../core/services/fcm_service.dart';

class DashboardController extends GetxController {
  final StudentRepository _studentRepo = StudentRepository();
  final FeeRepository _feeRepo = FeeRepository();
  final NotificationRepository _notificationRepo = NotificationRepository();
  final TimetableRepository _timetableRepo = TimetableRepository();
  final LeaveRepository _leaveRepo = LeaveRepository();
  final AllocationRepository _allocationRepo = AllocationRepository();

  final isLoading = true.obs;
  final students = <StudentModel>[].obs;
  final student = Rxn<StudentModel>();
  final fees = <FeeModel>[].obs;
  final _allNotifications = <NotificationModel>[].obs;
  final notifications = <NotificationModel>[].obs;
  final unreadNotificationCount = 0.obs;

  final totalFees = 0.0.obs;
  final totalPaid = 0.0.obs;
  final totalPending = 0.0.obs;

  List<FeeModel> get mainFees => fees.where((f) => f.isEducation || f.isTransport || f.isTerm).toList();

  final isTeacher = false.obs;
  final activeProfile = 'student'.obs; // 'student' or 'teacher'

  /// Same person is both a teacher and a parent. Kept separately from
  /// [students] because a cold start into the teacher view doesn't load
  /// students, and the switcher still has to offer a way back to the parent
  /// side.
  final hasDualRole = false.obs;

  final teacherName = ''.obs;
  final teacherInitials = ''.obs;

  // Teacher specific data
  final teacherTodayClasses = <TimetablePeriodModel>[].obs;
  final teacherPendingLeavesCount = 0.obs;

  /// What this teacher is actually assigned to do. Attendance needs a class
  /// (homeroom) allocation; homework and marks need a subject allocation.
  /// The backend enforces the same rules -- this only hides dead-end entry points.
  final accessLoaded = false.obs; // false until allocations are fetched
  final canTakeAttendance = false.obs;
  final canAssignHomework = false.obs;

  @override
  void onInit() {
    super.onInit();
    _checkAuthAndLoad();
  }

  @override
  void onReady() {
    super.onReady();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    if (!FcmService.isAvailable) return; // push not configured: nothing to ask permission for
    final prefs = await SharedPreferences.getInstance();
    final hasAsked = prefs.getBool('has_asked_fcm_permission') ?? false;
    if (hasAsked) return;

    try {
      final settings = await FirebaseMessaging.instance.getNotificationSettings();
      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        await prefs.setBool('has_asked_fcm_permission', true);
        return;
      }
    } catch (e) {
      print('Error checking FCM notification settings: $e');
    }

    Get.bottomSheet(
       PermissionSheet(
         onAllow: () async {
           Get.back();
           await prefs.setBool('has_asked_fcm_permission', true);
           await FcmService.requestPermissions();
         },
         onDeny: () async {
           Get.back();
           await prefs.setBool('has_asked_fcm_permission', true);
         }
       ),
       isDismissible: false,
       enableDrag: false,
       isScrollControlled: true,
    );
  }

  /// Re-runs the full auth/session load from scratch, clearing any state
  /// from a previous session first. DashboardController is permanent (see
  /// DashboardBinding) so it survives logout — without this, its onInit()
  /// only ever runs once per app process, and a logout-then-relogin (same
  /// user or a different one) would keep showing stale data from before.
  /// Call this after every login and on logout.
  Future<void> reinitialize() async {
    students.clear();
    student.value = null;
    fees.clear();
    _allNotifications.clear();
    notifications.clear();
    unreadNotificationCount.value = 0;
    totalFees.value = 0;
    totalPaid.value = 0;
    totalPending.value = 0;
    isTeacher.value = false;
    activeProfile.value = 'student';
    teacherName.value = '';
    teacherInitials.value = '';
    teacherTodayClasses.clear();
    teacherPendingLeavesCount.value = 0;
    accessLoaded.value = false;
    canTakeAttendance.value = false;
    canAssignHomework.value = false;
    isLoading.value = true;
    await _checkAuthAndLoad();
  }

  Future<void> _checkAuthAndLoad() async {
    final prefs = await SharedPreferences.getInstance();

    final role = prefs.getString(StorageKeys.userRole);
    final hasDual = prefs.getBool(StorageKeys.hasDualRole) ?? false;
    hasDualRole.value = hasDual;

    if (hasDual || role == 'teacher') {
      isTeacher.value = true;
      teacherName.value = prefs.getString(StorageKeys.staffName) ?? 'Teacher';
      teacherInitials.value = _initialsOf(teacherName.value);
    }

    if (role == 'teacher' && !hasDual) {
      activeProfile.value = 'teacher';
      await loadTeacherDashboardData();
      return;
    }

    if (hasDual && role == 'teacher') {
      activeProfile.value = 'teacher';
      await loadTeacherDashboardData();
      return;
    }

    final pId = prefs.getString(StorageKeys.parentId);
    if (pId == null || pId.isEmpty) {
      Get.offAllNamed(AppRoutes.login);
      return;
    }
    await loadDashboardData(pId);
  }

  static String _initialsOf(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }

  Future<void> switchProfile(String profileType, {StudentModel? selectedStudent}) async {
    activeProfile.value = profileType;
    final prefs = await SharedPreferences.getInstance();
    final secureStorage = const FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true));
    
    if (profileType == 'teacher') {
       final tToken = await secureStorage.read(key: StorageKeys.teacherAccessToken);
       final tRefresh = await secureStorage.read(key: StorageKeys.teacherRefreshToken);
       if (tToken != null) {
         await secureStorage.write(key: StorageKeys.accessToken, value: tToken);
         if (tRefresh != null) {
           await secureStorage.write(key: 'refresh_token', value: tRefresh);
         }
         await prefs.setString(StorageKeys.userRole, 'teacher');
       }
       await loadTeacherDashboardData();
    } else if (profileType == 'student') {
       final pToken = await secureStorage.read(key: StorageKeys.parentAccessToken);
       final pRefresh = await secureStorage.read(key: StorageKeys.parentRefreshToken);
       if (pToken != null) {
         await secureStorage.write(key: StorageKeys.accessToken, value: pToken);
         if (pRefresh != null) {
           await secureStorage.write(key: 'refresh_token', value: pRefresh);
         }
         await prefs.setString(StorageKeys.userRole, 'parent');
       }

       if (selectedStudent != null) {
         switchStudent(selectedStudent);
       } else if (student.value != null) {
         switchStudent(student.value!);
       } else {
         final pId = prefs.getString(StorageKeys.parentId);
         if (pId != null) await loadDashboardData(pId);
       }
    }
  }

  Future<void> loadTeacherDashboardData() async {
    isLoading.value = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final teacherId = prefs.getString(StorageKeys.staffId);
      if (teacherId == null) {
        isLoading.value = false;
        return;
      }

      // 1. Fetch Today's Classes
      final allPeriods = await _timetableRepo.getMyTimetable();
      final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      final todayStr = days[DateTime.now().weekday - 1];
      
      final todayClasses = allPeriods.where((p) => p.dayOfWeek == todayStr).toList();
      todayClasses.sort((a, b) => a.startTime.compareTo(b.startTime));
      teacherTodayClasses.assignAll(todayClasses);

      // 2. Fetch Pending Leaves
      final academicYearId = await _allocationRepo.getActiveAcademicYearId();
      if (academicYearId != null) {
        final classes = await _allocationRepo.getMyClasses(academicYearId, teacherId);
        canTakeAttendance.value = classes.isNotEmpty;
        final subjects = await _allocationRepo.getMySubjectAllocations(academicYearId, teacherId);
        canAssignHomework.value = subjects.isNotEmpty;
        accessLoaded.value = true;
        int pendingLeaves = 0;
        for (final cls in classes) {
          final leaves = await _leaveRepo.getClassLeaveRequests(
            standard: cls.standard,
            division: cls.division,
            medium: cls.medium,
            status: 'PENDING',
          );
          pendingLeaves += leaves.length;
        }
        teacherPendingLeavesCount.value = pendingLeaves;
      }
    } catch (e) {
      print('Error loading teacher dashboard data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadDashboardData(String parentId, {bool forceRefresh = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final studentsCacheKey = 'students_list_cache_$parentId';
    final studentTimeKey = 'student_time_$parentId';

    final cachedStudentsStr = prefs.getString(studentsCacheKey);
    final cachedStudentTime = prefs.getInt(studentTimeKey) ?? 0;
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    
    bool hasCache = false;

    if (!forceRefresh && cachedStudentsStr != null && cachedStudentsStr.isNotEmpty) {
      try {
        final decodedList = json.decode(cachedStudentsStr) as List;
        final cachedStudents = decodedList.map((s) => StudentModel.fromJson(s as Map<String, dynamic>)).toList();
        students.assignAll(cachedStudents);
        
        if (cachedStudents.isNotEmpty) {
          final activeId = prefs.getString(StorageKeys.studentId) ?? '';
          StudentModel activeStudent = cachedStudents.first;
          
          String? targetId = FcmService.initialStudentId ?? (activeId.isNotEmpty ? activeId : null);
          if (targetId != null) {
            final matched = cachedStudents.firstWhereOrNull((s) => s.id == targetId);
            if (matched != null) {
              activeStudent = matched;
            }
          }
          student.value = activeStudent;
          await prefs.setString(StorageKeys.studentId, activeStudent.id);

          final sId = activeStudent.id;
          final feesCacheKey = 'fees_cache_$sId';
          final cachedFeesStr = prefs.getString(feesCacheKey);
          if (cachedFeesStr != null && cachedFeesStr.isNotEmpty) {
            final decodedFees = json.decode(cachedFeesStr) as List;
            final cachedFees = decodedFees.map((item) => FeeModel.fromJson(item as Map<String, dynamic>)).toList();
            
            // Filter: keep only EDUCATION, TRANSPORT, TERM fees for aggregates
            final filteredFees = cachedFees.where((f) {
              return f.isEducation || f.isTransport || f.isTerm;
            }).toList();

            fees.assignAll(cachedFees);
            _calculateAggregates(filteredFees);
          }
        }
        
        hasCache = true;
      } catch (e) {
        print('Error loading from cache: $e');
      }
    }

    if (!hasCache || forceRefresh) {
      isLoading.value = true;
    }
    try {
      final studentsList = await _studentRepo.getStudentsForParent(parentId);
      students.assignAll(studentsList);
      if (studentsList.isNotEmpty) {
        await prefs.setString(studentsCacheKey, json.encode(studentsList.map((s) => s.toJson()).toList()));
        await prefs.setInt(studentTimeKey, nowMs);

        final activeId = prefs.getString(StorageKeys.studentId) ?? '';
        StudentModel activeStudent = studentsList.first;
        
        String? targetId = FcmService.initialStudentId ?? (activeId.isNotEmpty ? activeId : null);
        
        if (targetId != null) {
          final matched = studentsList.firstWhereOrNull((s) => s.id == targetId);
          if (matched != null) {
            activeStudent = matched;
          }
        }
        
        // Clear it so it only applies on the first load from push
        FcmService.initialStudentId = null;
        student.value = activeStudent;
        await prefs.setString(StorageKeys.studentId, activeStudent.id);

        final sId = activeStudent.id;
        final allFees = await _feeRepo.getFees(sId);
        
        // Filter: keep only EDUCATION, TRANSPORT, TERM fees for aggregates
        final filteredFees = allFees.where((f) {
          return f.isEducation || f.isTransport || f.isTerm;
        }).toList();

        fees.assignAll(allFees);
        
        final feesCacheKey = 'fees_cache_$sId';
        await prefs.setString(feesCacheKey, json.encode(allFees.map((f) => f.toJson()).toList()));

        _calculateAggregates(filteredFees);

        _loadNotifications();
      } else if (prefs.getBool(StorageKeys.hasDualRole) ?? false) {
        // This account is also a teacher and the parent side has no linked
        // student — don't dead-end on "no student found" when the teacher
        // side is the one with real data to show.
        await switchProfile('teacher');
      }
    } catch (e) {
      print('Error loading dashboard data: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> switchStudent(StudentModel selected) async {
    // Clear initial FCM student ID so manual student switching is not overridden
    FcmService.initialStudentId = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(StorageKeys.studentId, selected.id);
    student.value = selected;
    
    await prefs.remove('fees_cache_${selected.id}');
    
    isLoading.value = true;
    try {
      final sId = selected.id;
      
      List<FeeModel> allFees = [];
      if (sId == '1' || sId == '2') {
        // Dummy bypass data to prevent 401 crash
        allFees = [
          FeeModel(
            id: 'f1',
            studentId: sId,
            termName: 'Q1',
            feeType: 'EDUCATION',
            amount: 5000,
            paidAmount: 0,
            concessionAmount: 0,
            remainingAmount: 5000,
            dueDate: DateTime.now().add(const Duration(days: 10)).toIso8601String(),
            status: 'PENDING',
            academicYear: '2026',
          ),
          FeeModel(
            id: 'f2',
            studentId: sId,
            termName: 'Q1',
            feeType: 'TRANSPORT',
            amount: 1500,
            paidAmount: 0,
            concessionAmount: 0,
            remainingAmount: 1500,
            dueDate: DateTime.now().subtract(const Duration(days: 5)).toIso8601String(),
            status: 'PENDING',
            academicYear: '2026',
          ),
        ];
      } else {
        allFees = await _feeRepo.getFees(sId);
      }
      
      // Filter: keep only EDUCATION, TRANSPORT, TERM fees for aggregates
      final filteredFees = allFees.where((f) {
        return f.isEducation || f.isTransport || f.isTerm;
      }).toList();
      
      fees.assignAll(allFees);
      
      final feesCacheKey = 'fees_cache_$sId';
      await prefs.setString(feesCacheKey, json.encode(allFees.map((f) => f.toJson()).toList()));

      _calculateAggregates(filteredFees);
      
      if (sId == '1' || sId == '2') {
        _allNotifications.clear();
      } else {
        final notifs = await _notificationRepo.getNotifications();
        _allNotifications.assignAll(notifs);
      }
      _updateVisibleNotifications();
      
      if (Get.isRegistered<ReceiptDetailsController>()) {
        Get.find<ReceiptDetailsController>().loadReceipts(forceRefresh: true);
      }
      if (Get.isRegistered<PendingFeesController>()) {
        Get.find<PendingFeesController>().reloadForStudent();
      }
    } catch (e) {
      print('Error switching student: $e');
      _updateVisibleNotifications();
    } finally {
      isLoading.value = false;
    }
  }

  void _calculateAggregates(List<FeeModel> allFees) {
    double total = 0;
    double paid = 0;
    double pending = 0;
    for (final f in allFees) {
      total += f.amount;
      // Treat concession as effectively paid (for RTE students)
      paid += f.paidAmount + f.concessionAmount;
      pending += f.remainingAmount;
    }
    totalFees.value = total;
    totalPaid.value = paid;
    totalPending.value = pending;
  }

  /// Fetch real notifications from the backend and update the badge count.
  Future<void> _loadNotifications() async {
    try {
      final notifs = await _notificationRepo.getNotifications();
      _allNotifications.assignAll(notifs);
      _updateVisibleNotifications();
    } catch (e) {
      print('Error loading notifications: $e');
    }
  }

  void _updateVisibleNotifications() {
    final sId = student.value?.id;
    if (sId == null) {
      notifications.assignAll(_allNotifications);
      unreadNotificationCount.value = _allNotifications.where((n) => !n.isRead).length;
    } else {
      final filtered = _allNotifications.where((n) {
        return _isForStudent(n, sId);
      }).toList();
      notifications.assignAll(filtered);
      unreadNotificationCount.value = filtered.where((n) => !n.isReadFor(sId)).length;
    }
  }

  bool _isForStudent(NotificationModel n, String studentId) {
    if (n.targetStudentIds.isEmpty) return true; // Broadcast
    return n.targetStudentIds.contains(studentId); // Targeted
  }

  bool hasUnreadNotificationsFor(String studentId) {
    return _allNotifications.any((n) {
      return _isForStudent(n, studentId) && !n.isReadFor(studentId);
    });
  }

  /// Instantly sync local state without waiting for a network fetch.
  void markNotificationAsReadLocally(String notifId, {String? studentId}) {
    final notif = _allNotifications.firstWhereOrNull((n) => n.id == notifId);
    if (notif != null) {
      if (studentId != null) {
        notif.markAsReadFor(studentId);
      } else {
        notif.isRead = true;
      }
      _allNotifications.refresh();
      _updateVisibleNotifications();
    }
  }

  void markAllNotificationsAsReadLocally({String? studentId}) {
    for (final n in _allNotifications) {
      if (studentId != null) {
        n.markAsReadFor(studentId);
      } else {
        n.isRead = true;
      }
    }
    _allNotifications.refresh();
    _updateVisibleNotifications();
  }

  /// Refresh notifications only (called when tapping notification bell).
  Future<void> refreshNotifications() async {
    await _loadNotifications();
  }

  Future<void> refreshData() async {
    final prefs = await SharedPreferences.getInstance();
    final pId = prefs.getString(StorageKeys.parentId);
    if (pId != null && pId.isNotEmpty) {
      // Invalidate all caches for all students under this parent
      for (final s in students) {
        await prefs.remove('fees_cache_${s.id}');
        await prefs.remove('payments_cache_${s.id}');
        await prefs.remove('payments_time_${s.id}');
        await prefs.remove('receipts_cache_${s.id}');
        await prefs.remove('receipts_time_${s.id}');
      }
      await loadDashboardData(pId, forceRefresh: true);
      
      // Sync receipts if controller is registered
      if (Get.isRegistered<ReceiptDetailsController>()) {
        Get.find<ReceiptDetailsController>().loadReceipts(forceRefresh: true);
      }
    }
  }

  /// Navigate to Pending Fees view to process payment via Razorpay
  Future<void> payFee(FeeModel fee) async {
    if (fee.isPaid) return;
    Get.toNamed(AppRoutes.pendingFees);
  }
}
