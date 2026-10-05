import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../data/models/student_model.dart';
import '../controllers/dashboard_controller.dart';

/// A horizontal scrollable row of sibling chips that allows a parent to switch
/// between their children. This is placed near the top of the dashboard.
class StudentSwitchSection extends StatelessWidget {
  final DashboardController controller;
  const StudentSwitchSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final siblings = controller.students;
      final isTeacher = controller.isTeacher.value;
      
      // Only show switcher if there is more than 1 role/child available
      if (!isTeacher && siblings.length <= 1) return const SizedBox.shrink();
      
      final activeId = controller.student.value?.id;
      final activeProfile = controller.activeProfile.value;

      return Padding(
        padding: const EdgeInsets.only(left: Space.lg),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              if (isTeacher) ...[
                _TeacherProfileChip(
                  name: controller.teacherName.value.split(RegExp(r'\s+')).first, // Use first name
                  selected: activeProfile == 'teacher',
                  onTap: () {
                    if (activeProfile != 'teacher') {
                      controller.switchProfile('teacher');
                    }
                  },
                ),
                const SizedBox(width: 8),
              ],
              // A cold start straight into the teacher view doesn't load the
              // children, so offer a plain way back to the parent side.
              if (siblings.isEmpty && controller.hasDualRole.value) ...[
                _TeacherProfileChip(
                  name: 'Parent view',
                  icon: Icons.family_restroom_rounded,
                  selected: activeProfile == 'student',
                  onTap: () {
                    if (activeProfile != 'student') {
                      controller.switchProfile('student');
                    }
                  },
                ),
                const SizedBox(width: 8),
              ],
              for (final child in siblings) ...[
                _SiblingChip(
                  student: child,
                  selected: activeProfile == 'student' && child.id == activeId,
                  hasUnread: controller.hasUnreadNotificationsFor(child.id),
                  onTap: () {
                    if (activeProfile != 'student' || child.id != activeId) {
                      controller.switchProfile('student', selectedStudent: child);
                    }
                  },
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      );
    });
  }
}

class _TeacherProfileChip extends StatelessWidget {
  final String name;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TeacherProfileChip({
    required this.name,
    this.icon = Icons.work_outline_rounded,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
        decoration: BoxDecoration(
          color: selected ? Brand.deep : AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? Brand.deep : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: selected
                  ? Colors.white.withValues(alpha: 0.18)
                  : Brand.deep.withValues(alpha: 0.1),
              child: Icon(
                icon,
                size: 14,
                color: selected ? Colors.white : AppColors.inkMid,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              name,
              style: AppTextStyles.labelLarge.copyWith(
                color: selected ? Colors.white : AppColors.inkMid,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SiblingChip extends StatelessWidget {
  final StudentModel student;
  final bool selected;
  final bool hasUnread;
  final VoidCallback onTap;

  const _SiblingChip({
    required this.student,
    required this.selected,
    required this.hasUnread,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
            decoration: BoxDecoration(
              color: selected ? AppColors.primary : AppColors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: selected ? AppColors.primary : AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: selected
                        ? Colors.white.withValues(alpha: 0.18)
                        : AppColors.primaryLight,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: StudentImageWidget(
                    photoUrl: student.photoUrl,
                    width: 24,
                    height: 24,
                    fit: BoxFit.cover,
                    fallback: Center(
                      child: Text(
                        student.initials,
                        style: AppTextStyles.labelSmall.copyWith(
                          fontSize: 9,
                          letterSpacing: 0,
                          color: selected ? Colors.white : AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  student.name.trim().split(RegExp(r'\s+')).first,
                  style: AppTextStyles.labelLarge.copyWith(
                    color: selected
                        ? (AppColors.isDark ? AppColors.bg : Colors.white)
                        : AppColors.inkMid,
                  ),
                ),
              ],
            ),
          ),
          if (hasUnread && !selected)
            Positioned(
              top: -1,
              right: -1,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: AppColors.accentDeep,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.bg, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
