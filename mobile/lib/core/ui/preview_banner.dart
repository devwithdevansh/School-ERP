import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Sits under the app bar on modules that show sample layouts ahead of the
/// real backend (Timetable, Homework, Results, Attendance, Messages, Leave
/// Request) — keeps the mock content honest without looking unfinished.
class PreviewBanner extends StatelessWidget {
  final String text;
  const PreviewBanner({super.key, this.text = 'Preview layout — sample data shown'});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      color: AppColors.accentPale,
      child: Row(
        children: [
          Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.accentDeep),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.labelSmall.copyWith(
                color: AppColors.accentDeep,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
