import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/attendance_day_model.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';

enum _Day { present, absent, late, leave, weekend, future, none }

class AttendanceView extends StatefulWidget {
  const AttendanceView({super.key});

  @override
  State<AttendanceView> createState() => _AttendanceViewState();
}

class _AttendanceViewState extends State<AttendanceView> {
  final _repo = AttendanceRepository();
  late DateTime _month;
  static final DateTime _today = DateTime.now();
  bool _loading = true;
  StudentAttendanceReport? _report;
  List<AttendanceDayModel> _records = [];

  @override
  void initState() {
    super.initState();
    _month = DateTime(_today.year, _today.month);
    _load();
  }

  Future<void> _load() async {
    final studentId = Get.find<DashboardController>().student.value?.id;
    if (studentId == null || studentId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final report = await _repo.getStudentAttendanceReport(studentId, month: _month.month, year: _month.year);
    if (!mounted) return;
    setState(() {
      _report = report;
      _records = report.records;
      _loading = false;
    });
  }

  Map<int, _Day> get _statuses {
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final isCurrentMonth = _month.year == _today.year && _month.month == _today.month;
    final byDay = <int, AttendanceDayModel>{
      for (final r in _records) r.date.day: r,
    };
    final map = <int, _Day>{};
    for (var d = 1; d <= daysInMonth; d++) {
      final date = DateTime(_month.year, _month.month, d);
      if (isCurrentMonth && date.isAfter(_today)) {
        map[d] = _Day.future;
      } else if (date.weekday == DateTime.sunday) {
        map[d] = _Day.weekend;
      } else {
        final rec = byDay[d];
        if (rec == null) {
          map[d] = _Day.none;
        } else {
          map[d] = switch (rec.status) {
            'ABSENT' => _Day.absent,
            'LATE' => _Day.late,
            'LEAVE' => _Day.leave,
            _ => _Day.present,
          };
        }
      }
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final statuses = _statuses;
    final counted = statuses.values.where((s) => s == _Day.present || s == _Day.absent || s == _Day.late).toList();
    final monthPresent = counted.where((s) => s == _Day.present || s == _Day.late).length;
    final monthAbsent = counted.where((s) => s == _Day.absent).length;
    final monthLeave = statuses.values.where((s) => s == _Day.leave).length;
    final monthPct = counted.isEmpty ? 0.0 : monthPresent / counted.length;

    // Overall session summary from report
    final summary = _report?.summary ?? AttendanceSummary(
      totalDays: counted.length,
      presentDays: monthPresent,
      absentDays: monthAbsent,
      leaveDays: monthLeave,
      percentage: (monthPct * 100).roundToDouble(),
    );

    final sessionPct = (summary.percentage / 100).clamp(0.0, 1.0);
    final absentList = _report?.absentHistory ?? [];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(
        title: 'Attendance',
        subtitle: Get.find<DashboardController>().student.value?.name,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  // ─────────────────────────────────────────────────────────────
                  // 1. OVERALL SESSION DAYS COUNT CARD
                  // ─────────────────────────────────────────────────────────────
                  SurfaceCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'SESSION SUMMARY',
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: AppColors.inkLight,
                                  letterSpacing: 1.0,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: sessionPct >= 0.75
                                    ? AppColors.tealPale
                                    : AppColors.redPale,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                sessionPct >= 0.75 ? 'GOOD STANDING' : 'LOW ATTENDANCE',
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: sessionPct >= 0.75 ? AppColors.teal : AppColors.red,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 9.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            ProgressRing(
                              progress: sessionPct,
                              size: 78,
                              strokeWidth: 8,
                              color: sessionPct >= 0.85
                                  ? AppColors.teal
                                  : (sessionPct >= 0.75 ? AppColors.accentDeep : AppColors.red),
                              center: Text(
                                '${summary.percentage.toStringAsFixed(1)}%',
                                style: AppTextStyles.mono.copyWith(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            const SizedBox(width: 18),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${summary.totalDays} Total Days',
                                    style: AppTextStyles.h2.copyWith(fontSize: 20),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Recorded working days in session',
                                    style: AppTextStyles.bodySmall.copyWith(fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                        // 4-stat counters
                        Row(
                          children: [
                            _DayCounterBox(
                              label: 'PRESENT',
                              value: summary.presentDays,
                              color: AppColors.teal,
                              icon: Icons.check_circle_outline_rounded,
                            ),
                            const SizedBox(width: 8),
                            _DayCounterBox(
                              label: 'ABSENT',
                              value: summary.absentDays,
                              color: AppColors.red,
                              icon: Icons.highlight_off_rounded,
                            ),
                            const SizedBox(width: 8),
                            _DayCounterBox(
                              label: 'LEAVE',
                              value: summary.leaveDays,
                              color: AppColors.primary,
                              icon: Icons.event_busy_rounded,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ─────────────────────────────────────────────────────────────
                  // 2. MONTH SELECTOR & CALENDAR VIEW
                  // ─────────────────────────────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.chevron_left_rounded),
                        color: AppColors.ink,
                        onPressed: () {
                          setState(() => _month = DateTime(_month.year, _month.month - 1));
                          _load();
                        },
                      ),
                      Text(_monthLabel(_month), style: AppTextStyles.h3),
                      IconButton(
                        icon: const Icon(Icons.chevron_right_rounded),
                        color: _month.year == _today.year && _month.month == _today.month
                            ? AppColors.border
                            : AppColors.ink,
                        onPressed: _month.year == _today.year && _month.month == _today.month
                            ? null
                            : () {
                                setState(() => _month = DateTime(_month.year, _month.month + 1));
                                _load();
                              },
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  SurfaceCard(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _CalendarGrid(month: _month, statuses: statuses),
                        const SizedBox(height: 14),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'This month: ${counted.length} days',
                                style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _StatChip(label: 'Present', value: monthPresent, color: AppColors.teal),
                                const SizedBox(width: 4),
                                _StatChip(label: 'Absent', value: monthAbsent, color: AppColors.red),
                                if (monthLeave > 0) ...[
                                  const SizedBox(width: 4),
                                  _StatChip(label: 'Leave', value: monthLeave, color: AppColors.primary),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  Wrap(
                    spacing: 14,
                    runSpacing: 8,
                    children: [
                      _LegendDot(color: AppColors.teal, label: 'Present'),
                      _LegendDot(color: AppColors.red, label: 'Absent'),
                      _LegendDot(color: AppColors.inkLight, label: 'Holiday / Weekend'),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ─────────────────────────────────────────────────────────────
                  // 3. ABSENCE REGISTER & HISTORY (SPECIFIC DATES OF ABSENCE)
                  // ─────────────────────────────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'ABSENCE HISTORY',
                          style: AppTextStyles.labelSmall.copyWith(
                            letterSpacing: 1.0,
                            color: AppColors.inkLight,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: absentList.isEmpty ? AppColors.tealPale : AppColors.redPale,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${absentList.length} Day${absentList.length == 1 ? '' : 's'} Absent',
                          style: AppTextStyles.labelSmall.copyWith(
                            color: absentList.isEmpty ? AppColors.teal : AppColors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  if (absentList.isEmpty)
                    SurfaceCard(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.tealPale,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.verified_rounded, color: AppColors.teal, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('100% Attendance', style: AppTextStyles.h3),
                                const SizedBox(height: 2),
                                Text(
                                  'Great job! No absent days recorded so far.',
                                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: absentList.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final item = absentList[i];
                        final dateStr = DateFormat('EEEE, dd MMMM yyyy').format(item.date);
                        return SurfaceCard(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: AppColors.redPale,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(Icons.event_busy_rounded, color: AppColors.red, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      dateStr,
                                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      item.remarks != null && item.remarks!.trim().isNotEmpty
                                          ? 'Reason: ${item.remarks!.trim()}'
                                          : 'Marked absent by teacher',
                                      style: AppTextStyles.bodySmall.copyWith(
                                        color: item.remarks != null && item.remarks!.trim().isNotEmpty
                                            ? AppColors.ink
                                            : AppColors.inkLight,
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.redPale,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'ABSENT',
                                  style: AppTextStyles.labelSmall.copyWith(
                                    color: AppColors.red,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),

                  const SizedBox(height: 24),
                ],
              ),
      ),
    );
  }

  static String _monthLabel(DateTime d) {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return '${names[d.month]} ${d.year}';
  }
}

class _DayCounterBox extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;

  const _DayCounterBox({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 11, color: color),
                const SizedBox(width: 3),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.labelSmall.copyWith(
                      color: color,
                      fontSize: 9.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '$value',
              style: AppTextStyles.monoMedium.copyWith(
                color: color,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(
        '$value $label',
        maxLines: 1,
        style: AppTextStyles.labelSmall.copyWith(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(label, style: AppTextStyles.bodySmall),
    ]);
  }
}

class _CalendarGrid extends StatelessWidget {
  final DateTime month;
  final Map<int, _Day> statuses;
  const _CalendarGrid({required this.month, required this.statuses});

  @override
  Widget build(BuildContext context) {
    final firstWeekday = DateTime(month.year, month.month, 1).weekday % 7; // Sunday = 0
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final today = DateTime.now();
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    final cells = <Widget>[];
    for (final l in labels) {
      cells.add(Center(child: Text(l, style: AppTextStyles.labelSmall.copyWith(fontSize: 10))));
    }
    for (var i = 0; i < firstWeekday; i++) {
      cells.add(const SizedBox.shrink());
    }
    for (var d = 1; d <= daysInMonth; d++) {
      final status = statuses[d] ?? _Day.none;
      final isToday = month.year == today.year && month.month == today.month && d == today.day;
      cells.add(_DayCell(day: d, status: status, isToday: isToday));
    }

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 6,
      crossAxisSpacing: 4,
      children: cells,
    );
  }
}

class _DayCell extends StatelessWidget {
  final int day;
  final _Day status;
  final bool isToday;
  const _DayCell({required this.day, required this.status, required this.isToday});

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      _Day.present || _Day.late => (AppColors.tealPale, AppColors.teal),
      _Day.absent => (AppColors.redPale, AppColors.red),
      _Day.leave || _Day.weekend => (AppColors.surfaceMuted, AppColors.inkLight),
      _Day.future || _Day.none => (Colors.transparent, AppColors.inkLight),
    };

    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        margin: const EdgeInsets.all(1),
        decoration: BoxDecoration(
          color: bg,
          shape: BoxShape.circle,
          border: isToday ? Border.all(color: AppColors.primary, width: 1.6) : null,
        ),
        alignment: Alignment.center,
        child: Text('$day', style: AppTextStyles.labelSmall.copyWith(color: fg, fontSize: 11)),
      ),
    );
  }
}
