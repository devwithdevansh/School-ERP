import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';

const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const _dayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/// Mon–Sat selector. Shows each weekday's date for the current week and a
/// dot under today, so it's obvious which column is "now".
class DayStrip extends StatelessWidget {
  final String selectedDay;
  final ValueChanged<String> onSelected;
  const DayStrip({super.key, required this.selectedDay, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final monday = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));

    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.md),
      child: Row(
        children: [
          for (var i = 0; i < timetableDays.length; i++) ...[
            Expanded(
              child: _DayTile(
                short: _dayShort[i],
                date: monday.add(Duration(days: i)).day,
                selected: timetableDays[i] == selectedDay,
                isToday: now.weekday == i + 1,
                onTap: () => onSelected(timetableDays[i]),
              ),
            ),
            if (i != timetableDays.length - 1) const SizedBox(width: 6),
          ],
        ],
      ),
    );
  }
}

class _DayTile extends StatelessWidget {
  final String short;
  final int date;
  final bool selected;
  final bool isToday;
  final VoidCallback onTap;
  const _DayTile({
    required this.short,
    required this.date,
    required this.selected,
    required this.isToday,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = selected ? AppColors.onPrimary : AppColors.ink;
    final sub = selected ? AppColors.onPrimary.withValues(alpha: 0.75) : AppColors.inkLight;
    return Pressable(
      onTap: onTap,
      pressedScale: 0.94,
      child: AnimatedContainer(
        duration: Motion.of(context, Motion.quick),
        curve: Motion.standard,
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? AppColors.primary : AppColors.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(short, style: AppTextStyles.labelSmall.copyWith(color: sub, letterSpacing: 0.3)),
            const SizedBox(height: 2),
            Text('$date', style: AppTextStyles.h3.copyWith(color: fg, height: 1.1)),
            const SizedBox(height: 4),
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isToday ? AppColors.accentDeep : Colors.transparent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
