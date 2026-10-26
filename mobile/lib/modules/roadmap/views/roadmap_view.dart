import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/roadmap_milestone_model.dart';
import '../controllers/roadmap_controller.dart';

class RoadmapView extends GetView<RoadmapController> {
  const RoadmapView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(
        title: 'Academic Roadmap',
        subtitle: 'Unified exams, vacations, events & holidays',
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadData,
          color: AppColors.primary,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Space.lg, Space.lg, Space.lg, Space.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Next Up Spotlight Banner (if exists)
                      if (controller.nextUpcomingItem != null) ...[
                        _buildNextUpBanner(controller.nextUpcomingItem!),
                        const SizedBox(height: Space.md),
                      ],

                      // 2. Category Filter Chips (Combined by default)
                      _buildCategoryFilterChips(),
                      const SizedBox(height: Space.sm),

                      // 3. Quarter Filter Chips
                      _buildQuarterFilterChips(),
                      const SizedBox(height: Space.md),
                    ],
                  ),
                ),
              ),

              // Combined Timeline Sliver
              _buildCombinedTimelineSliver(),

              const SliverToBoxAdapter(
                child: SizedBox(height: Space.xxl),
              ),
            ],
          ),
        );
      }),
    );
  }

  /// 1. Next Up Spotlight Banner (Protected against overflow)
  Widget _buildNextUpBanner(RoadmapMilestoneModel next) {
    final now = DateTime.now();
    final isInProgress = next.status == MilestoneStatus.inProgress ||
        (now.isAfter(next.startDate) && now.isBefore(next.endDate));

    final daysUntil = next.startDate.difference(now).inDays;
    String timingText;
    if (isInProgress) {
      timingText = 'Ongoing';
    } else if (daysUntil == 0) {
      timingText = 'Starts Today';
    } else if (daysUntil == 1) {
      timingText = 'Starts Tomorrow';
    } else {
      timingText = 'In $daysUntil days';
    }

    final dateStr = next.isSingleDay
        ? DateFormat('d MMM yyyy').format(next.startDate)
        : '${DateFormat('d MMM').format(next.startDate)} – ${DateFormat('d MMM yyyy').format(next.endDate)}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: next.color.withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: next.color.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: next.color.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(next.categoryIcon, color: next.color, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: next.color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'UP NEXT • ${next.categoryDisplayName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: next.color,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      timingText,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: isInProgress ? const Color(0xFFD97706) : AppColors.inkLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  next.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.h3.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dateStr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.inkLight,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 3. Category Filter Chips (Combined by default)
  Widget _buildCategoryFilterChips() {
    final categories = [
      {'key': 'ALL', 'label': 'Combined', 'icon': Icons.tune_rounded},
      {'key': 'EXAM', 'label': 'Exams (${controller.examsCount})', 'icon': Icons.assignment_outlined},
      {'key': 'VACATION', 'label': 'Vacations (${controller.vacationsCount})', 'icon': Icons.beach_access_rounded},
      {'key': 'EVENT', 'label': 'Events (${controller.eventsCount})', 'icon': Icons.emoji_events_outlined},
      {'key': 'HOLIDAY', 'label': 'Holidays (${controller.holidaysCount})', 'icon': Icons.celebration_outlined},
      {'key': 'PTM', 'label': 'PTM & Milestones', 'icon': Icons.groups_outlined},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: categories.map((c) {
          final isSelected = controller.selectedCategory.value == c['key'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => controller.selectedCategory.value = c['key'] as String,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF0F766E) : AppColors.white,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF0F766E) : AppColors.border,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF0F766E).withValues(alpha: 0.25),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      c['icon'] as IconData,
                      size: 13,
                      color: isSelected ? Colors.white : AppColors.inkLight,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      c['label'] as String,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        color: isSelected ? Colors.white : AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  /// 4. Quarter Filter Chips
  Widget _buildQuarterFilterChips() {
    final quarters = [
      {'key': 'ALL', 'label': 'Full Session'},
      {'key': 'Q1', 'label': 'Q1 (Apr – Jun)'},
      {'key': 'Q2', 'label': 'Q2 (Jul – Sep)'},
      {'key': 'Q3', 'label': 'Q3 (Oct – Dec)'},
      {'key': 'Q4', 'label': 'Q4 (Jan – Mar)'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: quarters.map((q) {
          final isSelected = controller.selectedQuarter.value == q['key'];
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: GestureDetector(
              onTap: () => controller.selectedQuarter.value = q['key']!,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFF1F5F9) : Colors.transparent,
                  borderRadius: BorderRadius.circular(Radii.sm),
                  border: Border.all(
                    color: isSelected ? const Color(0xFFCBD5E1) : Colors.transparent,
                  ),
                ),
                child: Text(
                  q['label']!,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? const Color(0xFF0F172A) : AppColors.inkLight,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  /// 5. Combined Timeline Sliver
  Widget _buildCombinedTimelineSliver() {
    final items = controller.filteredItems;

    if (items.isEmpty) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: Center(
            child: EmptyState(
              icon: Icons.event_note_rounded,
              title: 'No roadmap items match this filter',
              message: 'Try switching category or quarter filter to view other items.',
            ),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final item = items[index];
            final isLast = index == items.length - 1;
            return _buildTimelineRow(item, isLast);
          },
          childCount: items.length,
        ),
      ),
    );
  }

  Widget _buildTimelineRow(RoadmapMilestoneModel item, bool isLast) {
    final isCompleted = item.status == MilestoneStatus.completed;
    final isInProgress = item.status == MilestoneStatus.inProgress;

    // 1. Progression node at the left:
    // Reached items have a green circle with white tick!
    // Current items have an active amber ring with center dot.
    // Planned items have a slate circle ring.
    Widget nodeWidget;
    if (isCompleted) {
      nodeWidget = Container(
        width: 26,
        height: 26,
        decoration: const BoxDecoration(
          color: Color(0xFF10B981), // Solid Emerald Green for reached
          shape: BoxShape.circle,
        ),
        child: const Center(
          child: Icon(Icons.check_rounded, color: Colors.white, size: 16),
        ),
      );
    } else if (isInProgress) {
      nodeWidget = Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFF59E0B), width: 2.5),
        ),
        child: Center(
          child: Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Color(0xFFF59E0B),
              shape: BoxShape.circle,
            ),
          ),
        ),
      );
    } else {
      nodeWidget = Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFCBD5E1), width: 2),
        ),
        child: Center(
          child: Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Color(0xFF94A3B8),
              shape: BoxShape.circle,
            ),
          ),
        ),
      );
    }

    // 2. Progression line at the left:
    // Green line for completed milestones showing the progress achieved down the spine!
    Color lineColor;
    if (isCompleted) {
      lineColor = const Color(0xFF10B981);
    } else if (isInProgress) {
      lineColor = const Color(0xFFF59E0B).withValues(alpha: 0.5);
    } else {
      lineColor = const Color(0xFFE2E8F0);
    }

    final dateStr = item.isSingleDay
        ? DateFormat('d MMM yyyy').format(item.startDate)
        : '${DateFormat('d MMM').format(item.startDate)} – ${DateFormat('d MMM yyyy').format(item.endDate)}';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left: Progression Spine (Tick / Active / Planned Node + Colored Line)
          SizedBox(
            width: 32,
            child: Column(
              children: [
                nodeWidget,
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2.5,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: lineColor,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),

          // Right: Content Card with Category Icon in Top-Right Corner
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: SurfaceCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Card Top Header: Left = Tags & Title, Right = Category Icon in Top Right Corner
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(child: _buildCategoryTag(item)),
                                  const SizedBox(width: 6),
                                  _buildStatusBadge(item.status),
                                ],
                              ),
                              const SizedBox(height: 7),
                              Text(
                                item.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: AppTextStyles.h3.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Top-Right Corner: Icon for Holiday / Vacation / Exam / Event / PTM
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: item.color.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: item.color.withValues(alpha: 0.25),
                              width: 1.2,
                            ),
                          ),
                          child: Center(
                            child: Icon(
                              item.categoryIcon,
                              size: 19,
                              color: item.color,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Date range & Duration badge
                    Row(
                      children: [
                        Icon(Icons.calendar_today_rounded, size: 12, color: AppColors.inkLight),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            dateStr,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.ink,
                              fontWeight: FontWeight.w600,
                              fontSize: 11.5,
                            ),
                          ),
                        ),
                        if (!item.isSingleDay) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: AppColors.bg,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '${item.durationDays}d',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.inkLight,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),

                    // Description (if present)
                    if (item.description.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        item.description,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.inkLight,
                          height: 1.35,
                          fontSize: 11.5,
                        ),
                      ),
                    ],

                    const SizedBox(height: 10),

                    // Footer Tags: School Closed, Quarter, Term
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        if (item.isSchoolClosed)
                          _buildTag(
                            label: 'School Closed',
                            bgColor: const Color(0xFFFEE2E2),
                            textColor: const Color(0xFF991B1B),
                            icon: Icons.lock_clock_outlined,
                          ),
                        if (item.quarter.isNotEmpty && item.quarter != 'NONE')
                          _buildTag(
                            label: item.quarter,
                            bgColor: const Color(0xFFF1F5F9),
                            textColor: const Color(0xFF475569),
                          ),
                        if (item.term.isNotEmpty && item.term != 'NONE')
                          _buildTag(
                            label: item.term.replaceAll('_', ' '),
                            bgColor: const Color(0xFFF1F5F9),
                            textColor: const Color(0xFF475569),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryTag(RoadmapMilestoneModel item) {
    Color bg;
    Color fg;

    if (item.isExam) {
      bg = const Color(0xFFFEE2E2);
      fg = const Color(0xFFDC2626);
    } else if (item.isVacation) {
      bg = const Color(0xFFFEF3C7);
      fg = const Color(0xFFD97706);
    } else if (item.isHoliday) {
      bg = const Color(0xFFD1FAE5);
      fg = const Color(0xFF059669);
    } else if (item.isEvent) {
      bg = const Color(0xFFFCE7F3);
      fg = const Color(0xFFDB2777);
    } else if (item.isPtm) {
      bg = const Color(0xFFEDE9FE);
      fg = const Color(0xFF7C3AED);
    } else {
      bg = const Color(0xFFE0E7FF);
      fg = const Color(0xFF4F46E5);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        item.categoryDisplayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 8.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: fg,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(MilestoneStatus status) {
    String text;
    Color bg;
    Color fg;

    switch (status) {
      case MilestoneStatus.completed:
        text = 'COMPLETED';
        bg = const Color(0xFFD1FAE5);
        fg = const Color(0xFF065F46);
        break;
      case MilestoneStatus.inProgress:
        text = 'IN PROGRESS';
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFF92400E);
        break;
      case MilestoneStatus.planned:
        text = 'PLANNED';
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF64748B);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 8.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
          color: fg,
        ),
      ),
    );
  }

  Widget _buildTag({
    required String label,
    required Color bgColor,
    required Color textColor,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 10, color: textColor),
            const SizedBox(width: 3),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
