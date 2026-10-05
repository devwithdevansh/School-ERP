import 'package:flutter/material.dart';
import '../design/spacing.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'surface_card.dart';

/// A compact number-plus-label tile for summary strips ("3 Pending").
class StatTile extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color? tone;

  /// Stacked layout for rows of three or more tiles, where the icon badge
  /// beside the text would leave too little width for the label.
  final bool compact;

  const StatTile({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.tone,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = tone ?? AppColors.primary;
    if (compact) {
      return SurfaceCard(
        padding: const EdgeInsets.symmetric(horizontal: Space.sm + 2, vertical: Space.sm + 2),
        level: SurfaceLevel.flat,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(icon, size: 17, color: color),
                const SizedBox(width: 6),
                Text(value, style: AppTextStyles.h2.copyWith(height: 1.1)),
              ],
            ),
            const SizedBox(height: 2),
            Text(label, style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      );
    }
    return SurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: Space.sm + 2, vertical: Space.sm + 2),
      level: SurfaceLevel.flat,
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: AppColors.isDark ? 0.18 : 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(value, style: AppTextStyles.h2.copyWith(height: 1.1)),
                Text(label, style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
