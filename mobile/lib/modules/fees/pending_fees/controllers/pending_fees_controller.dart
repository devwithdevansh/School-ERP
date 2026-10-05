import 'package:flutter/material.dart';
import '../../../../core/config/env.dart';
import '../../../../core/config/school_brand.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../data/models/fee_model.dart';
import '../../../../data/repositories/fee_repository.dart';
import '../../../../services/sound_service.dart';
import '../../../dashboard/controllers/dashboard_controller.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

enum FeeStatus { overdue, dueSoon, upcoming }

enum TermGroup { term1, term2 }

enum FeeFilterCategory { all, transport, education, term }

extension TermGroupX on TermGroup {
  String get label {
    switch (this) {
      case TermGroup.term1: return 'Term 1  (Jun – Nov)';
      case TermGroup.term2: return 'Term 2  (Dec – May)';
    }
  }

  IconData get icon {
    switch (this) {
      case TermGroup.term1: return Icons.assignment_rounded;
      case TermGroup.term2: return Icons.assignment_rounded;
    }
  }
}

/// Month order within the academic year (June = 1, May = 12).
int _academicMonthOrder(int calendarMonth) {
  if (calendarMonth >= 6) return calendarMonth - 5;
  return calendarMonth + 7;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEE ITEM
// ─────────────────────────────────────────────────────────────────────────────

class FeeItem {
  final String id;
  final String termName;
  final String feeType;
  final double amount;
  final double paidAmount;
  final double concessionAmount;
  final double remainingAmount;
  final DateTime dueDate;
  final String status;

  const FeeItem({
    required this.id,
    required this.termName,
    required this.feeType,
    required this.amount,
    required this.paidAmount,
    required this.concessionAmount,
    required this.remainingAmount,
    required this.dueDate,
    required this.status,
  });

  bool get isPaid => status == 'PAID' || remainingAmount <= 0;
  bool get isOverdue => !isPaid && dueDate.isBefore(DateTime.now());

  int get daysOverdueOrRemaining =>
      DateTime.now().difference(dueDate).inDays;

  String get statusLabel {
    final d = daysOverdueOrRemaining;
    if (d > 0) return 'Overdue by $d day${d == 1 ? '' : 's'}';
    if (d == 0) return 'Due today';
    return 'Due in ${-d} day${-d == 1 ? '' : 's'}';
  }

  FeeStatus get statusEnum {
    if (isOverdue) return FeeStatus.overdue;
    final d = -daysOverdueOrRemaining;
    if (d <= 30) return FeeStatus.dueSoon;
    return FeeStatus.upcoming;
  }

  bool get isEducation => feeType.toUpperCase() == 'EDUCATION';
  bool get isTransport => feeType.toUpperCase() == 'TRANSPORT';
  bool get isTerm => feeType.toUpperCase() == 'TERM';

  bool get isRTEConcession => concessionAmount > 0 && (isEducation || isTerm);

  int get academicSortKey => _academicMonthOrder(dueDate.month);
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH GROUP
// ─────────────────────────────────────────────────────────────────────────────

class MonthGroup {
  final String monthName;
  final DateTime dueDate;
  final List<FeeItem> subFees;

  MonthGroup({
    required this.monthName,
    required this.dueDate,
    required this.subFees,
  });

  bool get isFullyPaid => subFees.every((f) => f.isPaid);
  bool get isOverdue => subFees.any((f) => !f.isPaid && f.isOverdue);

  double get totalAmount => subFees.fold(0.0, (sum, f) => sum + f.amount);
  double get pendingAmount => subFees.where((f) => !f.isPaid).fold(0.0, (sum, f) => sum + f.remainingAmount);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

class PendingFeesController extends GetxController
    with GetSingleTickerProviderStateMixin {
  final FeeRepository _feeRepo = FeeRepository();

  // ── Observable state ──────────────────────────────────────────────────────
  final RxList<FeeItem> fees = <FeeItem>[].obs;
  final RxSet<String> selectedIds = <String>{}.obs;
  final RxBool isLoading = false.obs;
  final RxBool isRefreshing = false.obs;
  final RxBool hasLoadedOnce = false.obs;
  final RxInt activeQuickSelect = (-1).obs;
  
  final RxMap<TermGroup, bool> sectionExpanded = <TermGroup, bool>{
    TermGroup.term1: true,
    TermGroup.term2: true,
  }.obs;
  var showConfetti = false.obs;

  final RxSet<String> expandedMonths = <String>{}.obs;

  late Razorpay _razorpay;

  // ── Animation ─────────────────────────────────────────────────────────────
  late final AnimationController payBarController;
  late final Animation<double> payBarSlide;
  late final Animation<double> payBarFade;

  // ── Derived ───────────────────────────────────────────────────────────────
  List<FeeItem> get pendingFees => fees.where((f) => !f.isPaid).toList();
  List<FeeItem> get overdueFees => pendingFees.where((f) => f.isOverdue).toList();
  List<FeeItem> get selectedFees => pendingFees.where((f) => selectedIds.contains(f.id)).toList();

  double get selectedTotal => selectedFees.fold(0.0, (s, f) => s + f.remainingAmount);
  double get totalOutstanding => pendingFees.fold(0.0, (s, f) => s + f.remainingAmount);
  double get overdueTotal => overdueFees.fold(0.0, (s, f) => s + f.remainingAmount);
  double get paidTotal => fees.fold(0.0, (s, f) => s + f.paidAmount);
  double get grandTotal => fees.fold(0.0, (s, f) => s + f.amount);

  bool get hasSelection => selectedIds.isNotEmpty;

  bool get isStudentRTE {
    if (Get.isRegistered<DashboardController>()) {
      return Get.find<DashboardController>().student.value?.isRTE ?? false;
    }
    return false;
  }

  List<FeeItem> get sortedMonthlyFees {
    final monthly = pendingFees
        .where((f) => f.isEducation || f.isTransport)
        .toList()
      ..sort((a, b) {
        if (a.isOverdue != b.isOverdue) return a.isOverdue ? -1 : 1;
        final ak = a.academicSortKey, bk = b.academicSortKey;
        if (ak != bk) return ak.compareTo(bk);
        return a.dueDate.compareTo(b.dueDate);
      });
    return monthly;
  }

  // ── Grouping logic for View ───────────────────────────────────────────────

  List<MonthGroup> monthGroupsForTerm(TermGroup term) {
    final monthlyFees = fees.where((f) => f.isEducation || f.isTransport).toList();
    final Map<String, List<FeeItem>> groupedByMonth = {};
    for (final fee in monthlyFees) {
      final name = fee.termName;
      groupedByMonth.putIfAbsent(name, () => []).add(fee);
    }

    final List<MonthGroup> result = [];
    final termMonths = term == TermGroup.term1
        ? ['June', 'July', 'August', 'September', 'October', 'November']
        : ['December', 'January', 'February', 'March', 'April', 'May'];

    for (final monthName in termMonths) {
      List<FeeItem> monthFees = [];
      for (final entry in groupedByMonth.entries) {
        final key = entry.key.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
        final target = monthName.toLowerCase();
        if (key == target || key.startsWith(target) || target.startsWith(key)) {
          monthFees = entry.value;
          break;
        }
      }

      if (monthFees.isEmpty) continue;

      final dueDate = monthFees.isNotEmpty 
          ? monthFees.first.dueDate 
          : DateTime.now();

      final group = MonthGroup(
        monthName: monthName,
        dueDate: dueDate,
        subFees: monthFees,
      );

      // Display month only if it has at least one unpaid sub-fee
      if (!group.isFullyPaid) {
        result.add(group);
      }
    }
    return result;
  }

  FeeItem? termFeeForTerm(TermGroup term) {
    final termName = term == TermGroup.term1 ? 'Term 1' : 'Term 2';
    FeeItem? fee;
    for (final f in fees) {
      if (f.isTerm && f.termName.toLowerCase() == termName.toLowerCase()) {
        fee = f;
        break;
      }
    }
    if (fee != null && !fee.isPaid) {
      return fee;
    }
    return null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  @override
  void onInit() {
    super.onInit();
    payBarController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 380));
    payBarSlide = Tween<double>(begin: 1.0, end: 0.0).animate(
        CurvedAnimation(parent: payBarController, curve: Curves.easeOutBack));
    payBarFade = Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: payBarController, curve: Curves.easeOut));
    ever(selectedIds, (_) => _syncPayBar());
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);

    if (Get.isRegistered<DashboardController>()) {
      ever(Get.find<DashboardController>().fees, (_) {
        _syncWithDashboard();
      });
      _syncWithDashboard();
    } else {
      _loadFees();
    }
  }

  @override
  void onClose() {
    _razorpay.clear();
    payBarController.dispose();
    super.onClose();
  }

  void _syncPayBar() {
    selectedIds.isNotEmpty
        ? payBarController.forward()
        : payBarController.reverse();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  void _syncWithDashboard() {
    isLoading.value = true;
    if (!Get.isRegistered<DashboardController>()) {
      Get.put<DashboardController>(DashboardController(), permanent: true);
    }
    final allFees = Get.find<DashboardController>().fees;
    final filteredData = allFees.where((f) => !f.isAdmission && !f.isBagKit).toList();
    
    final mapped = filteredData.map((f) => FeeItem(
      id:       f.id,
      termName: f.termName,
      feeType:  f.feeType,
      amount:   f.amount,
      paidAmount: f.paidAmount,
      concessionAmount: f.concessionAmount,
      remainingAmount: f.remainingAmount,
      dueDate:  DateTime.tryParse(f.dueDate) ?? DateTime.now(),
      status:   f.status,
    )).toList();
    
    fees.assignAll(mapped);
    isLoading.value = false;
    hasLoadedOnce.value = true;
  }

  Future<void> _loadFees() async {
    isLoading.value = true;
    try {
      final prefs     = await SharedPreferences.getInstance();
      final studentId = prefs.getString(StorageKeys.studentId) ?? '';
      if (studentId.isNotEmpty) {
        final data   = await _feeRepo.getFees(studentId);
        
        // Filter out Bag & Kit and Admission fees
        final filteredData = data.where((f) {
          return !f.isAdmission && !f.isBagKit;
        }).toList();

        final mapped = filteredData.map((f) => FeeItem(
          id:       f.id,
          termName: f.termName,
          feeType:  f.feeType,
          amount:   f.amount,
          paidAmount: f.paidAmount,
          concessionAmount: f.concessionAmount,
          remainingAmount: f.remainingAmount,
          dueDate:  DateTime.tryParse(f.dueDate) ?? DateTime.now(),
          status:   f.status,
        )).toList();
        fees.assignAll(mapped);
      }
    } catch (e) {
      debugPrint('Error in _loadFees: $e');
    } finally {
      isLoading.value   = false;
      hasLoadedOnce.value = true;
    }
  }

  Future<void> reloadForStudent() async {
    selectedIds.clear();
    await _loadFees();
  }

  @override
  Future<void> refresh() async {
    isRefreshing.value = true;
    try {
      final prefs     = await SharedPreferences.getInstance();
      final studentId = prefs.getString(StorageKeys.studentId) ?? '';
      if (studentId.isNotEmpty) {
        final data   = await _feeRepo.getFees(studentId);
        
        // Filter out Bag & Kit and Admission fees
        final filteredData = data.where((f) {
          return !f.isAdmission && !f.isBagKit;
        }).toList();

        final mapped = filteredData.map((f) => FeeItem(
          id:       f.id,
          termName: f.termName,
          feeType:  f.feeType,
          amount:   f.amount,
          paidAmount: f.paidAmount,
          concessionAmount: f.concessionAmount,
          remainingAmount: f.remainingAmount,
          dueDate:  DateTime.tryParse(f.dueDate) ?? DateTime.now(),
          status:   f.status,
        )).toList();
        fees.assignAll(mapped);
      }
    } catch (e) {
      debugPrint('Error in refresh: $e');
    } finally {
      isRefreshing.value  = false;
      hasLoadedOnce.value = true;
    }
  }

  // ── Selection & Expansion ─────────────────────────────────────────────────
  static const _monthOrder = [
    'june', 'july', 'august', 'september', 'october', 'november',
    'december', 'january', 'february', 'march', 'april', 'may'
  ];

  final Rx<FeeFilterCategory> selectedCategory = FeeFilterCategory.all.obs;

  void setCategory(FeeFilterCategory cat) {
    selectedCategory.value = cat;
  }

  List<FeeItem> get transportPendingFees => pendingFees.where((f) => f.isTransport).toList();
  List<FeeItem> get educationPendingFees => pendingFees.where((f) => f.isEducation).toList();
  List<FeeItem> get termPendingFees => pendingFees.where((f) => f.isTerm).toList();

  int _monthIndex(String termName) {
    final clean = termName.toLowerCase().trim();
    if (clean == 'term 1') return 0;
    if (clean == 'term 2') return 6;
    final idx = _monthOrder.indexOf(clean);
    return idx != -1 ? idx : 99;
  }

  int _typePriority(FeeItem fee) {
    if (fee.isTerm) return 0;
    if (fee.isEducation) return 1;
    if (fee.isTransport) return 2;
    return 3;
  }

  /// Chronological list of pending Education & Term fee items in strict sequence.
  List<FeeItem> get unifiedEducationPendingFees {
    final list = pendingFees.where((f) => f.isEducation || f.isTerm).toList()
      ..sort((a, b) {
        final ma = _monthIndex(a.termName);
        final mb = _monthIndex(b.termName);
        if (ma != mb) return ma.compareTo(mb);
        final ta = _typePriority(a);
        final tb = _typePriority(b);
        if (ta != tb) return ta.compareTo(tb);
        return a.id.compareTo(b.id);
      });
    return list;
  }

  /// Chronological list of pending Transport fee items in strict sequence.
  List<FeeItem> get unifiedTransportPendingFees {
    final list = pendingFees.where((f) => f.isTransport).toList()
      ..sort((a, b) {
        final ma = _monthIndex(a.termName);
        final mb = _monthIndex(b.termName);
        if (ma != mb) return ma.compareTo(mb);
        return a.dueDate.compareTo(b.dueDate);
      });
    return list;
  }

  void toggleFee(FeeItem fee) {
    activeQuickSelect.value = -1;
    if (fee.isPaid) return;

    final list = fee.isTransport
        ? unifiedTransportPendingFees
        : unifiedEducationPendingFees;

    final index = list.indexWhere((f) => f.id == fee.id);
    if (index == -1) {
      if (selectedIds.contains(fee.id)) {
        selectedIds.remove(fee.id);
      } else {
        selectedIds.add(fee.id);
      }
      return;
    }

    final isCurrentlySelected = selectedIds.contains(fee.id);

    if (isCurrentlySelected) {
      // Deselect this item AND ALL SUBSEQUENT items in its category sequence
      for (int i = index; i < list.length; i++) {
        selectedIds.remove(list[i].id);
      }
    } else {
      // Select this item AND ALL PRIOR unpaid items in its category sequence
      for (int i = 0; i <= index; i++) {
        selectedIds.add(list[i].id);
      }
    }
  }

  bool isMonthExpanded(String monthName) {
    return expandedMonths.contains(monthName);
  }

  void toggleMonthExpanded(String monthName) {
    if (expandedMonths.contains(monthName)) {
      expandedMonths.remove(monthName);
    } else {
      expandedMonths.add(monthName);
    }
  }

  bool isMonthGroupFullySelected(MonthGroup group) {
    final unpaidSubFees = group.subFees.where((f) => !f.isPaid).toList();
    if (unpaidSubFees.isEmpty) return false;
    return unpaidSubFees.every((f) => selectedIds.contains(f.id));
  }

  bool isMonthGroupPartiallySelected(MonthGroup group) {
    final unpaidSubFees = group.subFees.where((f) => !f.isPaid).toList();
    if (unpaidSubFees.isEmpty) return false;
    final selCount = unpaidSubFees.where((f) => selectedIds.contains(f.id)).length;
    return selCount > 0 && selCount < unpaidSubFees.length;
  }

  void toggleMonthGroup(MonthGroup group) {
    final unpaidSubFees = group.subFees.where((f) => !f.isPaid).toList();
    if (unpaidSubFees.isEmpty) return;

    final allSel = isMonthGroupFullySelected(group);

    if (allSel) {
      // Deselect transport fees in this month independently
      for (final f in unpaidSubFees) {
        if (f.isTransport) selectedIds.remove(f.id);
      }
      // For education/term fees, deselect starting from earliest in group
      final eduList = unpaidSubFees.where((f) => !f.isTransport).toList();
      if (eduList.isNotEmpty) {
        final list = unifiedEducationPendingFees;
        FeeItem? earliest;
        int earliestIdx = 999999;
        for (final f in eduList) {
          final idx = list.indexWhere((item) => item.id == f.id);
          if (idx != -1 && idx < earliestIdx) {
            earliestIdx = idx;
            earliest = f;
          }
        }
        if (earliest != null) toggleFee(earliest);
      }
    } else {
      // Select transport fees in this month independently
      for (final f in unpaidSubFees) {
        if (f.isTransport) selectedIds.add(f.id);
      }
      // For education/term fees, select up to latest in group
      final eduList = unpaidSubFees.where((f) => !f.isTransport).toList();
      if (eduList.isNotEmpty) {
        final list = unifiedEducationPendingFees;
        FeeItem? latest;
        int latestIdx = -1;
        for (final f in eduList) {
          final idx = list.indexWhere((item) => item.id == f.id);
          if (idx != -1 && idx > latestIdx) {
            latestIdx = idx;
            latest = f;
          }
        }
        if (latest != null) toggleFee(latest);
      }
    }
    
    activeQuickSelect.value = -1;
  }

  List<FeeItem> _unpaidFeesForTerm(TermGroup term) {
    final List<FeeItem> list = [];
    final termFee = termFeeForTerm(term);
    if (termFee != null) {
      list.add(termFee);
    }
    final groups = monthGroupsForTerm(term);
    for (final g in groups) {
      list.addAll(g.subFees.where((f) => !f.isPaid));
    }
    return list;
  }

  bool isTermFullySelected(TermGroup term) {
    final unpaid = _unpaidFeesForTerm(term);
    if (unpaid.isEmpty) return false;
    return unpaid.every((f) => selectedIds.contains(f.id));
  }

  int overdueCountForTerm(TermGroup term) {
    return _unpaidFeesForTerm(term).where((f) => f.isOverdue).length;
  }

  int unpaidCountForTerm(TermGroup term) {
    return _unpaidFeesForTerm(term).length;
  }

  void selectAllInTerm(TermGroup term) {
    final unpaid = _unpaidFeesForTerm(term);
    if (unpaid.isEmpty) return;

    final allSel = unpaid.every((f) => selectedIds.contains(f.id));
    
    if (allSel) {
      for (final f in unpaid) {
        if (f.isTransport) selectedIds.remove(f.id);
      }
      final eduList = unpaid.where((f) => !f.isTransport).toList();
      if (eduList.isNotEmpty) {
        final list = unifiedEducationPendingFees;
        FeeItem? earliest;
        int earliestIdx = 999999;
        for (final f in eduList) {
          final idx = list.indexWhere((item) => item.id == f.id);
          if (idx != -1 && idx < earliestIdx) {
            earliestIdx = idx;
            earliest = f;
          }
        }
        if (earliest != null) toggleFee(earliest);
      }
    } else {
      for (final f in unpaid) {
        if (f.isTransport) selectedIds.add(f.id);
      }
      final eduList = unpaid.where((f) => !f.isTransport).toList();
      if (eduList.isNotEmpty) {
        final list = unifiedEducationPendingFees;
        FeeItem? latest;
        int latestIdx = -1;
        for (final f in eduList) {
          final idx = list.indexWhere((item) => item.id == f.id);
          if (idx != -1 && idx > latestIdx) {
            latestIdx = idx;
            latest = f;
          }
        }
        if (latest != null) toggleFee(latest);
      }
    }
    activeQuickSelect.value = -1;
  }

  void quickSelectMonths(int n) {
    selectedIds.clear();
    final groups = [...monthGroupsForTerm(TermGroup.term1), ...monthGroupsForTerm(TermGroup.term2)];
    final count = n == 9999 ? groups.length : n.clamp(0, groups.length);
    if (count <= 0) return;
    
    for (int i = 0; i < count; i++) {
      final g = groups[i];
      for (final f in g.subFees.where((sub) => !sub.isPaid)) {
        selectedIds.add(f.id);
      }
    }
  }

  void quickSelectTerm(TermGroup term) {
    selectedIds.clear();
    final unpaid = _unpaidFeesForTerm(term);
    for (final f in unpaid) {
      selectedIds.add(f.id);
    }
  }

  void selectAllOverdue() {
    for (final f in overdueFees) {
      selectedIds.add(f.id);
    }
    activeQuickSelect.value = -1;
  }

  void clearSelection() {
    selectedIds.clear();
    activeQuickSelect.value = -1;
  }

  void toggleSection(TermGroup term) {
    sectionExpanded[term] = !(sectionExpanded[term] ?? true);
    sectionExpanded.refresh();
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  Future<void> paySelected() async {
    if (isLoading.value) return; // Prevent double-tap double-charges

    final toPayItems = pendingFees
        .where((f) => selectedIds.contains(f.id))
        .toList();
    if (toPayItems.isEmpty) return;

    isLoading.value = true;
    try {
      final totalAmount = toPayItems.fold(0.0, (sum, f) => sum + f.remainingAmount);
      
      final orderId = await _feeRepo.createRazorpayOrder(totalAmount);
      if (orderId == null) {
        throw Exception('Failed to generate order ID');
      }

      final prefs = await SharedPreferences.getInstance();
      final pNumber = prefs.getString(StorageKeys.phone) ?? '';
      
      var options = {
        'key': Env.get('RAZORPAY_KEY_ID'),
        'amount': (totalAmount * 100).round(),
        'name': SchoolBrand.appName,
        'description': 'Fee Payment',
        'order_id': orderId,
        'prefill': {
          'contact': pNumber,
        },
        'theme': {
          'color': '#3399cc'
        }
      };

      _razorpay.open(options);
    } catch (e) {
      debugPrint('Error in paySelected: $e');
      SoundService.instance.play(AppSound.error);
      Get.snackbar(
          'Payment Could Not Start',
          'Something went wrong. Please try again.',
          snackPosition: SnackPosition.BOTTOM);
      isLoading.value = false;
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    try {
      final toPayItems = pendingFees.where((f) => selectedIds.contains(f.id)).toList();
      final payments = toPayItems.map((f) => {
        'ledgerId': f.id,
        'amount': f.remainingAmount,
        'method': 'ONLINE'
      }).toList();

      final success = await _feeRepo.verifyRazorpayPayment(
        response.orderId!,
        response.paymentId!,
        response.signature!,
        payments
      );

      if (success) {
        SoundService.instance.play(AppSound.success);
        showConfetti.value = true;
        Future.delayed(const Duration(seconds: 4), () {
          showConfetti.value = false;
        });
        
        final updated = fees.map((f) => selectedIds.contains(f.id)
            ? FeeItem(
                id: f.id,
                termName: f.termName,
                feeType: f.feeType,
                amount: f.amount,
                paidAmount: f.amount,
                concessionAmount: f.concessionAmount,
                remainingAmount: 0.0,
                dueDate: f.dueDate,
                status: 'PAID',
              )
            : f).toList();
        fees.assignAll(updated);
        selectedIds.clear();

        final prefs = await SharedPreferences.getInstance();
        final sId   = prefs.getString(StorageKeys.studentId) ?? '';
        final pId   = prefs.getString(StorageKeys.parentId)  ?? '';
        if (sId.isNotEmpty) {
          await prefs.remove('fees_cache_$sId');
          await prefs.remove('payments_cache_$sId');
          await prefs.remove('payments_time_$sId');
          await prefs.remove('receipts_cache_$sId');
          await prefs.remove('receipts_time_$sId');
        }
        if (pId.isNotEmpty) {
          await prefs.remove('student_time_$pId');
        }

        if (Get.isRegistered<DashboardController>()) {
          Get.find<DashboardController>().refreshData();
        }
      } else {
        SoundService.instance.play(AppSound.error);
        Get.snackbar(
          'Please Contact School',
          'Payment was done, but we could not confirm it. Please contact your school with your payment ID.',
        );
      }
    } catch (e) {
      debugPrint('Error in _handlePaymentSuccess: $e');
    } finally {
      isLoading.value = false;
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    isLoading.value = false;
    SoundService.instance.play(AppSound.error);
    final String msg = (response.message != null && response.message!.isNotEmpty)
        ? 'Payment could not be completed. Please try again.'
        : 'Payment was cancelled. No money has been deducted.';
    Get.snackbar(
      'Payment Not Done',
      msg,
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    isLoading.value = false;
    Get.snackbar('Wallet Selected', 'You selected ${response.walletName}. Please complete the payment there.');
  }
}
