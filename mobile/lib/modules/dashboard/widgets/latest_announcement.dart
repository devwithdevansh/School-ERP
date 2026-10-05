import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get/get.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/formatters.dart';
import '../controllers/dashboard_controller.dart';

/// One-line preview of the newest unread school update. Renders nothing
/// when everything has been read.
class LatestAnnouncement extends StatelessWidget {
  final DashboardController controller;
  const LatestAnnouncement({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sId = controller.student.value?.id;
      final unread = controller.notifications
          .where((n) => sId == null ? !n.isRead : !n.isReadFor(sId))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      if (unread.isEmpty) return const SizedBox.shrink();
      final latest = unread.first;

      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.lg),
        child: SurfaceCard(
          level: SurfaceLevel.flat,
          color: AppColors.accentPale,
          outlined: false,
          onTap: () async {
            await Get.toNamed(AppRoutes.notifications);
            controller.refreshNotifications();
          },
          child: Row(
            children: [
              const _LiveDot(),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      unread.length > 1 ? '${unread.length} NEW FROM SCHOOL' : 'NEW FROM SCHOOL',
                      style: AppTextStyles.labelSmall.copyWith(
                        color: AppColors.accentDeep,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      latest.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.labelLarge,
                    ),
                    if (latest.body.isNotEmpty)
                      Text(
                        latest.body,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.bodySmall,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(Formatters.timeAgo(latest.createdAt), style: AppTextStyles.bodySmall),
              Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
            ],
          ),
        ),
      );
    });
  }
}

class _LiveDot extends StatelessWidget {
  const _LiveDot();

  @override
  Widget build(BuildContext context) {
    final dot = Container(
      width: 9,
      height: 9,
      decoration: BoxDecoration(color: AppColors.accentDeep, shape: BoxShape.circle),
    );
    if (Motion.reduced(context)) return dot;
    return SizedBox(
      width: 22,
      height: 22,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: AppColors.accentDeep.withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
          )
              .animate(onPlay: (c) => c.repeat())
              .scaleXY(begin: 1, end: 2.4, duration: 1400.ms, curve: Curves.easeOut)
              .fadeOut(duration: 1400.ms),
          dot,
        ],
      ),
    );
  }
}
