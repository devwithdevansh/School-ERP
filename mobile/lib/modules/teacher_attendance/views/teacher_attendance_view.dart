import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/date_labels.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../data/models/student_model.dart';
import '../controllers/teacher_attendance_controller.dart';

class TeacherAttendanceView extends GetView<TeacherAttendanceController> {
  const TeacherAttendanceView({super.key});

  Future<void> _submit(BuildContext context) async {
    final ok = await controller.submitAttendance();
    if (!context.mounted) return;
    if (ok) {
      Get.back();
      Get.snackbar('Submitted', 'Attendance for ${controller.selectedClass.value?.label ?? ''} was saved.');
    } else {
      Get.snackbar('Error', controller.lastError ?? 'Could not save attendance. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(title: 'Attendance', subtitle: fmtLongDate(DateTime.now())),
      body: Obx(() {
        if (controller.isLoading.value && controller.students.isEmpty) {
          return const SkeletonList(itemHeight: 68);
        }
        if (!controller.hasClass.value) {
          return const Center(
            child: EmptyState(
              icon: Icons.school_outlined,
              title: 'No class assigned',
              message: "You aren't set as a class teacher for any class yet.",
            ),
          );
        }

        final students = controller.students.toList();
        final statuses = controller.statusByStudentId;
        final absent = students.where((s) => (statuses[s.id] ?? 'PRESENT') != 'PRESENT').length;
        final present = students.length - absent;

        return Column(
          children: [
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.md),
              child: Column(
                children: [
                  if (controller.myClasses.length > 1)
                    AppDropdownField(
                      label: 'Class',
                      value: controller.selectedClass.value,
                      items: controller.myClasses.toList(),
                      itemLabel: (c) => c.label,
                      onChanged: (c) {
                        if (c != null) controller.selectClass(c);
                      },
                    )
                  else
                    Row(
                      children: [
                        Icon(Icons.school_rounded, size: 18, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Text(controller.selectedClass.value?.label ?? '', style: AppTextStyles.h3),
                      ],
                    ),
                  if (students.isNotEmpty) ...[
                    const SizedBox(height: Space.sm + 2),
                    Row(
                      children: [
                        Expanded(
                          child: StatTile(
                            icon: Icons.check_circle_rounded,
                            value: '$present',
                            label: 'Present',
                            tone: AppColors.teal,
                          ),
                        ),
                        const SizedBox(width: Space.sm),
                        Expanded(
                          child: StatTile(
                            icon: Icons.cancel_rounded,
                            value: '$absent',
                            label: 'Absent',
                            tone: absent == 0 ? AppColors.inkLight : AppColors.red,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Space.xs),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: controller.markAllPresent,
                        icon: Icon(Icons.done_all_rounded, size: 18, color: AppColors.primaryMid),
                        label: Text(
                          'Mark all present',
                          style: AppTextStyles.labelLarge.copyWith(color: AppColors.primaryMid),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            _SheetStatusBanner(status: controller.sheetStatus.value),
            Divider(height: 1, color: AppColors.border),
            Expanded(
              child: controller.isLoading.value
                  ? const SkeletonList(itemHeight: 68)
                  : students.isEmpty
                      ? const Center(
                          child: EmptyState(
                            icon: Icons.people_outline_rounded,
                            title: 'No students',
                            message: 'No active students found in this class yet.',
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
                          itemCount: students.length,
                          separatorBuilder: (_, __) => const SizedBox(height: Space.xs + 2),
                          itemBuilder: (context, index) {
                            final student = students[index];
                            return Obx(() {
                              final isPresent = (controller.statusByStudentId[student.id] ?? 'PRESENT') == 'PRESENT';
                              return _StudentRow(
                                student: student,
                                isPresent: isPresent,
                                onChanged: controller.isLocked
                                    ? null
                                    : (present) =>
                                        controller.setStatus(student.id, present ? 'PRESENT' : 'ABSENT'),
                              );
                            });
                          },
                        ),
            ),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        if (!controller.hasClass.value || controller.students.isEmpty || controller.isLocked) {
          return const SizedBox.shrink();
        }
        final absent = controller.students
            .where((s) => (controller.statusByStudentId[s.id] ?? 'PRESENT') != 'PRESENT')
            .length;
        return Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.sm),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (absent > 0)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Space.xs + 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded, size: 16, color: AppColors.inkLight),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'The school office reviews and confirms attendance before parents are notified.',
                              style: AppTextStyles.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  CustomButton(
                    label: controller.sheetStatus.value == 'SUBMITTED' ? 'Update submission' : 'Submit attendance',
                    loading: controller.isSaving.value,
                    onTap: controller.isSaving.value ? null : () => _submit(context),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _SheetStatusBanner extends StatelessWidget {
  final String status;
  const _SheetStatusBanner({required this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'NONE') return const SizedBox.shrink();
    final confirmed = status == 'CONFIRMED';
    final color = confirmed ? AppColors.teal : AppColors.amber;
    return Container(
      width: double.infinity,
      color: color.withValues(alpha: 0.12),
      padding: const EdgeInsets.symmetric(horizontal: Space.md, vertical: Space.sm),
      child: Row(
        children: [
          Icon(confirmed ? Icons.lock_rounded : Icons.hourglass_top_rounded, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              confirmed
                  ? 'Confirmed by the office. Attendance is locked; ask the office if a change is needed.'
                  : 'Submitted. Waiting for the office to confirm. You can still update it.',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkMid),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  final StudentModel student;
  final bool isPresent;
  final ValueChanged<bool>? onChanged;
  const _StudentRow({required this.student, required this.isPresent, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      level: SurfaceLevel.flat,
      padding: const EdgeInsets.symmetric(horizontal: Space.md - 2, vertical: Space.sm),
      color: isPresent ? null : AppColors.redPale,
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isPresent ? AppColors.primaryLight : AppColors.red.withValues(alpha: 0.18),
            ),
            clipBehavior: Clip.antiAlias,
            child: StudentImageWidget(
              photoUrl: student.photoUrl,
              width: 36,
              height: 36,
              fit: BoxFit.cover,
              fallback: Center(
                child: Text(
                  student.initials,
                  style: AppTextStyles.labelLarge.copyWith(
                    color: isPresent ? AppColors.primary : AppColors.red,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(student.name, style: AppTextStyles.labelLarge.copyWith(fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
          ),
          _StatusButton(label: 'Present', selected: isPresent, color: AppColors.teal, onTap: onChanged == null ? null : () => onChanged!(true)),
          const SizedBox(width: 6),
          _StatusButton(label: 'Absent', selected: !isPresent, color: AppColors.red, onTap: onChanged == null ? null : () => onChanged!(false)),
        ],
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback? onTap;
  const _StatusButton({required this.label, required this.selected, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      pressedScale: 0.94,
      child: AnimatedContainer(
        duration: Motion.of(context, Motion.quick),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? color : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? color : AppColors.fieldBorder),
        ),
        child: Text(
          label,
          style: AppTextStyles.labelLarge.copyWith(
            fontSize: 12,
            // White reads on both the teal and red fills in either theme.
            color: selected ? Colors.white : AppColors.inkMid,
          ),
        ),
      ),
    );
  }
}
