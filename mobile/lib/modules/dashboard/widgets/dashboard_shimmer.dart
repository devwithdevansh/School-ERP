import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/ui/ui.dart';

/// First-load skeleton that mirrors the real dashboard layout, so content
/// appears in place rather than jumping around.
class DashboardShimmer extends StatelessWidget {
  const DashboardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      children: [
        Container(
          height: top + 184,
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(18)),
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(Space.lg, 24, Space.lg, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 70, height: 10),
              SizedBox(height: 10),
              SkeletonBox(width: 190, height: 20),
              SizedBox(height: 16),
              SkeletonBox(height: 168, radius: Radii.lg),
              SizedBox(height: 14),
              SkeletonBox(height: 104, radius: Radii.lg),
              SizedBox(height: 32),
              SkeletonBox(width: 70, height: 10),
              SizedBox(height: 10),
              SkeletonBox(width: 210, height: 20),
              SizedBox(height: 16),
              SkeletonBox(height: 96, radius: Radii.lg),
            ],
          ),
        ),
      ],
    );
  }
}
