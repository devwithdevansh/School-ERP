import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';

/// "— PARENT" / "— STUDENT" label that opens each dashboard section. The
/// short orange rule echoes the "— CONNECT —" lockup in the logo.
class SectionEyebrow extends StatelessWidget {
  final String label;
  const SectionEyebrow(this.label, {super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 2,
          decoration: BoxDecoration(
            color: AppColors.accentDeep,
            borderRadius: BorderRadius.circular(1),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: AppTextStyles.labelSmall.copyWith(
            color: AppColors.accentDeep,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.8,
          ),
        ),
      ],
    );
  }
}
