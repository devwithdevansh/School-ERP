import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import 'package:get/get.dart';
import '../controllers/dashboard_controller.dart';

class TeacherClassesSection extends StatelessWidget {
  final DashboardController controller;
  const TeacherClassesSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "TODAY's CLASSES",
            style: AppTextStyles.labelSmall.copyWith(
              color: AppColors.inkLight,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          Obx(() {
            final classes = controller.teacherTodayClasses;
            if (classes.isEmpty) {
              return SurfaceCard(
                padding: const EdgeInsets.all(Space.md),
                child: Center(
                  child: Text(
                    'No classes scheduled for today',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight),
                  ),
                ),
              );
            }
            return SurfaceCard(
              padding: const EdgeInsets.all(Space.md),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: classes.length,
                separatorBuilder: (context, index) => Divider(height: 24, color: AppColors.border),
                itemBuilder: (context, index) {
                  final c = classes[index];
                  // Determine time suffix. e.g., '08:00 AM'
                  final subjectName = c.subjectName ?? 'Unknown Subject';
                  final classDesc = '${c.standard}-${c.division}';
                  return Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(Radii.sm),
                        ),
                        child: Text(
                          c.startTime,
                          style: AppTextStyles.labelSmall.copyWith(color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(classDesc, style: AppTextStyles.h3),
                            Text(subjectName, style: AppTextStyles.bodySmall),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
                    ],
                  );
                },
              ),
            );
          }),
        ],
      ),
    );
  }
}
