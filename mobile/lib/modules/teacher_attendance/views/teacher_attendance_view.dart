import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/date_labels.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../data/models/attendance_register_model.dart';
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
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight + 10),
        child: Obx(() {
          final isReg = controller.activeTab.value == 'REGISTER';
          return AppPageBar(
            title: isReg ? 'Attendance Register' : 'Attendance',
            subtitle: isReg
                ? DateFormat('MMMM yyyy').format(controller.registerMonth.value)
                : fmtLongDate(DateTime.now()),
          );
        }),
      ),
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

        return Column(
          children: [
            // Top Tab Navigation: Mark Today vs Class Register
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.xs),
              child: Row(
                children: [
                  Expanded(
                    child: _TabButton(
                      label: 'Mark Today',
                      icon: Icons.edit_calendar_rounded,
                      isActive: controller.activeTab.value == 'TODAY',
                      onTap: () => controller.setActiveTab('TODAY'),
                    ),
                  ),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: _TabButton(
                      label: 'Class Register',
                      icon: Icons.menu_book_rounded,
                      isActive: controller.activeTab.value == 'REGISTER',
                      onTap: () => controller.setActiveTab('REGISTER'),
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: AppColors.border),

            // Tab Content
            Expanded(
              child: controller.activeTab.value == 'TODAY'
                  ? _TodayAttendanceSheet(controller: controller)
                  : _MinimalClassRegisterBody(controller: controller),
            ),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        if (controller.activeTab.value == 'REGISTER' ||
            !controller.hasClass.value ||
            controller.students.isEmpty ||
            controller.isLocked) {
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

// ─────────────────────────────────────────────────────────────────────────────
// TOP TAB BUTTON
// ─────────────────────────────────────────────────────────────────────────────
class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 15,
              color: isActive ? Colors.white : AppColors.inkLight,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.labelLarge.copyWith(
                  color: isActive ? Colors.white : AppColors.inkLight,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                  fontSize: 12.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY ATTENDANCE SHEET
// ─────────────────────────────────────────────────────────────────────────────
class _TodayAttendanceSheet extends StatelessWidget {
  final TeacherAttendanceController controller;
  const _TodayAttendanceSheet({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final students = controller.students.toList();
      final statuses = controller.statusByStudentId;
      final absent = students.where((s) => (statuses[s.id] ?? 'PRESENT') != 'PRESENT').length;
      final present = students.length - absent;

      return Column(
        children: [
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.md),
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
                      Expanded(
                        child: Text(
                          controller.selectedClass.value?.label ?? '',
                          style: AppTextStyles.h3,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
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
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL & EASY-TO-USE CLASS REGISTER BODY
// ─────────────────────────────────────────────────────────────────────────────
class _MinimalClassRegisterBody extends StatelessWidget {
  final TeacherAttendanceController controller;
  const _MinimalClassRegisterBody({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final regData = controller.registerData.value;
      final isLoading = controller.isLoadingRegister.value;
      final selectedMonth = controller.registerMonth.value;

      return Column(
        children: [
          // Header Bar: Class + Month Navigation + Summary Chip
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.sm),
            child: Column(
              children: [
                if (controller.myClasses.length > 1) ...[
                  AppDropdownField(
                    label: 'Class',
                    value: controller.selectedClass.value,
                    items: controller.myClasses.toList(),
                    itemLabel: (c) => c.label,
                    onChanged: (c) {
                      if (c != null) controller.selectClass(c);
                    },
                  ),
                  const SizedBox(height: Space.xs),
                ],
                // Month Selector Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left_rounded),
                      color: AppColors.ink,
                      onPressed: () => controller.changeRegisterMonth(-1),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_month_rounded, size: 16, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat('MMMM yyyy').format(selectedMonth),
                          style: AppTextStyles.h3,
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right_rounded),
                      color: AppColors.ink,
                      onPressed: () => controller.changeRegisterMonth(1),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                if (regData != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(Radii.sm),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Flexible(
                          child: Text(
                            '${regData.totalWorkingDays} Working Days',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.inkMid,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text('•', style: AppTextStyles.labelSmall.copyWith(color: AppColors.inkLight)),
                        Flexible(
                          child: Text(
                            '${regData.averagePercentage}% Avg Attendance',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: regData.averagePercentage >= 75 ? AppColors.teal : AppColors.red,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Two-mode simple pill switcher
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(Space.md, 0, Space.md, Space.xs + 2),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _RegisterSegmentButton(
                      label: 'By Student',
                      isSelected: controller.registerSubView.value == 'STUDENTS',
                      onTap: () => controller.setRegisterSubView('STUDENTS'),
                    ),
                  ),
                  Expanded(
                    child: _RegisterSegmentButton(
                      label: 'By Date',
                      isSelected: controller.registerSubView.value == 'ABSENTEES',
                      onTap: () => controller.setRegisterSubView('ABSENTEES'),
                    ),
                  ),
                ],
              ),
            ),
          ),

          Divider(height: 1, color: AppColors.border),

          // Content List
          Expanded(
            child: isLoading && regData == null
                ? const SkeletonList(itemHeight: 64)
                : regData == null
                    ? Center(
                        child: EmptyState(
                          icon: Icons.event_busy_rounded,
                          title: 'No Register Data',
                          message: 'Could not load attendance register for ${DateFormat('MMMM yyyy').format(selectedMonth)}.',
                        ),
                      )
                    : controller.registerSubView.value == 'STUDENTS'
                        ? _MinimalStudentListView(data: regData)
                        : _MinimalDateListView(data: regData),
          ),
        ],
      );
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER SEGMENT BUTTON
// ─────────────────────────────────────────────────────────────────────────────
class _RegisterSegmentButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _RegisterSegmentButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(vertical: 6),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(Radii.sm - 2),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: AppTextStyles.labelSmall.copyWith(
            color: isSelected ? AppColors.ink : AppColors.inkLight,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL "BY STUDENT" LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
class _MinimalStudentListView extends StatelessWidget {
  final AttendanceRegisterModel data;
  const _MinimalStudentListView({required this.data});

  @override
  Widget build(BuildContext context) {
    final list = data.register;
    if (list.isEmpty) {
      return const Center(
        child: EmptyState(
          icon: Icons.people_outline_rounded,
          title: 'No Students',
          message: 'No student records in this class.',
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.xl),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: Space.xs + 2),
      itemBuilder: (context, index) {
        final st = list[index];
        final isAllPresent = st.totalAbsent == 0;
        final absentDatesFormatted = st.absentDateKeys.map((k) {
          final parts = k.split('-');
          return parts.length == 3 ? '${parts[2]}/${parts[1]}' : k;
        }).join(', ');

        return SurfaceCard(
          level: SurfaceLevel.flat,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          color: isAllPresent ? null : AppColors.redPale.withValues(alpha: 0.35),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Roll No Badge
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isAllPresent ? AppColors.surfaceMuted : AppColors.redPale,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      st.rollNo,
                      style: AppTextStyles.labelSmall.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isAllPresent ? AppColors.ink : AppColors.red,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Name & Days Present
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          st.studentName,
                          style: AppTextStyles.labelLarge.copyWith(fontSize: 13.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${st.totalPresent} / ${st.totalDays} Days (${st.percentage.toStringAsFixed(0)}%)',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.inkLight,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Absent / Present Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isAllPresent
                          ? AppColors.tealPale
                          : AppColors.redPale,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isAllPresent ? '100% Present' : '${st.totalAbsent} Absent',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: isAllPresent ? AppColors.teal : AppColors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),

              // Inline absent dates if any
              if (!isAllPresent && absentDatesFormatted.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Absent on: $absentDatesFormatted',
                    style: AppTextStyles.labelSmall.copyWith(
                      color: AppColors.red,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL "BY DATE" LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
class _MinimalDateListView extends StatelessWidget {
  final AttendanceRegisterModel data;
  const _MinimalDateListView({required this.data});

  @override
  Widget build(BuildContext context) {
    final list = data.dailyAbsentees;
    if (list.isEmpty) {
      return const Center(
        child: EmptyState(
          icon: Icons.event_available_rounded,
          title: 'No Days Recorded',
          message: 'No daily attendance sheets found for this month.',
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.xl),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: Space.xs + 2),
      itemBuilder: (context, index) {
        final day = list[index];
        final dateStr = DateFormat('EEE, dd MMM yyyy').format(day.date);
        final hasAbsents = day.absentCount > 0;

        return SurfaceCard(
          level: SurfaceLevel.flat,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        hasAbsents ? Icons.event_busy_rounded : Icons.check_circle_rounded,
                        size: 15,
                        color: hasAbsents ? AppColors.red : AppColors.teal,
                      ),
                      const SizedBox(width: 8),
                      Text(dateStr, style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: (hasAbsents ? AppColors.red : AppColors.teal).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      hasAbsents ? '${day.absentCount} Absent' : 'All Present',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: hasAbsents ? AppColors.red : AppColors.teal,
                        fontWeight: FontWeight.bold,
                        fontSize: 10.5,
                      ),
                    ),
                  ),
                ],
              ),

              if (hasAbsents) ...[
                const SizedBox(height: 6),
                for (final st in day.absents) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 2, bottom: 2, left: 4),
                    child: Text(
                      '• Roll ${st.rollNo}: ${st.studentName}${st.remarks != null && st.remarks!.isNotEmpty ? ' (${st.remarks})' : ''}',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.inkMid,
                        fontSize: 11.5,
                      ),
                    ),
                  ),
                ],
              ],
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET STATUS BANNER & STUDENT ROW
// ─────────────────────────────────────────────────────────────────────────────
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
            color: selected ? Colors.white : AppColors.inkMid,
          ),
        ),
      ),
    );
  }
}
