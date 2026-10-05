import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:get/get.dart';
import '../../../../core/utils/pdf_download_helper.dart';
import '../../../../data/models/receipt_model.dart';
import '../../../../data/repositories/receipt_repository.dart';
import '../../../../data/repositories/notification_repository.dart';
import '../../../dashboard/controllers/dashboard_controller.dart';
import 'receipt_pdf_generator.dart';

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT GROUP  — receipts with the same receipt number (or same txn minute)
//                  are merged into a single downloadable receipt card.
// ─────────────────────────────────────────────────────────────────────────────

class ReceiptGroup {
  final List<ReceiptModel> items;
  final String receiptNumber;
  final DateTime paidAt;

  String get displayReceiptNumber {
    if (receiptNumber.isEmpty) return 'N/A';
    // If it's a long Mongo ID fallback, slice it. Otherwise keep sequential number.
    return receiptNumber.length > 12 ? receiptNumber.substring(0, 12) : receiptNumber;
  }

  List<ReceiptModel> get activeItems => items.where((item) => !item.isReversed).toList();
  bool get isPartiallyReversed => items.any((item) => item.isReversed) && items.any((item) => !item.isReversed);
  double get revisedTotal => activeItems.fold(0.0, (s, r) => s + r.amount);

  double get totalAmount => revisedTotal;

  String get termSummary => activeItems
      .map((r) => r.termName)
      .where((t) => t.isNotEmpty)
      .toSet()
      .join(', ');

  String get categoryLabel {
    final labels = activeItems.map((r) => r.categoryLabel).toSet();
    if (labels.isEmpty) return 'Reversed';
    return labels.length == 1 ? labels.first : 'Multiple';
  }

  String get categoriesSummary {
    final cats = activeItems.map((r) => r.categoryLabel).toSet().toList();
    return cats.join(' & ');
  }

  bool get isTransport => activeItems.isNotEmpty && activeItems.every((r) => r.isTransport);

  String get studentName => items.isNotEmpty ? items.first.studentName : 'Student';
  String get paymentMode => items.isNotEmpty ? items.first.paymentMode : '';

  String get monthLabel {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return '${months[paidAt.month - 1]} ${paidAt.year}';
  }

  String get monthRangeSummary {
    final terms = activeItems.map((item) => item.termName).where((t) => t.isNotEmpty).toSet().toList();
    if (terms.isEmpty) return '';

    final monthOrderMap = {
      'june': 1, 'july': 2, 'august': 3, 'september': 4, 'october': 5, 'november': 6,
      'december': 7, 'january': 8, 'february': 9, 'march': 10, 'april': 11, 'may': 12,
      'jun': 1, 'jul': 2, 'aug': 3, 'sep': 4, 'oct': 5, 'nov': 6,
      'dec': 7, 'jan': 8, 'feb': 9, 'mar': 10, 'apr': 11,
    };

    final parsedMonths = <Map<String, dynamic>>[];
    final nonMonths = <String>[];

    for (final term in terms) {
      final lower = term.toLowerCase().trim();
      final parts = lower.split(RegExp(r'[\s\-\,]+'));
      String? matchedKey;
      for (final part in parts) {
        if (monthOrderMap.containsKey(part)) {
          matchedKey = part;
          break;
        }
      }

      if (matchedKey != null) {
        final order = monthOrderMap[matchedKey]!;
        const shortNames = {
          1: 'Jun', 2: 'Jul', 3: 'Aug', 4: 'Sep', 5: 'Oct', 6: 'Nov',
          7: 'Dec', 8: 'Jan', 9: 'Feb', 10: 'Mar', 11: 'Apr', 12: 'May'
        };
        parsedMonths.add({
          'original': term,
          'order': order,
          'shortName': shortNames[order]!,
        });
      } else {
        nonMonths.add(term);
      }
    }

    if (parsedMonths.isNotEmpty) {
      // Remove duplicates by order to avoid multiple records of same month (e.g. June Education and June Transport)
      final uniqueOrders = <int>{};
      final uniqueParsed = <Map<String, dynamic>>[];
      for (final pm in parsedMonths) {
        final ord = pm['order'] as int;
        if (!uniqueOrders.contains(ord)) {
          uniqueOrders.add(ord);
          uniqueParsed.add(pm);
        }
      }

      uniqueParsed.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));

      final start = uniqueParsed.first['shortName'] as String;
      final end = uniqueParsed.last['shortName'] as String;
      final monthCount = uniqueParsed.length;

      final String rangeText;
      if (monthCount == 1) {
        rangeText = uniqueParsed.first['original'] as String;
      } else {
        rangeText = '$start - $end ($monthCount months)';
      }

      if (nonMonths.isEmpty) {
        return rangeText;
      } else {
        return '$rangeText, ${nonMonths.join(', ')}';
      }
    }

    return terms.join(', ');
  }

  const ReceiptGroup({
    required this.items,
    required this.receiptNumber,
    required this.paidAt,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

class ReceiptDetailsController extends GetxController {
  final ReceiptRepository _receiptRepo = ReceiptRepository();

  final isLoading                 = true.obs;
  final receipts                  = <ReceiptModel>[].obs;
  final RxList<ReceiptGroup> receiptGroups = <ReceiptGroup>[].obs;

  @override
  void onInit() {
    super.onInit();
    loadReceipts();
  }

  // ── Grouping ──────────────────────────────────────────────────────────────

  List<ReceiptGroup> _groupReceipts(List<ReceiptModel> raw) {
    final sorted = List<ReceiptModel>.from(raw)
      ..sort((a, b) => b.paymentDate.compareTo(a.paymentDate));

    final Map<String, List<ReceiptModel>> buckets = {};

    for (final r in sorted) {
      final String key;
      if (r.receiptNumber.isNotEmpty) {
        key = 'rcpt:${r.receiptNumber}';
      } else {
        key = 'id:${r.id}';
      }
      buckets.putIfAbsent(key, () => []).add(r);
    }

    return buckets.entries.map((e) {
      final items = e.value;
      final dt    = DateTime.tryParse(items.first.paymentDate) ?? DateTime.now();
      final receiptNumber = items.first.receiptNumber;

      return ReceiptGroup(
        items:         items,
        receiptNumber: receiptNumber,
        paidAt:        dt,
      );
    }).where((group) => group.activeItems.isNotEmpty).toList()
      ..sort((a, b) => b.paidAt.compareTo(a.paidAt));
  }

  Future<void> _clearUnreadReceiptNotifications(String studentId) async {
    try {
      if (!Get.isRegistered<DashboardController>()) {
        Get.put<DashboardController>(DashboardController(), permanent: true);
      }
      final dashCtrl = Get.find<DashboardController>();
      final notifs = dashCtrl.notifications.where((n) => 
        !n.isReadFor(studentId) && n.type == 'PAYMENT_RECEIVED' && (n.targetStudentIds.isEmpty || n.targetStudentIds.contains(studentId))
      ).toList();
      
      if (notifs.isEmpty) return;

      final repo = NotificationRepository();
      for (final n in notifs) {
        await repo.markAsRead(n.id, studentId: studentId);
        n.markAsReadFor(studentId); // Optimistic UI update
      }
      
      // Update badge count
      dashCtrl.refreshNotifications();
    } catch (e) {
      debugPrint('Error clearing unread receipt notifications: $e');
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> loadReceipts({bool forceRefresh = false}) async {
    if (!Get.isRegistered<DashboardController>()) {
      Get.put<DashboardController>(DashboardController(), permanent: true);
    }
    final dashCtrl = Get.find<DashboardController>();
    final sId      = dashCtrl.student.value?.id ?? '';
    if (sId.isEmpty) { isLoading.value = false; return; }

    final prefs        = await SharedPreferences.getInstance();
    final cacheKey     = 'receipts_cache_$sId';
    final timeKey      = 'receipts_time_$sId';

    if (forceRefresh) {
      await prefs.remove(cacheKey);
      await prefs.remove(timeKey);
    }

    final cachedStr    = prefs.getString(cacheKey);
    final cachedTime   = prefs.getInt(timeKey) ?? 0;
    final nowMs        = DateTime.now().millisecondsSinceEpoch;
    final isCacheFresh = (nowMs - cachedTime) < 5 * 60 * 1000;

    // Clear old state so we don't show the previous student's receipts
    receipts.clear();
    receiptGroups.clear();

    if (!forceRefresh && cachedStr != null && cachedStr.isNotEmpty) {
      try {
        final decoded = json.decode(cachedStr) as List;
        final list    = decoded
            .map((item) => ReceiptModel.fromJson(item as Map<String, dynamic>))
            .toList();
        receipts.assignAll(list);
        receiptGroups.assignAll(_groupReceipts(list));
        if (isCacheFresh) { isLoading.value = false; return; }
      } catch (e) {
        debugPrint('Error loading receipts from cache: $e');
      }
    }

    isLoading.value = true;
    try {
      final studentName = dashCtrl.student.value?.name ?? 'Student';
      final list        = await _receiptRepo.getReceiptsForStudent(sId, studentName);
      receipts.assignAll(list);
      receiptGroups.assignAll(_groupReceipts(list));

      await prefs.setString(cacheKey, json.encode(list.map((r) => r.toJson()).toList()));
      await prefs.setInt(timeKey, nowMs);

      // Mark receipt notifications as read so the red dot goes away
      _clearUnreadReceiptNotifications(sId);
    } catch (e) {
      debugPrint('Error loading receipts: $e');
      // If there's an error (like a network failure), we don't cache an empty list.
      // We also don't clear existing receipts so the user can still see cached data if any was loaded before.
      if (receipts.isEmpty) {
         // Optionally, show an error UI state, but for now we'll just log it.
      }
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> downloadReceiptPdf(ReceiptGroup group) async {
    try {
      Get.snackbar(
        'Getting Your Receipt',
        'Please wait, your receipt is being prepared...',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFE8FAF5),
        colorText: const Color(0xFF0FB893),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
        duration: const Duration(seconds: 2),
      );

      final pdf = await ReceiptPdfGenerator.generatePdf(group);
      final pdfBytes = await pdf.save();

      final safeRcptNum = group.receiptNumber.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final fileName = "receipt_${safeRcptNum.isNotEmpty ? safeRcptNum : group.paidAt.millisecondsSinceEpoch}.pdf";
      await saveAndOpenPdf(pdfBytes, fileName);

      Get.snackbar(
        'Receipt Ready!',
        'Your receipt has been saved. You can share it anytime.',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFE8FAF5),
        colorText: const Color(0xFF0FB893),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
      );
    } catch (e) {
      debugPrint('Error downloading PDF: $e');
      Get.snackbar(
        'Could Not Download',
        'Something went wrong while downloading. Please try again.',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFFFF0F0),
        colorText: const Color(0xFFDC2626),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
      );
    }
  }
}
