import 'package:flutter/material.dart';
import '../design/spacing.dart';
import '../theme/app_colors.dart';
import 'pressable.dart';

/// The one card style used across the app.
class SurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double radius;
  final SurfaceLevel level;
  final Color? color;
  final bool outlined;

  const SurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.md),
    this.onTap,
    this.radius = Radii.lg,
    this.level = SurfaceLevel.raised,
    this.color,
    this.outlined = true,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.white,
        borderRadius: BorderRadius.circular(radius),
        border: outlined ? Border.all(color: AppColors.border) : null,
        boxShadow: Elevation.of(level),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return Pressable(onTap: onTap, pressedScale: 0.98, child: card);
  }
}
