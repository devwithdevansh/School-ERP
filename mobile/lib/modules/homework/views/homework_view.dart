import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../core/utils/date_labels.dart';
import '../../../data/models/homework_model.dart';
import '../../../data/repositories/homework_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';

class HomeworkView extends StatefulWidget {
  const HomeworkView({super.key});

  @override
  State<HomeworkView> createState() => _HomeworkViewState();
}

class _HomeworkViewState extends State<HomeworkView> {
  final _repo = HomeworkRepository();
  int _filter = 0; // 0 All, 1 Upcoming, 2 Overdue
  bool _loading = true;
  List<HomeworkModel> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final studentId = Get.find<DashboardController>().student.value?.id;
    if (studentId == null || studentId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final items = await _repo.getHomework(studentId);
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  List<HomeworkModel> get _upcoming =>
      _items.where((h) => !h.isOverdue).toList()..sort((a, b) => a.dueDate.compareTo(b.dueDate));

  List<HomeworkModel> get _overdue =>
      _items.where((h) => h.isOverdue).toList()..sort((a, b) => b.dueDate.compareTo(a.dueDate));

  @override
  Widget build(BuildContext context) {
    final studentName = Get.find<DashboardController>().student.value?.name;
    final upcoming = _upcoming;
    final overdue = _overdue;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(title: 'Homework', subtitle: studentName),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: _loading
            ? const SkeletonList()
            : _items.isEmpty
                ? _scrollableEmpty(
                    context,
                    const EmptyState(
                      icon: Icons.task_alt_rounded,
                      title: 'No homework yet',
                      message: 'When a teacher assigns homework it will show up here.',
                    ),
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: Space.xl),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, 0),
                        child: Row(
                          children: [
                            Expanded(
                              child: StatTile(
                                icon: Icons.pending_actions_rounded,
                                value: '${upcoming.length}',
                                label: 'Pending',
                                tone: AppColors.accentDeep,
                              ),
                            ),
                            const SizedBox(width: Space.sm),
                            Expanded(
                              child: StatTile(
                                icon: Icons.warning_amber_rounded,
                                value: '${overdue.length}',
                                label: 'Overdue',
                                tone: overdue.isEmpty ? AppColors.teal : AppColors.red,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ChipTabs(
                        labels: const ['All', 'Upcoming', 'Overdue'],
                        counts: [_items.length, upcoming.length, overdue.length],
                        selected: _filter,
                        onChanged: (i) => setState(() => _filter = i),
                      ),
                      ..._buildSections(context, upcoming, overdue),
                    ],
                  ),
      ),
    );
  }

  Widget _scrollableEmpty(BuildContext context, Widget child) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Center(child: child),
        ),
      );

  List<Widget> _buildSections(BuildContext context, List<HomeworkModel> upcoming, List<HomeworkModel> overdue) {
    final showUpcoming = _filter != 2;
    final showOverdue = _filter != 1;
    final visible = (showUpcoming ? upcoming.length : 0) + (showOverdue ? overdue.length : 0);

    if (visible == 0) {
      return [
        Padding(
          padding: const EdgeInsets.only(top: Space.xxl),
          child: EmptyState(
            icon: _filter == 2 ? Icons.celebration_rounded : Icons.check_circle_outline_rounded,
            title: _filter == 2 ? 'Nothing overdue' : 'All caught up',
            message: _filter == 2
                ? 'No homework has passed its due date.'
                : 'There is no pending homework right now.',
          ),
        ),
      ];
    }

    Widget section(String title, List<HomeworkModel> list) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_filter == 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.md + 4, Space.md, Space.md, Space.xs),
                child: Text(title, style: AppTextStyles.labelSmall.copyWith(letterSpacing: 1.1)),
              ),
            for (final hw in list)
              Padding(
                padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.xs),
                child: _HomeworkCard(hw: hw, onTap: () => _openDetail(context, hw)),
              ),
          ],
        );

    return [
      if (showUpcoming && upcoming.isNotEmpty) section('DUE SOON', upcoming),
      if (showOverdue && overdue.isNotEmpty) section('OVERDUE', overdue),
    ];
  }

  void _openDetail(BuildContext context, HomeworkModel hw) {
    final (label, tone) = dueLabel(hw.dueDate);
    showAppSheet(
      context: context,
      title: hw.title,
      subtitle: hw.subjectName,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(alignment: Alignment.centerLeft, child: StatusPill(label, tone: tone, icon: Icons.schedule_rounded)),
          const SizedBox(height: Space.md),
          Text('WHAT TO DO', style: AppTextStyles.labelSmall.copyWith(letterSpacing: 1.1)),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(Space.md),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(Radii.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(hw.description.isEmpty ? 'No description provided.' : hw.description,
                style: AppTextStyles.bodyLarge.copyWith(height: 1.5)),
          ),
          const SizedBox(height: Space.md),
          _DetailRow(icon: Icons.menu_book_rounded, label: 'Subject', value: hw.subjectName),
          if (hw.teacherName.isNotEmpty)
            _DetailRow(icon: Icons.person_outline_rounded, label: 'Assigned by', value: hw.teacherName),
          _DetailRow(icon: Icons.event_rounded, label: 'Due date', value: fmtLongDate(hw.dueDate.toLocal())),
          if (hw.classLabel.isNotEmpty)
            _DetailRow(icon: Icons.school_outlined, label: 'Class', value: hw.classLabel),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.inkLight),
          const SizedBox(width: 10),
          SizedBox(width: 92, child: Text(label, style: AppTextStyles.bodyMedium)),
          Expanded(child: Text(value, style: AppTextStyles.labelLarge, textAlign: TextAlign.end)),
        ],
      ),
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  final HomeworkModel hw;
  final VoidCallback onTap;
  const _HomeworkCard({required this.hw, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = dueLabel(hw.dueDate);
    final accent = switch (tone) {
      PillTone.danger => AppColors.red,
      PillTone.warning => AppColors.accentDeep,
      _ => AppColors.primary,
    };

    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(Radii.lg)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(Space.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.menu_book_rounded, size: 15, color: AppColors.primaryMid),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            hw.subjectName.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.labelSmall.copyWith(color: AppColors.primaryMid, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusPill(label, tone: tone),
                      ],
                    ),
                    const SizedBox(height: 8),
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
                        Text(fmtShortDate(hw.dueDate.toLocal()), style: AppTextStyles.bodySmall),
                        if (hw.teacherName.isNotEmpty) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.person_outline_rounded, size: 14, color: AppColors.inkLight),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(hw.teacherName,
                                style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        ],
                        const Spacer(),
                        Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.inkLight),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
