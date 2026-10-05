import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

enum PillTone { neutral, brand, success, warning, danger }

class StatusPill extends StatelessWidget {
  final String label;
  final PillTone tone;
  final IconData? icon;

  const StatusPill(this.label, {super.key, this.tone = PillTone.neutral, this.icon});

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (tone) {
      PillTone.neutral => (AppColors.inkMid, AppColors.surfaceMuted),
      PillTone.brand => (AppColors.primary, AppColors.primaryLight),
      PillTone.success => (AppColors.teal, AppColors.tealPale),
      PillTone.warning => (AppColors.accentDeep, AppColors.accentPale),
      PillTone.danger => (AppColors.red, AppColors.redPale),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(label, style: AppTextStyles.labelSmall.copyWith(color: fg, letterSpacing: 0.3)),
        ],
      ),
    );
  }
}
