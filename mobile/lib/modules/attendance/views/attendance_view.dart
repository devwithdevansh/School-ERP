import 'package:flutter/material.dart';
import 'package:get/get.dart';
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
    final records = await _repo.getAttendance(studentId, month: _month.month, year: _month.year);
    if (!mounted) return;
    setState(() {
      _records = records;
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
    final present = counted.where((s) => s == _Day.present || s == _Day.late).length;
    final absent = counted.where((s) => s == _Day.absent).length;
    final onLeave = statuses.values.where((s) => s == _Day.leave).length;
    final pct = counted.isEmpty ? 0.0 : present / counted.length;

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
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SurfaceCard(
                          child: Row(
                            children: [
                              ProgressRing(
                                progress: pct,
                                size: 80,
                                strokeWidth: 8,
                                color: pct >= 0.85 ? AppColors.teal : AppColors.accentDeep,
                                center: Text('${(pct * 100).round()}%',
                                    style: AppTextStyles.mono.copyWith(fontSize: 16, fontWeight: FontWeight.w800)),
                              ),
                              const SizedBox(width: 18),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('This month', style: AppTextStyles.bodySmall),
                                    const SizedBox(height: 4),
                                    Text('${counted.length} school days', style: AppTextStyles.h3),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        _StatChip(label: 'Present', value: present, color: AppColors.teal),
                                        const SizedBox(width: 8),
                                        _StatChip(label: 'Absent', value: absent, color: AppColors.red),
                                        const SizedBox(width: 8),
                                        _StatChip(label: 'Leave', value: onLeave, color: AppColors.inkLight),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
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
                        SurfaceCard(child: _CalendarGrid(month: _month, statuses: statuses)),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 14,
                          runSpacing: 8,
                          children: [
                            _LegendDot(color: AppColors.teal, label: 'Present'),
                            _LegendDot(color: AppColors.red, label: 'Absent'),
                            _LegendDot(color: AppColors.inkLight, label: 'Holiday / Weekend'),
                          ],
                        ),
                      ],
                    ),
                  ),
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

class _StatChip extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text('$value $label', style: AppTextStyles.labelSmall.copyWith(color: color, fontSize: 10)),
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
