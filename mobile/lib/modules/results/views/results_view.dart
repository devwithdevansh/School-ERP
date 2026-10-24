import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/config/school_brand.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/exam_result_model.dart';
import '../../../data/repositories/results_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../controllers/report_card_pdf_generator.dart';

/// One exam's aggregate numbers, computed from its per-subject results.
class _ExamSummary {
  final String name;
  final String category;
  final List<ExamResultModel> subjects;

  _ExamSummary(this.name, this.subjects, {this.category = 'FINAL'});

  List<ExamResultModel> get _markSubjects =>
      subjects.where((s) => !s.isGradeBased).toList();

  List<ExamResultModel> get _evaluatedSubjects =>
      _markSubjects.where((s) => s.marksObtained != null || s.isAbsent).toList();

  num get total => _evaluatedSubjects.fold<num>(
      0, (a, s) => a + (s.isAbsent ? 0 : (s.marksObtained ?? 0)));

  num get max => _evaluatedSubjects.fold<num>(0, (a, s) => a + s.maxMarks);

  bool get hasMarks => _evaluatedSubjects.isNotEmpty;
  bool get allAbsent => subjects.isNotEmpty && subjects.every((s) => s.isAbsent);
  bool get anyAbsent => subjects.any((s) => s.isAbsent);

  double get percent => max > 0 ? (total / max * 100) : 0;

  List<ExamResultModel> get failed =>
      _evaluatedSubjects.where((s) => !s.isPass).toList();

  bool get passed => hasMarks && !anyAbsent && failed.isEmpty;

  String get grade {
    if (allAbsent) return 'AB';
    if (!hasMarks) return '—';
    final p = percent;
    return p >= 90 ? 'A+' : (p >= 80 ? 'A' : (p >= 70 ? 'B+' : (p >= 60 ? 'B' : 'C')));
  }

  Color get tone {
    if (allAbsent || anyAbsent || !passed) return AppColors.red;
    if (!hasMarks) return AppColors.inkMid;
    return percent >= 75 ? AppColors.teal : AppColors.accentDeep;
  }

  /// Weekly tests, periodic quizzes, or single-subject quick tests
  bool get isWeekly =>
      category.toUpperCase() == 'WEEKLY' ||
      name.toLowerCase().contains('weekly') ||
      name.toLowerCase().contains('quick') ||
      name.toLowerCase().contains('quiz') ||
      subjects.length <= 1;

  /// Multi-subject formal exams (Midterm, Term 1, Final, etc.)
  bool get isMultiSubject => !isWeekly && subjects.length > 1;
}

String _fmtNum(num n) => n == n.roundToDouble() ? n.toInt().toString() : n.toStringAsFixed(1);

class ResultsView extends StatefulWidget {
  const ResultsView({super.key});

  @override
  State<ResultsView> createState() => _ResultsViewState();
}

class _ResultsViewState extends State<ResultsView> {
  final _repo = ResultsRepository();
  int _tab = 0; // 0 Weekly Tests, 1 Report Card
  String? _selectedReportExam;
  String? _selectedWeeklySubject;
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
      _loading = false;
    });
  }

  List<_ExamSummary> get _exams {
    final groups = <String, List<ExamResultModel>>{};
    final categories = <String, String>{};
    for (final r in _results) {
      groups.putIfAbsent(r.examName, () => []).add(r);
      categories[r.examName] = r.examCategory;
    }
    return groups.entries
        .map((e) => _ExamSummary(e.key, e.value, category: categories[e.key] ?? 'FINAL'))
        .toList();
  }

  /// Formal multi-subject exams for report cards
  List<_ExamSummary> get _multiSubjectExams => _exams.where((e) => e.isMultiSubject).toList();

  /// Weekly & single-subject tests for subject-wise tracking
  List<ExamResultModel> get _weeklyResults {
    final multiNames = _multiSubjectExams.map((e) => e.name).toSet();
    return _results.where((r) => r.isWeekly || !multiNames.contains(r.examName)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final studentName = Get.find<DashboardController>().student.value?.name;
    final multiExams = _multiSubjectExams;
    final weeklyResults = _weeklyResults;

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
                          message: 'Test marks and exam results will appear here once published.',
                        ),
                      ),
                    ),
                  )
                : Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, 0),
                        child: SegmentedTabs(
                          labels: [
                            'Weekly Tests (${weeklyResults.length})',
                            'Report Card (${multiExams.length})',
                          ],
                          selected: _tab,
                          onChanged: (i) => setState(() => _tab = i),
                        ),
                      ),
                      Expanded(
                        child: _tab == 0
                            ? _weeklySection(weeklyResults)
                            : _reportCardSection(multiExams),
                      ),
                    ],
                  ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. WEEKLY & QUICK TESTS (SUBJECT-WISE MARKS)
  // ───────────────────────────────────────────────────────────────────────────

  Widget _weeklySection(List<ExamResultModel> items) {
    if (items.isEmpty) {
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.55,
          child: const Center(
            child: EmptyState(
              icon: Icons.assignment_turned_in_outlined,
              title: 'No weekly tests yet',
              message: 'Subject-wise weekly and quick test scores will appear here.',
            ),
          ),
        ),
      );
    }

    final subjects = ['All Subjects', ...items.map((r) => r.subjectName).toSet().toList()..sort()];
    final currentSub = _selectedWeeklySubject ?? 'All Subjects';
    final selectedIdx = subjects.contains(currentSub) ? subjects.indexOf(currentSub) : 0;

    final filtered = (selectedIdx == 0)
        ? items
        : items.where((r) => r.subjectName == subjects[selectedIdx]).toList();

    // Stats calculations
    final markedItems = filtered.where((r) => !r.isGradeBased && r.marksObtained != null).toList();
    final totalObtained = markedItems.fold<num>(0, (sum, r) => sum + r.marksObtained!);
    final totalMax = markedItems.fold<num>(0, (sum, r) => sum + r.maxMarks);
    final avgPct = totalMax > 0 ? (totalObtained / totalMax * 100) : 0.0;
    final passedCount = markedItems.where((r) => r.isPass).length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: Space.xl),
      children: [
        ChipTabs(
          labels: subjects,
          selected: selectedIdx,
          onChanged: (i) => setState(() => _selectedWeeklySubject = subjects[i]),
        ),

        // Subject Summary Card
        Padding(
          padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.sm),
          child: SurfaceCard(
            padding: const EdgeInsets.all(Space.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(
                  label: 'TESTS TAKEN',
                  value: '${filtered.length}',
                  color: AppColors.primary,
                ),
                Container(width: 1, height: 32, color: AppColors.border),
                _StatItem(
                  label: 'AVERAGE',
                  value: markedItems.isNotEmpty ? '${avgPct.toStringAsFixed(1)}%' : '—',
                  color: avgPct >= 75 ? AppColors.teal : (avgPct >= 50 ? AppColors.accentDeep : AppColors.red),
                ),
                Container(width: 1, height: 32, color: AppColors.border),
                _StatItem(
                  label: 'PASSED',
                  value: '$passedCount / ${markedItems.length}',
                  color: AppColors.teal,
                ),
              ],
            ),
          ),
        ),

        // Tests List
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Space.md),
          child: Column(
            children: [
              for (final r in filtered) ...[
                _WeeklyTestCard(result: r),
                const SizedBox(height: Space.sm),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. REPORT CARD (MULTI-SUBJECT EXAMS ONLY + PDF DOWNLOAD)
  // ───────────────────────────────────────────────────────────────────────────

  Widget _reportCardSection(List<_ExamSummary> multiExams) {
    if (multiExams.isEmpty) {
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.55,
          child: const Center(
            child: EmptyState(
              icon: Icons.workspace_premium_outlined,
              title: 'No multi-subject report cards yet',
              message:
                  'Formal report cards are generated for multi-subject exams (Mid-term, Semester, Final). Weekly quick test results are in the Weekly Tests tab.',
            ),
          ),
        ),
      );
    }

    final selected = multiExams.firstWhere(
      (e) => e.name == _selectedReportExam,
      orElse: () => multiExams.first,
    );
    final student = Get.find<DashboardController>().student.value;
    final classLabel = student == null
        ? ''
        : 'Std ${student.standard}-${student.division}  ·  ${student.medium} Medium';

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: Space.xl),
      children: [
        ChipTabs(
          labels: [for (final e in multiExams) e.name],
          selected: multiExams.indexOf(selected),
          onChanged: (i) => setState(() => _selectedReportExam = multiExams[i].name),
        ),

        // Download Action Bar
        Padding(
          padding: const EdgeInsets.fromLTRB(Space.md, Space.xs, Space.md, Space.sm),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'OFFICIAL REPORT CARD',
                style: AppTextStyles.labelSmall.copyWith(letterSpacing: 1.1, color: AppColors.inkLight),
              ),
              InkWell(
                onTap: () => ReportCardPdfGenerator.downloadReportCard(
                  examName: selected.name,
                  subjects: selected.subjects,
                  studentName: student?.name ?? 'Student',
                  classLabel: classLabel,
                  rollNo: student?.studentCode,
                  totalMarks: selected.total,
                  maxMarks: selected.max,
                  percentage: selected.percent,
                  overallGrade: selected.grade,
                  passed: selected.passed,
                ),
                borderRadius: BorderRadius.circular(Radii.sm),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(Radii.sm),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.download_rounded, size: 15, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'Download PDF',
                        style: AppTextStyles.labelSmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Space.md),
          child: _ReportCard(
            summary: selected,
            studentName: student?.name ?? '',
            classLabel: classLabel,
            rollNo: student?.studentCode,
          ),
        ),

        const SizedBox(height: Space.md),

        // Prominent Full-Width Download Button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Space.md),
          child: SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () => ReportCardPdfGenerator.downloadReportCard(
                examName: selected.name,
                subjects: selected.subjects,
                studentName: student?.name ?? 'Student',
                classLabel: classLabel,
                rollNo: student?.studentCode,
                totalMarks: selected.total,
                maxMarks: selected.max,
                percentage: selected.percent,
                overallGrade: selected.grade,
                passed: selected.passed,
              ),
              icon: const Icon(Icons.picture_as_pdf_rounded, size: 18, color: Colors.white),
              label: Text(
                'Download ${selected.name} Report Card',
                style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.md)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT ITEM HELPER
// ─────────────────────────────────────────────────────────────────────────────

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: AppTextStyles.labelSmall.copyWith(letterSpacing: 0.8, fontSize: 10)),
        const SizedBox(height: 3),
        Text(value, style: AppTextStyles.h2.copyWith(color: color, fontSize: 17)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY TEST CARD (SUBJECT-WISE MARKS DISPLAY)
// ─────────────────────────────────────────────────────────────────────────────

class _WeeklyTestCard extends StatelessWidget {
  final ExamResultModel result;
  const _WeeklyTestCard({required this.result});

  @override
  Widget build(BuildContext context) {
    final r = result;
    final marks = r.marksObtained;
    final isPass = r.isPass;
    final isAbsent = r.isAbsent;
    final hasMarks = marks != null;
    final pct = (marks != null && r.maxMarks > 0) ? (marks / r.maxMarks) : 0.0;

    final dateStr = r.date != null ? DateFormat('dd MMM yyyy').format(r.date!) : null;

    final color = isAbsent
        ? AppColors.red
        : (!hasMarks
            ? AppColors.inkLight
            : (!isPass ? AppColors.red : (pct >= 0.75 ? AppColors.teal : AppColors.accentDeep)));

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Subject + Test Name + Status Pill
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.menu_book_rounded, size: 19, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          r.subjectName.toUpperCase(),
                          style: AppTextStyles.labelSmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        if (dateStr != null) ...[
                          const SizedBox(width: 6),
                          Text('· $dateStr', style: AppTextStyles.bodySmall.copyWith(fontSize: 10.5)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      r.examName,
                      style: AppTextStyles.h3,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (r.isGradeBased)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    r.gradeObtained ?? '—',
                    style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                  ),
                )
              else if (r.isAbsent)
                const StatusPill(
                  'ABSENT',
                  tone: PillTone.danger,
                  icon: Icons.cancel_outlined,
                )
              else if (hasMarks)
                StatusPill(
                  isPass ? 'PASSED' : 'BELOW PASS',
                  tone: isPass ? PillTone.success : PillTone.danger,
                  icon: isPass ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                ),
            ],
          ),

          const SizedBox(height: Space.md),

          // Score and progress
          if (r.isAbsent) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('ABSENT', style: AppTextStyles.monoMedium.copyWith(fontSize: 20, color: AppColors.red, fontWeight: FontWeight.w800)),
                    Text(' / ${_fmtNum(r.maxMarks)}', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight)),
                    const SizedBox(width: 8),
                    Text('(${r.passingMarks} to pass)', style: AppTextStyles.bodySmall.copyWith(fontSize: 10.5)),
                  ],
                ),
                Text(
                  '0%',
                  style: AppTextStyles.monoMedium.copyWith(color: AppColors.red, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 7),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: 0.0,
                minHeight: 7,
                backgroundColor: AppColors.red.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation(AppColors.red),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: AppColors.red.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.red.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.person_off_rounded, size: 15, color: AppColors.red),
                  const SizedBox(width: 8),
                  Text(
                    'Marked Absent on Exam Day (0 Marks Counted)',
                    style: AppTextStyles.labelSmall.copyWith(color: AppColors.red, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ] else if (!r.isGradeBased && hasMarks) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(_fmtNum(marks), style: AppTextStyles.monoMedium.copyWith(fontSize: 22, color: color, fontWeight: FontWeight.w800)),
                    Text(' / ${_fmtNum(r.maxMarks)}', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight)),
                    const SizedBox(width: 8),
                    Text('(${r.passingMarks} to pass)', style: AppTextStyles.bodySmall.copyWith(fontSize: 10.5)),
                  ],
                ),
                Text(
                  '${(pct * 100).round()}%',
                  style: AppTextStyles.monoMedium.copyWith(color: color, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 7),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: pct.clamp(0.0, 1.0),
                minHeight: 7,
                backgroundColor: AppColors.surfaceMuted,
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
          ] else if (!hasMarks && !r.isGradeBased) ...[
            Text('Marks have not been published yet', style: AppTextStyles.bodySmall.copyWith(fontStyle: FontStyle.italic)),
          ],

          if (r.remarks != null && r.remarks!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(Icons.format_quote_rounded, size: 14, color: AppColors.inkLight),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      r.remarks!.trim(),
                      style: AppTextStyles.bodySmall.copyWith(fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT CARD WIDGET (MULTI-SUBJECT EXAMS)
// ─────────────────────────────────────────────────────────────────────────────

class _ReportCard extends StatelessWidget {
  final _ExamSummary summary;
  final String studentName;
  final String classLabel;
  final String? rollNo;

  const _ReportCard({
    required this.summary,
    required this.studentName,
    required this.classLabel,
    this.rollNo,
  });

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
          // Official Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: Space.md, horizontal: Space.md),
            decoration: BoxDecoration(gradient: AppColors.primaryGradient),
            child: Column(
              children: [
                Text(
                  SchoolBrand.schoolName.toUpperCase(),
                  style: AppTextStyles.labelLarge.copyWith(color: Colors.white, letterSpacing: 1.6),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 3),
                Text(
                  s.name,
                  style: AppTextStyles.h1.copyWith(color: Colors.white),
                  textAlign: TextAlign.center,
                ),
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
                      Icon(Icons.person_outline_rounded, size: 20, color: AppColors.inkLight),
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
                      if (rollNo != null && rollNo!.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text('Roll: $rollNo', style: AppTextStyles.labelSmall),
                        ),
                    ],
                  ),

                const SizedBox(height: Space.md),

                // Table Header
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

                // Subject Rows
                for (final r in s.subjects)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Text(r.subjectName, style: AppTextStyles.bodyLarge),
                        ),
                        Expanded(
                          flex: 2,
                          child: Text(
                            r.isAbsent
                                ? 'ABSENT'
                                : (r.isGradeBased
                                    ? (r.gradeObtained ?? '—')
                                    : (r.marksObtained == null
                                        ? '—'
                                        : '${_fmtNum(r.marksObtained!)} / ${_fmtNum(r.maxMarks)}')),
                            textAlign: TextAlign.right,
                            style: AppTextStyles.mono.copyWith(
                              fontWeight: FontWeight.w700,
                              color: r.isAbsent
                                  ? AppColors.red
                                  : ((!r.isGradeBased && r.marksObtained != null && !r.isPass)
                                      ? AppColors.red
                                      : AppColors.ink),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                Divider(color: AppColors.border),
                const SizedBox(height: Space.xs),

                // Aggregates
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
                        width: 50,
                        height: 50,
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
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: (s.passed ? AppColors.tealPale : AppColors.redPale),
                      borderRadius: BorderRadius.circular(Radii.sm),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          s.allAbsent
                              ? Icons.event_busy_rounded
                              : (s.passed ? Icons.verified_rounded : Icons.info_outline_rounded),
                          size: 18,
                          color: s.passed ? AppColors.teal : AppColors.red,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            s.allAbsent
                                ? 'Result: ABSENT'
                                : (s.passed
                                    ? 'Result: PASSED'
                                    : 'Below pass marks in ${s.failed.map((f) => f.subjectName).join(', ')}'),
                            style: AppTextStyles.labelLarge.copyWith(color: s.passed ? AppColors.teal : AppColors.red),
                            textAlign: TextAlign.center,
                          ),
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
