import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../design/spacing.dart';
import '../theme/app_colors.dart';

/// Theme-aware loading placeholder (the old ShimmerLoader was light-only).
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  final EdgeInsetsGeometry margin;

  const SkeletonBox({
    super.key,
    this.width,
    required this.height,
    this.radius = Radii.sm,
    this.margin = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin,
      child: Shimmer.fromColors(
        baseColor: AppColors.surfaceMuted,
        highlightColor: AppColors.isDark ? const Color(0xFF243357) : Colors.white,
        period: const Duration(milliseconds: 1400),
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),
    );
  }
}

/// A stack of card-shaped skeletons — the loading state for list screens.
class SkeletonList extends StatelessWidget {
  final int count;
  final double itemHeight;
  final EdgeInsetsGeometry padding;

  const SkeletonList({
    super.key,
    this.count = 4,
    this.itemHeight = 104,
    this.padding = const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: padding,
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: Space.sm),
      itemBuilder: (_, __) => SkeletonBox(height: itemHeight, radius: Radii.lg),
    );
  }
}
