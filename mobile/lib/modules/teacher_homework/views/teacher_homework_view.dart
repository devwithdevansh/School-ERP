import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../core/utils/date_labels.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../data/models/homework_model.dart';
import '../../../data/models/subject_allocation_model.dart';
import '../controllers/teacher_homework_controller.dart';

class TeacherHomeworkView extends GetView<TeacherHomeworkController> {
  const TeacherHomeworkView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'Homework', subtitle: 'Published by you'),
      floatingActionButton: Obx(() => controller.hasAssignment.value
          ? FloatingActionButton.extended(
              onPressed: () => _openPublish(context),
              backgroundColor: AppColors.accentDeep,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: Text('Publish homework', style: AppTextStyles.button.copyWith(color: Colors.white, fontSize: 14)),
            )
          : const SizedBox.shrink()),
      body: Obx(() {
        if (controller.isLoading.value) return const SkeletonList();

        if (!controller.hasAssignment.value) {
          return const Center(
            child: EmptyState(
              icon: Icons.menu_book_outlined,
              title: 'No subject assigned',
              message:
                  "You aren't assigned as a subject teacher for any class yet. Ask the school admin to assign you a subject, then you can publish homework here.",
            ),
          );
        }

        final all = controller.myHomework.toList();
        final active = all.where((h) => !h.isOverdue).toList();
        final overdue = all.where((h) => h.isOverdue).toList();
        final f = controller.filter.value;
        final shown = f == 1 ? active : (f == 2 ? overdue : all);

        return RefreshIndicator(
          onRefresh: controller.refreshHomework,
          color: AppColors.primary,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 96),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        icon: Icons.library_books_rounded,
                        compact: true,
                        value: '${all.length}',
                        label: 'Published',
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: StatTile(
                        icon: Icons.pending_actions_rounded,
                        compact: true,
                        value: '${active.length}',
                        label: 'Active',
                        tone: AppColors.accentDeep,
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: StatTile(
                        icon: Icons.history_toggle_off_rounded,
                        compact: true,
                        value: '${overdue.length}',
                        label: 'Past due',
                        tone: AppColors.inkMid,
                      ),
                    ),
                  ],
                ),
              ),
              ChipTabs(
                labels: const ['All', 'Active', 'Past due'],
                counts: [all.length, active.length, overdue.length],
                selected: f,
                onChanged: (i) => controller.filter.value = i,
              ),
              if (all.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: Space.xxl),
                  child: EmptyState(
                    icon: Icons.assignment_outlined,
                    title: 'No homework published yet',
                    message: 'Assign your first homework — students and parents are notified in the app.',
                    actionLabel: 'Publish homework',
                    onAction: () => _openPublish(context),
                  ),
                )
              else if (shown.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: Space.xxl),
                  child: EmptyState(
                    icon: Icons.check_circle_outline_rounded,
                    title: 'Nothing here',
                    message: 'No homework matches this filter.',
                  ),
                )
              else
                for (final hw in shown)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.xs),
                    child: _HomeworkCard(
                      hw: hw,
                      onTap: () => _openDetail(context, hw),
                      onDelete: () => _confirmDelete(context, hw),
                    ),
                  ),
            ],
          ),
        );
      }),
    );
  }

  void _openPublish(BuildContext context) {
    showAppSheet(
      context: context,
      title: 'Publish homework',
      subtitle: 'Visible to every student in the class, and to their parents.',
      child: _PublishForm(controller: controller),
    );
  }

  void _openDetail(BuildContext context, HomeworkModel hw) {
    final (label, tone) = dueLabel(hw.dueDate);
    showAppSheet(
      context: context,
      title: hw.title,
      subtitle: '${hw.subjectName}${hw.classLabel.isEmpty ? '' : '  ·  ${hw.classLabel}'}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(alignment: Alignment.centerLeft, child: StatusPill(label, tone: tone, icon: Icons.schedule_rounded)),
          const SizedBox(height: Space.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(Space.md),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(Radii.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(hw.description, style: AppTextStyles.bodyLarge.copyWith(height: 1.5)),
          ),
          const SizedBox(height: Space.md),
          Row(
            children: [
              Icon(Icons.event_rounded, size: 18, color: AppColors.inkLight),
              const SizedBox(width: 10),
              Text('Due', style: AppTextStyles.bodyMedium),
              const Spacer(),
              Text(fmtLongDate(hw.dueDate.toLocal()), style: AppTextStyles.labelLarge),
            ],
          ),
          const SizedBox(height: Space.lg),
          CustomButton(
            label: 'Delete homework',
            variant: ButtonVariant.danger,
            icon: Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.red),
            onTap: () {
              Navigator.of(context).pop();
              _confirmDelete(context, hw);
            },
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, HomeworkModel hw) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.white,
        surfaceTintColor: Colors.transparent,
        title: Text('Delete homework?', style: AppTextStyles.h2),
        content: Text(
          'This removes "${hw.title}" for every student in that class.',
          style: AppTextStyles.bodyMedium,
        ),
        actions: [
          TextButton(onPressed: () => Get.back(result: false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Get.back(result: true),
            child: Text('Delete', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final ok = await controller.deleteHomeworkItem(hw.id);
      if (!ok) Get.snackbar('Error', 'Could not delete this homework. Please try again.');
    }
  }
}

class _HomeworkCard extends StatelessWidget {
  final HomeworkModel hw;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  const _HomeworkCard({required this.hw, required this.onTap, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = dueLabel(hw.dueDate);
    return SurfaceCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${hw.classLabel.isEmpty ? '' : '${hw.classLabel}  ·  '}${hw.subjectName}',
                  style: AppTextStyles.labelSmall.copyWith(color: AppColors.primary, letterSpacing: 0.2),
                ),
              ),
              const Spacer(),
              StatusPill(label, tone: tone),
              SizedBox(
                width: 34,
                height: 28,
                child: PopupMenuButton<String>(
                  padding: EdgeInsets.zero,
                  color: AppColors.white,
                  icon: Icon(Icons.more_vert_rounded, size: 20, color: AppColors.inkLight),
                  tooltip: 'More',
                  onSelected: (v) {
                    if (v == 'delete') onDelete();
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.red),
                          const SizedBox(width: 8),
                          Text('Delete', style: AppTextStyles.labelLarge.copyWith(color: AppColors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(hw.title, style: AppTextStyles.h3, maxLines: 2, overflow: TextOverflow.ellipsis),
          if (hw.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(hw.description, style: AppTextStyles.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.event_rounded, size: 14, color: AppColors.inkLight),
              const SizedBox(width: 5),
              Text('Due ${fmtShortDate(hw.dueDate.toLocal())}', style: AppTextStyles.bodySmall),
              const Spacer(),
              Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.inkLight),
            ],
          ),
        ],
      ),
    );
  }
}

/// The publish form. Stateful so its text controllers live (and are
/// disposed) with the sheet, instead of being re-created on every rebuild.
class _PublishForm extends StatefulWidget {
  final TeacherHomeworkController controller;
  const _PublishForm({required this.controller});

  @override
  State<_PublishForm> createState() => _PublishFormState();
}

class _PublishFormState extends State<_PublishForm> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  late SubjectAllocationModel? _subject = widget.controller.mySubjects.firstOrNull;
  DateTime _due = dateOnly(DateTime.now().add(const Duration(days: 1)));
  String? _titleErr;
  String? _descErr;
  String? _formErr;

  static const _quickDays = [1, 3, 7];

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  String _subjectLabel(SubjectAllocationModel s) {
    final multiMedium = widget.controller.mySubjects.map((e) => e.medium).toSet().length > 1;
    return '${s.classLabel} · ${s.subjectName}${multiMedium ? ' (${s.medium})' : ''}';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _due,
      firstDate: dateOnly(DateTime.now()),
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked != null) setState(() => _due = dateOnly(picked));
  }

  Future<void> _submit() async {
    final t = _title.text.trim();
    final d = _desc.text.trim();
    setState(() {
      _titleErr = t.isEmpty ? 'Enter a title' : null;
      _descErr = d.isEmpty ? 'Describe what students should do' : null;
      _formErr = null;
    });
    if (_titleErr != null || _descErr != null || _subject == null) return;

    final result = await widget.controller.publishHomework(
      subject: _subject!,
      title: t,
      description: d,
      dueDate: _due,
    );
    if (!mounted) return;
    if (result.success) {
      final label = _subject!.classLabel;
      Navigator.of(context).pop();
      Get.snackbar('Published', 'Homework assigned to $label.');
    } else {
      setState(() => _formErr = result.error ?? 'Could not publish homework. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final quickIndex = _quickDays.indexOf(daysUntil(_due));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppDropdownField<SubjectAllocationModel>(
          label: 'Class & subject',
          required: true,
          value: _subject,
          items: widget.controller.mySubjects.toList(),
          itemLabel: _subjectLabel,
          onChanged: (s) => setState(() => _subject = s),
        ),
        const SizedBox(height: Space.md),
        AppTextField(
          label: 'Title',
          required: true,
          hint: 'e.g. Exercise 4.2 — Q1 to Q10',
          controller: _title,
          maxLength: 80,
          errorText: _titleErr,
          onChanged: (_) {
            if (_titleErr != null) setState(() => _titleErr = null);
          },
        ),
        const SizedBox(height: Space.sm),
        AppTextField(
          label: 'What should students do?',
          required: true,
          hint: 'Add the instructions, pages or chapters…',
          controller: _desc,
          minLines: 4,
          maxLines: 6,
          maxLength: 500,
          errorText: _descErr,
          onChanged: (_) {
            if (_descErr != null) setState(() => _descErr = null);
          },
        ),
        const SizedBox(height: Space.sm),
        AppPickerField(
          label: 'Due date',
          required: true,
          value: fmtLongDate(_due),
          onTap: _pickDate,
        ),
        const SizedBox(height: Space.sm),
        ChipTabs(
          padding: EdgeInsets.zero,
          labels: const ['Tomorrow', 'In 3 days', 'Next week'],
          selected: quickIndex,
          onChanged: (i) => setState(
            () => _due = dateOnly(DateTime.now().add(Duration(days: _quickDays[i]))),
          ),
        ),
        if (_formErr != null) ...[
          const SizedBox(height: Space.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(Space.sm + 2),
            decoration: BoxDecoration(
              color: AppColors.redPale,
              borderRadius: BorderRadius.circular(Radii.sm),
              border: Border.all(color: AppColors.red.withValues(alpha: 0.4)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.error_outline_rounded, size: 18, color: AppColors.red),
                const SizedBox(width: 8),
                Expanded(child: Text(_formErr!, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.red))),
              ],
            ),
          ),
        ],
        const SizedBox(height: Space.lg),
        Obx(() => CustomButton(
              label: 'Publish homework',
              loading: widget.controller.isPublishing.value,
              onTap: widget.controller.isPublishing.value ? null : _submit,
            )),
      ],
    );
  }
}
