import '../../../../core/config/client_context.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/date_labels.dart';
import '../../../../data/models/attendance_day_model.dart';
import '../../../../data/models/exam_result_model.dart';
import '../../../../data/models/homework_model.dart';
import '../../../../data/models/timetable_period_model.dart';
import '../../../../data/repositories/attendance_repository.dart';
import '../../../../data/repositories/homework_repository.dart';
import '../../../../data/repositories/results_repository.dart';
import '../../../../data/repositories/timetable_repository.dart';
import '../controllers/dashboard_controller.dart';

const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/// Auto-scrolling highlight cards at the very top of the dashboard —
/// latest result, nearest homework, and today's timetable, all real data
/// for the currently active child. Refetches whenever the active student
/// changes (switching siblings, or a pull-to-refresh reloading the same one).
class HighlightCarousel extends StatefulWidget {
  final DashboardController controller;
  const HighlightCarousel({super.key, required this.controller});

  @override
  State<HighlightCarousel> createState() => _HighlightCarouselState();
}

class _HighlightCarouselState extends State<HighlightCarousel> {
  final _resultsRepo = ResultsRepository();
  final _homeworkRepo = HomeworkRepository();
  final _timetableRepo = TimetableRepository();
  final _attendanceRepo = AttendanceRepository();

  late final PageController _page;
  Timer? _autoScroll;
  int _current = 0;
  Worker? _studentWorker;

  bool _loading = true;
  List<_HighlightData> _cards = [];

  @override
  void initState() {
    super.initState();
    _page = PageController(viewportFraction: 0.88);
    _load();
    _studentWorker = ever(widget.controller.student, (_) => _load());
  }

  Future<void> _load() async {
    final student = widget.controller.student.value;
    if (student == null) {
      if (mounted) setState(() { _loading = false; _cards = []; });
      return;
    }
    if (mounted) setState(() => _loading = true);

    // These are all Academics (ERP) data: skip the calls when the school hasn't licensed it.
    final erp = ClientContext.has('ERP');
    final results = erp ? await _resultsRepo.getResults(student.id) : <ExamResultModel>[];
    final homework = erp ? await _homeworkRepo.getHomework(student.id) : <HomeworkModel>[];
    final periods = erp ? await _timetableRepo.getTimetable(student.id) : <TimetablePeriodModel>[];
    final attendance = erp ? await _attendanceRepo.getAttendance(student.id) : <AttendanceDayModel>[];

    final cards = <_HighlightData>[];

    final recentAbsence = attendance.where((a) {
      final daysAgo = -daysUntil(a.date);
      return a.status == 'ABSENT' && daysAgo >= 0 && daysAgo <= 3;
    }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    if (recentAbsence.isNotEmpty) {
      final day = recentAbsence.first;
      final daysAgo = -daysUntil(day.date);
      final whenLabel = daysAgo == 0 ? 'today' : (daysAgo == 1 ? 'yesterday' : '$daysAgo days ago');
      cards.add(_HighlightData(
        type: _CardType.attendance,
        emoji: '📌',
        title: 'Marked Absent',
        subtitle: 'Your child was absent $whenLabel${day.remarks != null ? ' — ${day.remarks}' : ''}',
        gradient: const [Color(0xFFD9534F), Color(0xFF8B2E2A)],
      ));
    }

    if (results.isNotEmpty) {
      final latest = results.first; // backend sorts by createdAt desc
      cards.add(_HighlightData(
        type: _CardType.marks,
        emoji: '📊',
        title: '${latest.examName} Published',
        subtitle: '${latest.subjectName}: Scored ${latest.marksObtained ?? '-'}/${latest.maxMarks}',
        gradient: const [Color(0xFF4A90D9), Brand.deep],
      ));
    }

    final upcoming = homework.where((h) => !h.isOverdue).toList()
      ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    if (upcoming.isNotEmpty) {
      final next = upcoming.first;
      final days = daysUntil(next.dueDate);
      final dueText = days <= 0 ? 'Due today' : (days == 1 ? 'Due tomorrow' : 'Due in $days days');
      cards.add(_HighlightData(
        type: _CardType.homework,
        emoji: '📝',
        title: 'Homework: ${next.subjectName}',
        subtitle: '${next.title} ($dueText)',
        gradient: const [Color(0xFF2E9E6E), Color(0xFF1B6B47)],
      ));
    }

    final todayName = _days[DateTime.now().weekday - 1];
    final todayPeriods = periods.where((p) => p.dayOfWeek == todayName && !p.isBreak).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    if (todayPeriods.isNotEmpty) {
      cards.add(_HighlightData(
        type: _CardType.timetable,
        emoji: '📅',
        title: "Today's Timetable",
        subtitle: todayPeriods.map((p) => p.subjectName ?? p.periodName).join(' → '),
        gradient: const [Color(0xFF7B68AE), Color(0xFF4A3F78)],
      ));
    }

    if (!mounted) return;
    setState(() {
      _cards = cards;
      _loading = false;
      _current = 0;
    });
    if (_page.hasClients) _page.jumpToPage(0);
    _startAutoScroll();
  }

  void _startAutoScroll() {
    _autoScroll?.cancel();
    if (_cards.length <= 1) return;
    _autoScroll = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_page.hasClients || _cards.isEmpty) return;
      final next = (_current + 1) % _cards.length;
      _page.animateToPage(
        next,
        duration: const Duration(milliseconds: 500),
        curve: Motion.emphasized,
      );
    });
  }

  @override
  void dispose() {
    _autoScroll?.cancel();
    _studentWorker?.dispose();
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 140,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_cards.isEmpty) {
      return SizedBox(
        height: 140,
        child: _HighlightCard(
          data: _HighlightData(
            type: _CardType.timetable,
            emoji: '👋',
            title: 'Welcome back!',
            subtitle: "No new results, homework, or classes to show right now.",
            gradient: const [Brand.deep, Color(0xFF24407A)],
          ),
        ),
      );
    }
    return Column(
      children: [
        SizedBox(
          height: 140,
          child: PageView.builder(
            controller: _page,
            itemCount: _cards.length,
            onPageChanged: (i) => setState(() => _current = i),
            physics: const BouncingScrollPhysics(),
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: _HighlightCard(data: _cards[i]),
            ),
          ),
        ),
        if (_cards.length > 1) ...[
          const SizedBox(height: 12),
          _DotIndicator(count: _cards.length, current: _current),
        ],
      ],
    );
  }
}

// ─── Card data ───────────────────────────────────────────────

enum _CardType { marks, homework, timetable, attendance }

class _HighlightData {
  final _CardType type;
  final String emoji;
  final String title;
  final String subtitle;
  final List<Color> gradient;

  const _HighlightData({
    required this.type,
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.gradient,
  });
}

// ─── Card widget ─────────────────────────────────────────────

class _HighlightCard extends StatelessWidget {
  final _HighlightData data;
  const _HighlightCard({required this.data});

  IconData get _icon => switch (data.type) {
        _CardType.marks => Icons.emoji_events_rounded,
        _CardType.homework => Icons.menu_book_rounded,
        _CardType.timetable => Icons.calendar_today_rounded,
        _CardType.attendance => Icons.event_busy_rounded,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: data.gradient,
        ),
        borderRadius: BorderRadius.circular(Radii.lg),
        boxShadow: [
          BoxShadow(
            color: data.gradient.first.withValues(alpha: 0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Subtle background icon
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(
              _icon,
              size: 90,
              color: Colors.white.withValues(alpha: 0.08),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(Space.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Text(data.emoji, style: const TextStyle(fontSize: 26)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        data.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.h2.copyWith(
                          color: Colors.white,
                          fontSize: 17,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  data.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Dot indicator ───────────────────────────────────────────

class _DotIndicator extends StatelessWidget {
  final int count;
  final int current;
  const _DotIndicator({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: active ? 20 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.border,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
