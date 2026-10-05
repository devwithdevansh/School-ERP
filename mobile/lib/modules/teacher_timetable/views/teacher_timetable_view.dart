import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../timetable/widgets/day_strip.dart';
import '../../timetable/widgets/period_timeline.dart';
import '../controllers/teacher_timetable_controller.dart';

class TeacherTimetableView extends GetView<TeacherTimetableController> {
  const TeacherTimetableView({super.key});

  bool _isToday(String day) {
    final wd = DateTime.now().weekday;
    return wd <= 6 && timetableDays[wd - 1] == day;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'My Timetable'),
      body: Column(
        children: [
          Obx(() => DayStrip(
                selectedDay: controller.selectedDay.value,
                onSelected: controller.selectDay,
              )),
          Divider(height: 1, color: AppColors.border),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.loadTimetable,
              color: AppColors.primary,
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const SkeletonList(count: 4, itemHeight: 72);
                }
                final day = controller.selectedDay.value;
                final schedule = controller.periodsFor(day);
                if (schedule.isEmpty) {
                  return SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: SizedBox(
                      height: MediaQuery.of(context).size.height * 0.5,
                      child: Center(
                        child: EmptyState(
                          icon: Icons.event_available_rounded,
                          title: 'No classes',
                          message: 'You have no classes scheduled for $day.',
                        ),
                      ),
                    ),
                  );
                }

                final today = _isToday(day);
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(today ? 'Today' : day, style: AppTextStyles.h2),
                              const SizedBox(height: 2),
                              Text(
                                '${schedule.length} ${schedule.length == 1 ? 'class' : 'classes'} to teach',
                                style: AppTextStyles.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                        if (today) const StatusPill('TODAY', tone: PillTone.warning, icon: Icons.today_rounded),
                      ],
                    ),
                    const SizedBox(height: Space.md),
                    PeriodTimeline(periods: schedule, isToday: today, teacherView: true),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
