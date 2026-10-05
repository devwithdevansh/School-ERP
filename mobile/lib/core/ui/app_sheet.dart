import 'package:flutter/material.dart';
import '../design/spacing.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Opens a keyboard-safe modal bottom sheet with the app's standard chrome:
/// grab handle, title, themed surface, scrollable body capped at 90% height.
Future<T?> showAppSheet<T>({
  required BuildContext context,
  required String title,
  String? subtitle,
  required Widget child,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _AppSheet(title: title, subtitle: subtitle, child: child),
  );
}

class _AppSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  const _AppSheet({required this.title, required this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: media.size.height * 0.9),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(Radii.lg)),
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.fieldBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xs),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.h1),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!, style: AppTextStyles.bodyMedium),
                  ],
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.lg),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
