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
              padding: const EdgeInsets.fromLTRB(Space.md, Space.xs + 2, Space.md, Space.xs + 2),
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
                  : _ClassRegisterBody(controller: controller),
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
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(Radii.md),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? Colors.white : AppColors.inkLight,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: AppTextStyles.labelLarge.copyWith(
                color: isActive ? Colors.white : AppColors.inkLight,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                fontSize: 13,
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
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS REGISTER BODY (MONTHLY MATRIX & DAILY ABSENTEES)
// ─────────────────────────────────────────────────────────────────────────────
class _ClassRegisterBody extends StatelessWidget {
  final TeacherAttendanceController controller;
  const _ClassRegisterBody({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final regData = controller.registerData.value;
      final isLoading = controller.isLoadingRegister.value;
      final selectedMonth = controller.registerMonth.value;

      return Column(
        children: [
          // Header Controls: Class Selector & Month Navigator
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(Space.md, Space.xs + 2, Space.md, Space.sm),
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
                // Month Selector Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(Radii.md),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.chevron_left_rounded),
                        color: AppColors.ink,
                        onPressed: () => controller.changeRegisterMonth(-1),
                        tooltip: 'Previous month',
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.calendar_month_rounded, size: 17, color: AppColors.primary),
                          const SizedBox(width: 8),
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
                        tooltip: 'Next month',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: AppColors.border),

          // Register Body Content
          Expanded(
            child: isLoading && regData == null
                ? const SkeletonList(itemHeight: 76)
                : regData == null
                    ? Center(
                        child: EmptyState(
                          icon: Icons.event_busy_rounded,
                          title: 'No Register Data',
                          message: 'Could not load attendance register for ${DateFormat('MMMM yyyy').format(selectedMonth)}.',
                        ),
                      )
                    : _RegisterLoadedContent(
                        controller: controller,
                        data: regData,
                      ),
          ),
        ],
      );
    });
  }
}

class _RegisterLoadedContent extends StatelessWidget {
  final TeacherAttendanceController controller;
  final AttendanceRegisterModel data;

  const _RegisterLoadedContent({
    required this.controller,
    required this.data,
  });

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return ListView(
        padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
        children: [
          // 1. Overview 4-Metric Card
          SurfaceCard(
            padding: const EdgeInsets.all(Space.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'MONTHLY REGISTER OVERVIEW',
                      style: AppTextStyles.labelSmall.copyWith(
                        letterSpacing: 1.0,
                        color: AppColors.inkLight,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${data.standard}-${data.division} (${data.medium})',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Space.sm + 2),
                Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        icon: Icons.calendar_today_rounded,
                        value: '${data.totalWorkingDays}',
                        label: 'Working Days',
                        tone: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: StatTile(
                        icon: Icons.percent_rounded,
                        value: '${data.averagePercentage}%',
                        label: 'Avg Attendance',
                        tone: data.averagePercentage >= 85
                            ? AppColors.teal
                            : (data.averagePercentage >= 75 ? AppColors.amber : AppColors.red),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Space.sm),
                Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        icon: Icons.people_alt_rounded,
                        value: '${data.totalStudents}',
                        label: 'Enrolled',
                        tone: AppColors.ink,
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: StatTile(
                        icon: Icons.person_off_rounded,
                        value: '${data.totalAbsencesInMonth}',
                        label: 'Total Absences',
                        tone: data.totalAbsencesInMonth == 0 ? AppColors.teal : AppColors.red,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: Space.md),

          // 2. Sub-view Switcher: Students vs Daily Absentees
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(Radii.md),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _SubTabPill(
                    label: 'Student Register',
                    count: data.register.length,
                    icon: Icons.format_list_numbered_rounded,
                    isSelected: controller.registerSubView.value == 'STUDENTS',
                    onTap: () => controller.setRegisterSubView('STUDENTS'),
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: _SubTabPill(
                    label: 'Daily Absentees',
                    count: data.dailyAbsentees.where((d) => d.absentCount > 0).length,
                    icon: Icons.event_note_rounded,
                    isSelected: controller.registerSubView.value == 'ABSENTEES',
                    onTap: () => controller.setRegisterSubView('ABSENTEES'),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: Space.md),

          // 3. Sub-view Content
          if (controller.registerSubView.value == 'STUDENTS') ...[
            _StudentRegisterSection(controller: controller, data: data),
          ] else ...[
            _DailyAbsenteesSection(data: data),
          ],
        ],
      );
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-TAB PILL
// ─────────────────────────────────────────────────────────────────────────────
class _SubTabPill extends StatelessWidget {
  final String label;
  final int count;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _SubTabPill({
    required this.label,
    required this.count,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : Colors.transparent,
          borderRadius: BorderRadius.circular(Radii.sm),
          border: isSelected ? Border.all(color: AppColors.primary.withValues(alpha: 0.3)) : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? AppColors.primary : AppColors.inkLight,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                '$label ($count)',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.labelSmall.copyWith(
                  color: isSelected ? AppColors.primary : AppColors.inkLight,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                  fontSize: 12,
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
// STUDENT REGISTER SECTION
// ─────────────────────────────────────────────────────────────────────────────
class _StudentRegisterSection extends StatelessWidget {
  final TeacherAttendanceController controller;
  final AttendanceRegisterModel data;

  const _StudentRegisterSection({
    required this.controller,
    required this.data,
  });

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final students = controller.filteredRegisterStudents;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search & Filter Card
          SurfaceCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.search_rounded, size: 20, color: AppColors.inkLight),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: 'Search student name or roll no...',
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 8),
                        ),
                        onChanged: (val) => controller.registerSearchQuery.value = val,
                      ),
                    ),
                    if (controller.registerSearchQuery.value.isNotEmpty)
                      GestureDetector(
                        onTap: () => controller.registerSearchQuery.value = '',
                        child: Icon(Icons.close_rounded, size: 18, color: AppColors.inkLight),
                      ),
                  ],
                ),
                const Divider(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Showing ${students.length} of ${data.register.length} students',
                      style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                    ),
                    InkWell(
                      onTap: () => controller.registerOnlyAbsents.value = !controller.registerOnlyAbsents.value,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: controller.registerOnlyAbsents.value
                              ? AppColors.red.withValues(alpha: 0.12)
                              : AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: controller.registerOnlyAbsents.value
                                ? AppColors.red.withValues(alpha: 0.3)
                                : Colors.transparent,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              controller.registerOnlyAbsents.value
                                  ? Icons.check_box_rounded
                                  : Icons.check_box_outline_blank_rounded,
                              size: 14,
                              color: controller.registerOnlyAbsents.value
                                  ? AppColors.red
                                  : AppColors.inkLight,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Only with absences',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: controller.registerOnlyAbsents.value
                                    ? AppColors.red
                                    : AppColors.inkLight,
                                fontSize: 11,
                                fontWeight: controller.registerOnlyAbsents.value
                                    ? FontWeight.w700
                                    : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: Space.sm + 2),

          if (students.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Space.xl),
              child: Center(
                child: EmptyState(
                  icon: Icons.person_search_rounded,
                  title: 'No matching students',
                  message: 'Try clearing the search or filter.',
                ),
              ),
            )
          else
            for (final st in students) ...[
              _StudentRegisterCard(record: st, dates: data.dates),
              const SizedBox(height: Space.xs + 2),
            ],
        ],
      );
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT REGISTER CARD
// ─────────────────────────────────────────────────────────────────────────────
class _StudentRegisterCard extends StatefulWidget {
  final StudentRegisterRecord record;
  final List<AttendanceRegisterDate> dates;

  const _StudentRegisterCard({
    required this.record,
    required this.dates,
  });

  @override
  State<_StudentRegisterCard> createState() => _StudentRegisterCardState();
}

class _StudentRegisterCardState extends State<_StudentRegisterCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final r = widget.record;
    final pct = r.percentage;
    final tone = pct >= 90
        ? AppColors.teal
        : (pct >= 75 ? AppColors.amber : AppColors.red);

    return SurfaceCard(
      level: SurfaceLevel.flat,
      padding: const EdgeInsets.all(Space.sm + 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Student Info Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Roll No Badge
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(Radii.sm),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  r.rollNo,
                  style: AppTextStyles.labelSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.ink,
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Name & Contact
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.studentName,
                      style: AppTextStyles.labelLarge.copyWith(fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (r.parentPhone != null && r.parentPhone!.isNotEmpty)
                      Row(
                        children: [
                          Icon(Icons.phone_rounded, size: 11, color: AppColors.inkLight),
                          const SizedBox(width: 4),
                          Text(
                            r.parentPhone!,
                            style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                          ),
                        ],
                      ),
                  ],
                ),
              ),

              // Attendance Percentage Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: tone.withValues(alpha: 0.3)),
                ),
                child: Text(
                  '${pct.toStringAsFixed(1)}%',
                  style: AppTextStyles.monoMedium.copyWith(
                    color: tone,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Day Count Stats Bar
          Row(
            children: [
              _MiniStat(label: 'Present', count: r.totalPresent, color: AppColors.teal),
              const SizedBox(width: 6),
              _MiniStat(label: 'Absent', count: r.totalAbsent, color: AppColors.red),
              const SizedBox(width: 6),
              _MiniStat(label: 'Leave', count: r.totalLeave, color: AppColors.primary),
              const Spacer(),
              InkWell(
                onTap: () => setState(() => _expanded = !_expanded),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Row(
                    children: [
                      Text(
                        _expanded ? 'Hide Matrix' : 'View Days',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                      Icon(
                        _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        size: 16,
                        color: AppColors.primary,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Expanded Matrix & Absent Log
          if (_expanded) ...[
            const SizedBox(height: 10),
            Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 10),

            // Explicit Absent Dates Alert
            if (r.totalAbsent > 0) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: AppColors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(Radii.sm),
                  border: Border.all(color: AppColors.red.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.event_busy_rounded, size: 14, color: AppColors.red),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Absent on: ${r.absentDateKeys.map((k) {
                          final p = k.split('-');
                          return p.length == 3 ? '${p[2]}/${p[1]}' : k;
                        }).join(', ')}',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.red,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Horizontal Scroll of All Recorded Day Chips
            Text(
              'DAILY REGISTER BREAKDOWN',
              style: AppTextStyles.labelSmall.copyWith(fontSize: 10, letterSpacing: 0.8, color: AppColors.inkLight),
            ),
            const SizedBox(height: 6),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: widget.dates.map((d) {
                  final status = r.dayStatuses[d.dateKey] ?? '—';
                  final Color chipColor;
                  final String chipLabel;

                  switch (status) {
                    case 'PRESENT':
                      chipColor = AppColors.teal;
                      chipLabel = 'P';
                      break;
                    case 'ABSENT':
                      chipColor = AppColors.red;
                      chipLabel = 'A';
                      break;
                    case 'LATE':
                      chipColor = AppColors.amber;
                      chipLabel = 'L';
                      break;
                    case 'LEAVE':
                      chipColor = AppColors.primary;
                      chipLabel = 'Lv';
                      break;
                    default:
                      chipColor = AppColors.inkLight;
                      chipLabel = '—';
                  }

                  return Container(
                    margin: const EdgeInsets.only(right: 5),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    decoration: BoxDecoration(
                      color: chipColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: chipColor.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${d.dayOfMonth}',
                          style: AppTextStyles.labelSmall.copyWith(
                            fontSize: 10,
                            color: AppColors.inkMid,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          chipLabel,
                          style: AppTextStyles.labelSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: chipColor,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _MiniStat({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$label: $count',
        style: AppTextStyles.labelSmall.copyWith(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY ABSENTEES HISTORY SECTION
// ─────────────────────────────────────────────────────────────────────────────
class _DailyAbsenteesSection extends StatelessWidget {
  final AttendanceRegisterModel data;
  const _DailyAbsenteesSection({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.dailyAbsentees.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: Space.xl),
        child: Center(
          child: EmptyState(
            icon: Icons.event_available_rounded,
            title: 'No Days Recorded',
            message: 'No daily attendance sheets found for this month.',
          ),
        ),
      );
    }

    return Column(
      children: [
        for (final day in data.dailyAbsentees) ...[
          _DailyAbsentCard(day: day),
          const SizedBox(height: Space.sm),
        ],
      ],
    );
  }
}

class _DailyAbsentCard extends StatelessWidget {
  final DailyAbsenteeLog day;
  const _DailyAbsentCard({required this.day});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('EEE, dd MMMM yyyy').format(day.date);
    final hasAbsents = day.absentCount > 0;

    return SurfaceCard(
      level: SurfaceLevel.flat,
      padding: const EdgeInsets.all(Space.sm + 3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    hasAbsents ? Icons.event_busy_rounded : Icons.verified_rounded,
                    size: 16,
                    color: hasAbsents ? AppColors.red : AppColors.teal,
                  ),
                  const SizedBox(width: 8),
                  Text(dateStr, style: AppTextStyles.h3.copyWith(fontSize: 14)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (hasAbsents ? AppColors.red : AppColors.teal).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: (hasAbsents ? AppColors.red : AppColors.teal).withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  hasAbsents ? '${day.absentCount} Absent' : 'All Present',
                  style: AppTextStyles.labelSmall.copyWith(
                    color: hasAbsents ? AppColors.red : AppColors.teal,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          if (hasAbsents) ...[
            const SizedBox(height: 10),
            Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 8),

            // List of Absent Students
            for (final st in day.absents) ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.red.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        st.rollNo,
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.red,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            st.studentName,
                            style: AppTextStyles.labelLarge.copyWith(fontSize: 13),
                          ),
                          if (st.remarks != null && st.remarks!.isNotEmpty)
                            Text(
                              'Reason: ${st.remarks}',
                              style: AppTextStyles.bodySmall.copyWith(
                                color: AppColors.red,
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (st.parentPhone != null && st.parentPhone!.isNotEmpty)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.phone_rounded, size: 12, color: AppColors.inkLight),
                          const SizedBox(width: 4),
                          Text(
                            st.parentPhone!,
                            style: AppTextStyles.mono.copyWith(fontSize: 11, color: AppColors.inkMid),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ] else ...[
            const SizedBox(height: 6),
            Text(
              '100% attendance recorded — no students were absent.',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.teal, fontSize: 11.5),
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING SHEET STATUS BANNER & STUDENT ROW
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
