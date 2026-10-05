import 'package:flutter/material.dart';
import '../design/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'animated_button.dart';

/// primary  – indigo→violet gradient with a soft coloured glow (the main action)
/// accent   – warm amber, for a second call to action next to a primary one
/// ghost    – outlined
/// danger   – destructive, tinted
enum ButtonVariant { primary, accent, ghost, danger }

class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final ButtonVariant variant;
  final bool loading;
  final Widget? icon;
  final double? width;
  final double height;

  const CustomButton({
    super.key,
    required this.label,
    this.onTap,
    this.variant = ButtonVariant.primary,
    this.loading = false,
    this.icon,
    this.width,
    this.height = 54,
  });

  @override
  Widget build(BuildContext context) {
    final Color fg = switch (variant) {
      ButtonVariant.primary => Colors.white,
      // Amber is bright in both themes, so its label must stay dark in both.
      ButtonVariant.accent => Brand.night,
      ButtonVariant.ghost => AppColors.primaryMid,
      ButtonVariant.danger => AppColors.red,
    };

    final BoxDecoration decoration = switch (variant) {
      ButtonVariant.primary => BoxDecoration(
          gradient: AppColors.accentGradient,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Brand.accent.withValues(alpha: AppColors.isDark ? 0.35 : 0.40),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
      ButtonVariant.accent => BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Brand.highlight, Color(0xFFF59E0B)],
          ),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(color: const Color(0xFFF59E0B).withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 5)),
          ],
        ),
      ButtonVariant.ghost => BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.primaryMid, width: 1.5),
        ),
      ButtonVariant.danger => BoxDecoration(
          color: AppColors.redPale,
          borderRadius: BorderRadius.circular(10),
        ),
    };

    // A null onTap means "can't be pressed right now" (e.g. a form that isn't
    // valid yet) — show that, instead of a button that looks live but does nothing.
    final disabled = onTap == null && !loading;

    return Opacity(
      opacity: disabled ? 0.45 : 1,
      child: SizedBox(
        width: width ?? double.infinity,
        height: height,
        child: AnimatedTapButton(
          onTap: loading ? () {} : (onTap ?? () {}),
          child: Container(
            decoration: decoration,
            alignment: Alignment.center,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              switchInCurve: Curves.easeOutCubic,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: ScaleTransition(scale: Tween<double>(begin: 0.85, end: 1).animate(anim), child: child),
              ),
              child: loading
                  ? SizedBox(
                      key: const ValueKey('loading'),
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: fg),
                    )
                  : Row(
                      key: const ValueKey('label'),
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[icon!, const SizedBox(width: 8)],
                        Text(label, style: AppTextStyles.button.copyWith(color: fg)),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
