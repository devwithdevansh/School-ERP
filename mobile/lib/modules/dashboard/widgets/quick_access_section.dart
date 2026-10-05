import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/ui/ui.dart';
import 'section_eyebrow.dart';

/// Academic module shortcuts — the same icon+label grid the app had before,
/// now placed as its own section right after the Parent section.
class QuickAccessSection extends StatelessWidget {
  const QuickAccessSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionEyebrow('ACADEMICS'),
          const SizedBox(height: 6),
          const SectionHeader(title: 'School modules'),
          const SizedBox(height: 14),
          SurfaceCard(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ModuleTile(
                    icon: Icons.menu_book_rounded,
                    label: 'Homework',
                    onTap: () => Get.toNamed(AppRoutes.homework),
                  ),
                ),
                Expanded(
                  child: ModuleTile(
                    icon: Icons.fact_check_outlined,
                    label: 'Attendance',
                    onTap: () => Get.toNamed(AppRoutes.attendance),
                  ),
                ),
                Expanded(
                  child: ModuleTile(
                    icon: Icons.emoji_events_outlined,
                    label: 'Results',
                    onTap: () => Get.toNamed(AppRoutes.results),
                  ),
                ),
                Expanded(
                  child: ModuleTile(
                    icon: Icons.calendar_view_week_rounded,
                    label: 'Timetable',
                    onTap: () => Get.toNamed(AppRoutes.timetable),
                  ),
                ),
                Expanded(
                  child: ModuleTile(
                    icon: Icons.directions_bus_outlined,
                    label: 'Transport',
                    comingSoon: true,
                    onTap: () => Get.toNamed(AppRoutes.transport),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
