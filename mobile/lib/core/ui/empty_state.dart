import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../design/motion.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../widgets/custom_button.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    Widget badge = Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
      child: Icon(icon, size: 38, color: AppColors.primary),
    );
    if (!Motion.reduced(context)) {
      badge = badge
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .moveY(begin: 0, end: -6, duration: 1800.ms, curve: Curves.easeInOut);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          badge,
          const SizedBox(height: 20),
          Text(title, style: AppTextStyles.h2, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(message, style: AppTextStyles.bodyMedium, textAlign: TextAlign.center),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 24),
            CustomButton(label: actionLabel!, onTap: onAction!),
          ],
        ],
      ),
    );
  }
}
