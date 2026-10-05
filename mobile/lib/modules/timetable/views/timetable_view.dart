import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../core/utils/date_labels.dart';
import '../../../data/models/timetable_period_model.dart';
import '../../../data/repositories/timetable_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../widgets/day_strip.dart';
import '../widgets/period_timeline.dart';

class TimetableView extends StatefulWidget {
  const TimetableView({super.key});

  @override
  State<TimetableView> createState() => _TimetableViewState();
}

class _TimetableViewState extends State<TimetableView> {
  final _repo = TimetableRepository();
  late String _selectedDay;
  bool _loading = true;
  List<TimetablePeriodModel> _periods = [];

  @override
  void initState() {
    super.initState();
    final wd = DateTime.now().weekday;
    _selectedDay = timetableDays[wd <= 6 ? wd - 1 : 0];
    _load();
  }

  Future<void> _load() async {
    final studentId = Get.find<DashboardController>().student.value?.id;
    if (studentId == null || studentId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final periods = await _repo.getTimetable(studentId);
    if (!mounted) return;
    setState(() {
      _periods = periods;
      _loading = false;
    });
  }

  bool get _isToday {
    final wd = DateTime.now().weekday;
    return wd <= 6 && timetableDays[wd - 1] == _selectedDay;
  }

  @override
  Widget build(BuildContext context) {
    final studentName = Get.find<DashboardController>().student.value?.name;
    final day = _periods.where((p) => p.dayOfWeek == _selectedDay).toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(title: 'Timetable', subtitle: studentName),
      body: Column(
        children: [
          DayStrip(selectedDay: _selectedDay, onSelected: (d) => setState(() => _selectedDay = d)),
          Divider(height: 1, color: AppColors.border),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: _loading
                  ? const SkeletonList(count: 4, itemHeight: 72)
                  : day.isEmpty
                      ? SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: SizedBox(
                            height: MediaQuery.of(context).size.height * 0.5,
                            child: Center(
                              child: EmptyState(
                                icon: Icons.event_busy_rounded,
                                title: 'No periods',
                                message: 'Nothing is scheduled for $_selectedDay yet.',
                              ),
                            ),
                          ),
                        )
                      : ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
                          children: [
                            _DaySummary(periods: day, isToday: _isToday, dayName: _selectedDay),
                            const SizedBox(height: Space.md),
                            PeriodTimeline(periods: day, isToday: _isToday),
                          ],
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Today · 5 periods · 08:00 AM – 02:15 PM"
class _DaySummary extends StatelessWidget {
  final List<TimetablePeriodModel> periods;
  final bool isToday;
  final String dayName;
  const _DaySummary({required this.periods, required this.isToday, required this.dayName});

  @override
  Widget build(BuildContext context) {
    final classes = periods.where((p) => !p.isBreak).toList()
      ..sort((a, b) => (parseClock(a.startTime) ?? 0).compareTo(parseClock(b.startTime) ?? 0));
    final range = classes.isEmpty ? '' : '${classes.first.startTime} – ${classes.last.endTime}';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isToday ? 'Today' : dayName, style: AppTextStyles.h2),
              const SizedBox(height: 2),
              Text(
                '${classes.length} ${classes.length == 1 ? 'period' : 'periods'}${range.isEmpty ? '' : '  ·  $range'}',
                style: AppTextStyles.bodyMedium,
              ),
            ],
          ),
        ),
        if (isToday) const StatusPill('TODAY', tone: PillTone.warning, icon: Icons.today_rounded),
      ],
    );
  }
}
