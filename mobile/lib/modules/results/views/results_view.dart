import '../../../core/config/school_brand.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/exam_result_model.dart';
import '../../../data/repositories/results_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';

/// One exam's numbers, worked out from its per-subject results.
///
/// Only marks-based subjects that actually have marks entered count towards
/// the total — a subject the teacher hasn't marked yet must not drag the
/// percentage down, and letter-graded subjects have no numeric total at all.
class _ExamSummary {
  final String name;
  final List<ExamResultModel> subjects;
  _ExamSummary(this.name, this.subjects);

  List<ExamResultModel> get _counted =>
      subjects.where((s) => !s.isGradeBased && s.marksObtained != null).toList();

  num get total => _counted.fold<num>(0, (a, s) => a + s.marksObtained!);
  num get max => _counted.fold<num>(0, (a, s) => a + s.maxMarks);
  bool get hasMarks => _counted.isNotEmpty;
  double get percent => max > 0 ? total / max * 100 : 0;
  List<ExamResultModel> get failed => _counted.where((s) => !s.isPass).toList();
  bool get passed => hasMarks && failed.isEmpty;

  String get grade {
    final p = percent;
    return p >= 90 ? 'A+' : (p >= 80 ? 'A' : (p >= 70 ? 'B+' : (p >= 60 ? 'B' : 'C')));
  }

  Color get tone => !hasMarks
      ? AppColors.inkMid
      : (!passed ? AppColors.red : (percent >= 75 ? AppColors.teal : AppColors.accentDeep));
}

String _fmtNum(num n) => n == n.roundToDouble() ? n.toInt().toString() : n.toStringAsFixed(1);

class ResultsView extends StatefulWidget {
  const ResultsView({super.key});

  @override
  State<ResultsView> createState() => _ResultsViewState();
}

class _ResultsViewState extends State<ResultsView> {
  final _repo = ResultsRepository();
  int _tab = 0; // 0 Overview, 1 Report card
  String? _exam;
  bool _loading = true;
  List<ExamResultModel> _results = [];

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
    final results = await _repo.getResults(studentId);
    if (!mounted) return;
    setState(() {
      _results = results;
      _exam = results.isNotEmpty ? results.first.examName : null;
      _loading = false;
    });
  }

  List<_ExamSummary> get _exams {
    final groups = <String, List<ExamResultModel>>{};
    for (final r in _results) {
      groups.putIfAbsent(r.examName, () => []).add(r);
    }
    return groups.entries.map((e) => _ExamSummary(e.key, e.value)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final studentName = Get.find<DashboardController>().student.value?.name;
    final exams = _exams;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(title: 'Results', subtitle: studentName),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: _loading
            ? const SkeletonList(count: 3, itemHeight: 190)
            : _results.isEmpty
                ? SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: SizedBox(
                      height: MediaQuery.of(context).size.height * 0.6,
                      child: const Center(
                        child: EmptyState(
                          icon: Icons.bar_chart_rounded,
                          title: 'No results yet',
                          message: 'Exam results will appear here once your teachers publish them.',
                        ),
                      ),
                    ),
                  )
                : Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, 0),
                        child: SegmentedTabs(
                          labels: const ['Overview', 'Report card'],
                          selected: _tab,
                          onChanged: (i) => setState(() => _tab = i),
                        ),
                      ),
                      Expanded(child: _tab == 0 ? _overview(exams) : _reportCard(exams)),
                    ],
                  ),
      ),
    );
  }

  Widget _overview(List<_ExamSummary> exams) => ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
        itemCount: exams.length,
        separatorBuilder: (_, __) => const SizedBox(height: Space.md),
        itemBuilder: (_, i) => _ExamCard(summary: exams[i]),
      );

  Widget _reportCard(List<_ExamSummary> exams) {
    final selected = exams.firstWhere((e) => e.name == _exam, orElse: () => exams.first);
    final student = Get.find<DashboardController>().student.value;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: Space.xl),
      children: [
        ChipTabs(
          labels: [for (final e in exams) e.name],
          selected: exams.indexOf(selected),
          onChanged: (i) => setState(() => _exam = exams[i].name),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, 0),
          child: _ReportCard(
            summary: selected,
            studentName: student?.name ?? '',
            classLabel: student == null ? '' : 'Std ${student.standard}-${student.division}  ·  ${student.medium}',
          ),
        ),
      ],
    );
  }
}

class _ExamCard extends StatelessWidget {
  final _ExamSummary summary;
  const _ExamCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final s = summary;
    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(s.name, style: AppTextStyles.h2, maxLines: 2, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              if (s.hasMarks)
                StatusPill(
                  s.passed ? 'PASSED' : 'NEEDS WORK',
                  tone: s.passed ? PillTone.success : PillTone.danger,
                  icon: s.passed ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                ),
            ],
          ),
          if (s.hasMarks) ...[
            const SizedBox(height: Space.md),
            Row(
              children: [
                ProgressRing(
                  progress: (s.percent / 100).clamp(0.0, 1.0),
                  size: 84,
                  strokeWidth: 9,
                  color: s.tone,
                  center: Text('${s.percent.round()}%', style: AppTextStyles.h2),
                ),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('TOTAL MARKS', style: AppTextStyles.labelSmall.copyWith(letterSpacing: 1.1)),
                      const SizedBox(height: 2),
                      Text('${_fmtNum(s.total)} / ${_fmtNum(s.max)}', style: AppTextStyles.monoMedium),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _Chip(text: 'Grade ${s.grade}', color: s.tone),
                          const SizedBox(width: 8),
                          _Chip(text: '${s.subjects.length} subjects', color: AppColors.inkMid),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: Space.sm),
          Divider(height: 1, color: AppColors.border),
          for (var i = 0; i < s.subjects.length; i++) ...[
            _SubjectRow(result: s.subjects[i]),
            if (i != s.subjects.length - 1) Divider(height: 1, color: AppColors.border),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  final Color color;
  const _Chip({required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: AppColors.isDark ? 0.2 : 0.12),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(text, style: AppTextStyles.labelSmall.copyWith(color: color, letterSpacing: 0.2)),
      );
}

class _SubjectRow extends StatelessWidget {
  final ExamResultModel result;
  const _SubjectRow({required this.result});

  @override
  Widget build(BuildContext context) {
    final r = result;

    if (r.isGradeBased) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Expanded(child: Text(r.subjectName, style: AppTextStyles.labelLarge)),
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
              child: Text(r.gradeObtained ?? '—', style: AppTextStyles.h3.copyWith(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    final marks = r.marksObtained;
    final pct = (marks != null && r.maxMarks > 0) ? marks / r.maxMarks : 0.0;
    final failed = marks != null && !r.isPass;
    final color = marks == null
        ? AppColors.inkLight
        : (failed ? AppColors.red : (pct >= 0.75 ? AppColors.teal : AppColors.accentDeep));

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Flexible(child: Text(r.subjectName, style: AppTextStyles.labelLarge, maxLines: 1, overflow: TextOverflow.ellipsis)),
                    if (failed) ...[
                      const SizedBox(width: 8),
                      const StatusPill('BELOW PASS', tone: PillTone.danger),
                    ],
                  ],
                ),
              ),
              Text(
                marks == null ? 'Not marked' : '${_fmtNum(marks)} / ${_fmtNum(r.maxMarks)}',
                style: AppTextStyles.mono.copyWith(color: color, fontWeight: FontWeight.w700, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              minHeight: 7,
              backgroundColor: AppColors.surfaceMuted,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          if (r.remarks != null && r.remarks!.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('“${r.remarks!.trim()}”', style: AppTextStyles.bodySmall.copyWith(fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }
}

/// The formal report-card layout. Uses theme tokens (not fixed light colors)
/// so it stays readable in dark mode.
class _ReportCard extends StatelessWidget {
  final _ExamSummary summary;
  final String studentName;
  final String classLabel;
  const _ReportCard({required this.summary, required this.studentName, required this.classLabel});

  @override
  Widget build(BuildContext context) {
    final s = summary;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: Elevation.of(SurfaceLevel.raised),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: Space.md, horizontal: Space.md),
            decoration: BoxDecoration(gradient: AppColors.primaryGradient),
            child: Column(
              children: [
                Text(SchoolBrand.schoolName.toUpperCase(),
                    style: AppTextStyles.labelLarge.copyWith(color: Colors.white, letterSpacing: 1.6)),
                const SizedBox(height: 2),
                Text(s.name, style: AppTextStyles.h1.copyWith(color: Colors.white), textAlign: TextAlign.center),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(Space.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (studentName.isNotEmpty)
                  Row(
                    children: [
                      Icon(Icons.person_outline_rounded, size: 18, color: AppColors.inkLight),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(studentName, style: AppTextStyles.h3),
                            if (classLabel.isNotEmpty) Text(classLabel, style: AppTextStyles.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: Space.md),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(Radii.sm),
                  ),
                  child: Row(
                    children: [
                      Expanded(flex: 3, child: Text('SUBJECT', style: AppTextStyles.labelSmall)),
                      Expanded(
                        flex: 2,
                        child: Text('MARKS', textAlign: TextAlign.right, style: AppTextStyles.labelSmall),
                      ),
                    ],
                  ),
                ),
                for (final r in s.subjects)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    child: Row(
                      children: [
                        Expanded(flex: 3, child: Text(r.subjectName, style: AppTextStyles.bodyLarge)),
                        Expanded(
                          flex: 2,
                          child: Text(
                            r.isGradeBased
                                ? (r.gradeObtained ?? '—')
                                : (r.marksObtained == null
                                    ? '—'
                                    : '${_fmtNum(r.marksObtained!)} / ${_fmtNum(r.maxMarks)}'),
                            textAlign: TextAlign.right,
                            style: AppTextStyles.mono.copyWith(
                              fontWeight: FontWeight.w700,
                              color: (!r.isGradeBased && r.marksObtained != null && !r.isPass)
                                  ? AppColors.red
                                  : AppColors.ink,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                Divider(color: AppColors.border),
                const SizedBox(height: Space.xs),
                if (s.hasMarks)
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('TOTAL', style: AppTextStyles.labelSmall),
                            const SizedBox(height: 2),
                            Text('${_fmtNum(s.total)} / ${_fmtNum(s.max)}', style: AppTextStyles.monoMedium),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('PERCENTAGE', style: AppTextStyles.labelSmall),
                          const SizedBox(height: 2),
                          Text('${s.percent.toStringAsFixed(1)}%',
                              style: AppTextStyles.monoMedium.copyWith(color: s.tone)),
                        ],
                      ),
                      const SizedBox(width: Space.md),
                      Container(
                        width: 52,
                        height: 52,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: s.tone.withValues(alpha: AppColors.isDark ? 0.2 : 0.12),
                          shape: BoxShape.circle,
                          border: Border.all(color: s.tone, width: 1.6),
                        ),
                        child: Text(s.grade, style: AppTextStyles.h2.copyWith(color: s.tone)),
                      ),
                    ],
                  ),
                if (s.hasMarks) ...[
                  const SizedBox(height: Space.md),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: (s.passed ? AppColors.tealPale : AppColors.redPale),
                      borderRadius: BorderRadius.circular(Radii.sm),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          s.passed ? Icons.verified_rounded : Icons.info_outline_rounded,
                          size: 18,
                          color: s.passed ? AppColors.teal : AppColors.red,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          s.passed
                              ? 'Result: PASSED'
                              : 'Below pass marks in ${s.failed.map((f) => f.subjectName).join(', ')}',
                          style: AppTextStyles.labelLarge.copyWith(color: s.passed ? AppColors.teal : AppColors.red),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
