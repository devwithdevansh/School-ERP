import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../data/models/exam_model.dart';
import '../controllers/teacher_marks_controller.dart';

class TeacherMarksView extends GetView<TeacherMarksController> {
  const TeacherMarksView({super.key});

  bool _invalid(MarksEntry e) {
    final v = num.tryParse(e.marksObtained.trim());
    return e.marksObtained.trim().isNotEmpty && (v == null || v < 0 || v > controller.currentMaxMarks);
  }

  Future<void> _submit(BuildContext context) async {
    final ok = await controller.submitMarks();
    if (!context.mounted) return;
    if (ok) {
      Get.back();
      Get.snackbar('Saved', 'Marks for ${controller.selectedExam.value?.examName ?? ''} were submitted.');
    } else {
      Get.snackbar('Error', 'Could not save marks. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'Enter marks'),
      body: Obx(() {
        if (controller.isLoading.value && controller.mySubjects.isEmpty) {
          return const SkeletonList();
        }
        if (!controller.hasAssignment.value) {
          return const Center(
            child: EmptyState(
              icon: Icons.menu_book_outlined,
              title: 'No subject assigned',
              message: "You aren't assigned as a subject teacher for any class yet.",
            ),
          );
        }

        final max = controller.currentMaxMarks;
        final entered = controller.entries.where((e) => e.marksObtained.trim().isNotEmpty).length;
        final total = controller.entries.length;

        return Column(
          children: [
            _Selectors(controller: controller),
            if (controller.selectedExam.value != null && !controller.isGradeBased && total > 0)
              _ProgressStrip(
                entered: entered,
                total: total,
                max: max,
                pass: controller.currentPassingMarks,
              ),
            Divider(height: 1, color: AppColors.border),
            Expanded(child: _body(context)),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        if (!controller.hasAssignment.value || controller.entries.isEmpty || controller.isGradeBased) {
          return const SizedBox.shrink();
        }
        final invalidCount = controller.entries.where(_invalid).length;
        final entered = controller.entries.where((e) => e.marksObtained.trim().isNotEmpty).length;
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
                  if (invalidCount > 0)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Space.xs),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded, size: 16, color: AppColors.red),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '$invalidCount ${invalidCount == 1 ? 'entry is' : 'entries are'} above the maximum of ${controller.currentMaxMarks}.',
                              style: AppTextStyles.bodySmall.copyWith(color: AppColors.red),
                            ),
                          ),
                        ],
                      ),
                    ),
                  CustomButton(
                    label: entered == 0 ? 'Save marks' : 'Save marks ($entered)',
                    loading: controller.isSaving.value,
                    onTap: (invalidCount > 0 || entered == 0 || controller.isSaving.value)
                        ? null
                        : () => _submit(context),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _body(BuildContext context) {
    if (controller.isLoading.value) return const SkeletonList(itemHeight: 68);
    if (controller.selectedExam.value == null) {
      return const Center(
        child: EmptyState(
          icon: Icons.event_busy_rounded,
          title: 'No exam scheduled',
          message: 'No exam has been scheduled for this class yet.',
        ),
      );
    }
    if (controller.isGradeBased) {
      return const Center(
        child: EmptyState(
          icon: Icons.workspace_premium_outlined,
          title: 'Graded by letter',
          message:
              'This subject uses letter grades, which can’t be entered in the app yet. Please ask the school office to enter them from the admin panel.',
        ),
      );
    }
    if (controller.entries.isEmpty) {
      return const Center(
        child: EmptyState(
          icon: Icons.people_outline_rounded,
          title: 'No students',
          message: 'No active students found in this class yet.',
        ),
      );
    }

    final examId = controller.selectedExam.value!.id;
    final subjectId = controller.selectedSubject.value?.subjectId ?? '';
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
      itemCount: controller.entries.length,
      separatorBuilder: (_, __) => const SizedBox(height: Space.xs + 2),
      itemBuilder: (context, index) {
        final entry = controller.entries[index];
        return _MarksRow(
          // Keyed by exam + subject too, so switching either resets the inputs
          // instead of reusing a previous selection's text.
          key: ValueKey('$examId|$subjectId|${entry.studentId}'),
          index: index,
          entry: entry,
          max: controller.currentMaxMarks,
          pass: controller.currentPassingMarks,
          onChanged: (v) => controller.updateMarks(index, v),
        );
      },
    );
  }
}

class _Selectors extends StatelessWidget {
  final TeacherMarksController controller;
  const _Selectors({required this.controller});

  @override
  Widget build(BuildContext context) {
    final multiMedium = controller.mySubjects.map((s) => s.medium).toSet().length > 1;
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.md),
      child: Column(
        children: [
          AppDropdownField(
            label: 'Class & subject',
            value: controller.selectedSubject.value,
            items: controller.mySubjects.toList(),
            itemLabel: (s) => '${s.classLabel} · ${s.subjectName}${multiMedium ? ' (${s.medium})' : ''}',
            onChanged: (s) {
              if (s != null) controller.selectSubject(s);
            },
          ),
          const SizedBox(height: Space.sm),
          if (controller.exams.isEmpty)
            Row(
              children: [
                Icon(Icons.info_outline_rounded, size: 16, color: AppColors.inkLight),
                const SizedBox(width: 6),
                Text('No exams scheduled for this class', style: AppTextStyles.bodySmall),
              ],
            )
          else
            AppDropdownField(
              label: 'Exam',
              value: controller.selectedExam.value,
              items: controller.exams.toList(),
              itemLabel: (e) => e.examName,
              onChanged: (e) {
                if (e != null) controller.selectExam(e);
              },
            ),
        ],
      ),
    );
  }
}

class _ProgressStrip extends StatelessWidget {
  final int entered;
  final int total;
  final num max;
  final num pass;
  const _ProgressStrip({required this.entered, required this.total, required this.max, required this.pass});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.fromLTRB(Space.md, 0, Space.md, Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('$entered of $total entered', style: AppTextStyles.labelLarge),
              const Spacer(),
              Text('Out of $max  ·  Pass $pass', style: AppTextStyles.bodySmall),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: total == 0 ? 0 : entered / total,
              minHeight: 6,
              backgroundColor: AppColors.surfaceMuted,
              valueColor: AlwaysStoppedAnimation(entered == total ? AppColors.teal : AppColors.accentDeep),
            ),
          ),
        ],
      ),
    );
  }
}

/// One student's marks row. Stateful so the text controller survives the
/// list rebuilding on every keystroke.
class _MarksRow extends StatefulWidget {
  final int index;
  final MarksEntry entry;
  final num max;
  final num pass;
  final ValueChanged<String> onChanged;

  const _MarksRow({
    super.key,
    required this.index,
    required this.entry,
    required this.max,
    required this.pass,
    required this.onChanged,
  });

  @override
  State<_MarksRow> createState() => _MarksRowState();
}

class _MarksRowState extends State<_MarksRow> {
  late final TextEditingController _c = TextEditingController(text: widget.entry.marksObtained);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  OutlineInputBorder _border(Color c, double w) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: c, width: w),
      );

  @override
  Widget build(BuildContext context) {
    final text = widget.entry.marksObtained.trim();
    final v = num.tryParse(text);
    final over = text.isNotEmpty && (v == null || v > widget.max);
    final below = !over && v != null && v < widget.pass;
    final name = widget.entry.studentName;

    return SurfaceCard(
      level: SurfaceLevel.flat,
      padding: const EdgeInsets.symmetric(horizontal: Space.md - 2, vertical: Space.sm),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primaryLight,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.labelLarge.copyWith(fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  over
                      ? 'Above the maximum of ${widget.max}'
                      : (below ? 'Below pass mark' : 'Out of ${widget.max}'),
                  style: AppTextStyles.bodySmall.copyWith(
                    color: over ? AppColors.red : (below ? AppColors.accentDeep : AppColors.inkLight),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 92,
            child: TextField(
              controller: _c,
              textAlign: TextAlign.center,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d{0,3}(\.\d{0,2})?'))],
              style: AppTextStyles.mono.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
              decoration: InputDecoration(
                hintText: '—',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                enabledBorder: over ? _border(AppColors.red, 1.6) : null,
                focusedBorder: over ? _border(AppColors.red, 2) : null,
              ),
              onChanged: widget.onChanged,
            ),
          ),
        ],
      ),
    );
  }
}
