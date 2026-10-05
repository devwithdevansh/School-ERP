import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../core/utils/date_labels.dart';
import '../../../data/models/timetable_period_model.dart';

/// A day's periods as a vertical timeline: times on the left, a rail with
/// dots, and a card per period. On today's schedule the running period is
/// marked NOW and the following one NEXT.
///
/// [teacherView] swaps the secondary line from "teacher name" (what a
/// student cares about) to "class" (what a teacher cares about).
class PeriodTimeline extends StatelessWidget {
  final List<TimetablePeriodModel> periods;
  final bool isToday;
  final bool teacherView;

  const PeriodTimeline({
    super.key,
    required this.periods,
    required this.isToday,
    this.teacherView = false,
  });

  @override
  Widget build(BuildContext context) {
    final sorted = [...periods]
      ..sort((a, b) => (parseClock(a.startTime) ?? 0).compareTo(parseClock(b.startTime) ?? 0));

    final nowMin = minutesNow();
    int? nowIdx;
    int? nextIdx;
    if (isToday) {
      for (var i = 0; i < sorted.length; i++) {
        final s = parseClock(sorted[i].startTime);
        final e = parseClock(sorted[i].endTime);
        if (s == null || e == null || sorted[i].isBreak) continue;
        if (nowMin >= s && nowMin < e) {
          nowIdx = i;
        } else if (nowMin < s && nextIdx == null) {
          nextIdx = i;
        }
      }
    }

    return Column(
      children: [
        for (var i = 0; i < sorted.length; i++)
          _TimelineRow(
            period: sorted[i],
            isFirst: i == 0,
            isLast: i == sorted.length - 1,
            past: isToday && _isPast(sorted[i], nowMin),
            isNow: i == nowIdx,
            isNext: i == nextIdx,
            teacherView: teacherView,
          ),
      ],
    );
  }

  bool _isPast(TimetablePeriodModel p, int nowMin) {
    final e = parseClock(p.endTime);
    return e != null && nowMin >= e;
  }
}

class _TimelineRow extends StatelessWidget {
  final TimetablePeriodModel period;
  final bool isFirst;
  final bool isLast;
  final bool past;
  final bool isNow;
  final bool isNext;
  final bool teacherView;

  const _TimelineRow({
    required this.period,
    required this.isFirst,
    required this.isLast,
    required this.past,
    required this.isNow,
    required this.isNext,
    required this.teacherView,
  });

  @override
  Widget build(BuildContext context) {
    final dotColor = isNow ? AppColors.accentDeep : (past ? AppColors.fieldBorder : AppColors.primary);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(width: 62, child: _TimeColumn(period: period, muted: past && !isNow)),
          SizedBox(
            width: 26,
            child: Column(
              children: [
                Container(width: 2, height: 16, color: isFirst ? Colors.transparent : AppColors.border),
                Container(
                  width: isNow ? 14 : 11,
                  height: isNow ? 14 : 11,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: (isNow || period.isBreak) ? dotColor : AppColors.white,
                    border: Border.all(color: dotColor, width: 2),
                  ),
                ),
                Expanded(child: Container(width: 2, color: isLast ? Colors.transparent : AppColors.border)),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: period.isBreak
                  ? _BreakCard(period: period)
                  : _PeriodCard(
                      period: period,
                      past: past && !isNow,
                      isNow: isNow,
                      isNext: isNext,
                      teacherView: teacherView,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeColumn extends StatelessWidget {
  final TimetablePeriodModel period;
  final bool muted;
  const _TimeColumn({required this.period, required this.muted});

  (String, String) _split(String t) {
    final parts = t.trim().split(RegExp(r'\s+'));
    return (parts.first, parts.length > 1 ? parts[1].toUpperCase() : '');
  }

  @override
  Widget build(BuildContext context) {
    final (start, startAp) = _split(period.startTime);
    final color = muted ? AppColors.inkLight : AppColors.ink;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(
              text: start,
              style: AppTextStyles.labelLarge.copyWith(color: color, fontWeight: FontWeight.w700),
              children: [
                if (startAp.isNotEmpty)
                  TextSpan(
                    text: ' $startAp',
                    style: AppTextStyles.labelSmall.copyWith(color: color, letterSpacing: 0),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 2),
          Text('to ${period.endTime}', style: AppTextStyles.bodySmall.copyWith(fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _BreakCard extends StatelessWidget {
  final TimetablePeriodModel period;
  const _BreakCard({required this.period});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Space.md, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.accentPale,
        borderRadius: BorderRadius.circular(Radii.sm),
      ),
      child: Row(
        children: [
          Icon(Icons.free_breakfast_rounded, size: 16, color: AppColors.accentDeep),
          const SizedBox(width: 8),
          Text(period.periodName, style: AppTextStyles.labelLarge.copyWith(color: AppColors.accentDeep)),
        ],
      ),
    );
  }
}

class _PeriodCard extends StatelessWidget {
  final TimetablePeriodModel period;
  final bool past;
  final bool isNow;
  final bool isNext;
  final bool teacherView;

  const _PeriodCard({
    required this.period,
    required this.past,
    required this.isNow,
    required this.isNext,
    required this.teacherView,
  });

  @override
  Widget build(BuildContext context) {
    final subject = period.subjectName ?? period.periodName;
    final secondary = teacherView
        ? (period.classLabel.isNotEmpty ? 'Class ${period.classLabel}' : '')
        : (period.teacherName ?? '');

    final card = Container(
      padding: const EdgeInsets.all(Space.md - 2),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: isNow ? AppColors.accentDeep : AppColors.border, width: isNow ? 1.6 : 1),
        boxShadow: isNow ? Elevation.of(SurfaceLevel.raised) : null,
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: isNow ? AppColors.accentPale : AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              teacherView ? Icons.groups_rounded : Icons.menu_book_rounded,
              size: 20,
              color: isNow ? AppColors.accentDeep : AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  period.periodName.toUpperCase(),
                  style: AppTextStyles.labelSmall.copyWith(letterSpacing: 1.0),
                ),
                const SizedBox(height: 1),
                Row(
                  children: [
                    Flexible(
                      child: Text(subject, style: AppTextStyles.h3, maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    if (isNow) ...[
                      const SizedBox(width: 8),
                      const StatusPill('NOW', tone: PillTone.warning),
                    ] else if (isNext) ...[
                      const SizedBox(width: 8),
                      const StatusPill('NEXT', tone: PillTone.brand),
                    ],
                  ],
                ),
                if (secondary.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(
                        teacherView ? Icons.school_outlined : Icons.person_outline_rounded,
                        size: 14,
                        color: AppColors.inkLight,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(secondary, style: AppTextStyles.bodyMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    return past ? Opacity(opacity: 0.78, child: card) : card;
  }
}
