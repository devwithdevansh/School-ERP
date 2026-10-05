import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../controllers/dashboard_controller.dart';

class TeacherQuickAccess extends StatelessWidget {
  const TeacherQuickAccess({super.key});

  void _guarded(bool allowed, String route, String deniedMessage) {
    if (allowed) {
      Get.toNamed(route);
    } else {
      Get.snackbar('Not assigned', deniedMessage);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dash = Get.find<DashboardController>();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'QUICK ACCESS',
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.inkLight,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          SurfaceCard(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 6),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Obx(() => ModuleTile(
                            icon: Icons.fact_check_outlined,
                            label: 'Attendance',
                            locked: dash.accessLoaded.value && !dash.canTakeAttendance.value,
                            onTap: () => _guarded(!dash.accessLoaded.value || dash.canTakeAttendance.value, AppRoutes.teacherAttendance,
                                'Only the class teacher can take attendance. Ask the office to assign you a class.'),
                          )),
                    ),
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.calendar_view_week_rounded,
                        label: 'Timetable',
                        onTap: () => Get.toNamed(AppRoutes.teacherTimetable),
                      ),
                    ),
                    Expanded(
                      child: Obx(() => ModuleTile(
                            icon: Icons.edit_document,
                            label: 'Marks',
                            locked: dash.accessLoaded.value && !dash.canAssignHomework.value,
                            onTap: () => _guarded(!dash.accessLoaded.value || dash.canAssignHomework.value, AppRoutes.teacherMarks,
                                'You can enter marks only for subjects you are assigned to teach.'),
                          )),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Obx(() => ModuleTile(
                            icon: Icons.menu_book_outlined,
                            label: 'Homework',
                            locked: dash.accessLoaded.value && !dash.canAssignHomework.value,
                            onTap: () => _guarded(!dash.accessLoaded.value || dash.canAssignHomework.value, AppRoutes.teacherHomework,
                                'You can assign homework only for subjects you are assigned to teach.'),
                          )),
                    ),
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.pending_actions_rounded,
                        label: 'Leaves',
                        onTap: () => Get.toNamed(AppRoutes.teacherLeaves),
                      ),
                    ),
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.chat_bubble_outline_rounded,
                        label: 'Messages',
                        onTap: () => Get.toNamed(AppRoutes.teacherMessages),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

