import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../../data/models/roadmap_milestone_model.dart';
import '../../../data/repositories/calendar_repository.dart';

class RoadmapController extends GetxController {
  final _repo = CalendarRepository();

  final isLoading = true.obs;
  final selectedQuarter = 'ALL'.obs; // ALL, Q1, Q2, Q3, Q4
  final selectedCategory = 'ALL'.obs; // ALL, EXAM, VACATION, EVENT, HOLIDAY, PTM

  final combinedItems = <RoadmapMilestoneModel>[].obs;
  final roadmapByQuarter = <String, List<RoadmapMilestoneModel>>{}.obs;

  @override
  void onInit() {
    super.onInit();
    loadData();
  }

  Future<void> loadData() async {
    isLoading.value = true;
    try {
      final res = await _repo.getRoadmap();
      roadmapByQuarter.value = res.quarters;

      // Deduplicate items by title and startDate if needed
      final items = res.allItems;
      items.sort((a, b) => a.startDate.compareTo(b.startDate));
      combinedItems.value = items;
    } catch (e) {
      debugPrint('RoadmapController.loadData error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  List<RoadmapMilestoneModel> get filteredItems {
    var list = combinedItems.toList();

    // 1. Filter by Quarter
    if (selectedQuarter.value != 'ALL') {
      list = list.where((item) => item.quarter == selectedQuarter.value).toList();
    }

    // 2. Filter by Category
    if (selectedCategory.value != 'ALL') {
      final cat = selectedCategory.value;
      if (cat == 'EXAM') {
        list = list.where((m) => m.isExam).toList();
      } else if (cat == 'VACATION') {
        list = list.where((m) => m.isVacation).toList();
      } else if (cat == 'EVENT') {
        list = list.where((m) => m.isEvent).toList();
      } else if (cat == 'HOLIDAY') {
        list = list.where((m) => m.isHoliday).toList();
      } else if (cat == 'PTM') {
        list = list.where((m) => m.isPtm || m.isMilestone).toList();
      }
    }

    return list;
  }

  // --- Summary Counts ---
  int get totalCount => combinedItems.length;
  int get examsCount => combinedItems.where((m) => m.isExam).length;
  int get vacationsCount => combinedItems.where((m) => m.isVacation).length;
  int get holidaysCount => combinedItems.where((m) => m.isHoliday).length;
  int get eventsCount => combinedItems.where((m) => m.isEvent).length;

  int get completedCount =>
      combinedItems.where((m) => m.status == MilestoneStatus.completed).length;

  int get inProgressCount =>
      combinedItems.where((m) => m.status == MilestoneStatus.inProgress).length;

  double get progressPercentage {
    if (totalCount == 0) return 0.0;
    return (completedCount / totalCount).clamp(0.0, 1.0);
  }

  /// Finds the very next active or upcoming item in the session
  RoadmapMilestoneModel? get nextUpcomingItem {
    final now = DateTime.now();
    // 1. Check for any in-progress event right now
    final inProgress = combinedItems.firstWhereOrNull(
      (m) => m.status == MilestoneStatus.inProgress,
    );
    if (inProgress != null) return inProgress;

    // 2. Find the earliest future milestone
    return combinedItems.firstWhereOrNull(
      (m) => m.endDate.isAfter(now) || m.startDate.isAfter(now),
    );
  }
}
