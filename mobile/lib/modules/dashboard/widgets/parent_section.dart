import 'dart:math' as math;
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get/get.dart';
import '../../../../core/config/client_context.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../data/models/fee_model.dart';
import '../../fees/fee_summary/views/fee_summary_view.dart';
import '../controllers/dashboard_controller.dart';
import 'section_eyebrow.dart';

/// Everything the parent acts on: the fees hero card (the one thing most
/// parents open the app for) and shortcuts to receipts, history, school
/// updates, leave and messages.
class ParentSection extends StatelessWidget {
  final DashboardController controller;
  const ParentSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionEyebrow('PARENT'),
          const SizedBox(height: 6),
          const SectionHeader(title: 'Fees & school updates'),
          const SizedBox(height: 14),
          // Fees and its shortcuts only when the organization licensed the Fees module; leave/messages need ERP.
          if (ClientContext.has('FEES')) ...[
            _FeesHeroCard(controller: controller),
            const SizedBox(height: 14),
          ],
          SurfaceCard(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 6),
            child: Obx(() {
              final unread = controller.unreadNotificationCount.value;
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (ClientContext.has('FEES'))
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.receipt_long_rounded,
                        label: 'Receipts',
                        onTap: () => Get.toNamed(AppRoutes.receiptDetails),
                      ),
                    ),
                  if (ClientContext.has('FEES'))
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.campaign_outlined,
                        label: 'Updates',
                        badgeCount: unread,
                        onTap: () async {
                          await Get.toNamed(AppRoutes.notifications);
                          controller.refreshNotifications();
                        },
                      ),
                    ),
                  if (ClientContext.has('ERP'))
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.event_busy_rounded,
                        label: 'Leave request',
                        onTap: () => Get.toNamed(AppRoutes.leaveRequest),
                      ),
                    ),
                  if (ClientContext.has('ERP'))
                    Expanded(
                      child: ModuleTile(
                        icon: Icons.chat_bubble_outline_rounded,
                        label: 'Messages',
                        onTap: () => Get.toNamed(AppRoutes.messages),
                      ),
                    ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _FeesHeroCard extends StatelessWidget {
  final DashboardController controller;
  const _FeesHeroCard({required this.controller});

  static const _radius = Radii.lg;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(_radius),
        boxShadow: Elevation.of(SurfaceLevel.floating),
      ),
      child: OpenContainer(
        tappable: false,
        transitionType: ContainerTransitionType.fadeThrough,
        transitionDuration: Motion.of(context, const Duration(milliseconds: 480)),
        closedElevation: 0,
        openElevation: 0,
        closedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
        closedColor: AppColors.white,
        openColor: AppColors.bg,
        middleColor: AppColors.bg,
        openBuilder: (context, _) => const FeeSummaryView(),
        closedBuilder: (context, open) => Pressable(
          onTap: open,
          pressedScale: 0.985,
          child: Container(
            padding: const EdgeInsets.all(Space.lg),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(_radius),
              border: Border.all(color: AppColors.border),
            ),
            child: Obx(() => AnimatedOpacity(
                  opacity: controller.isLoading.value ? 0.55 : 1,
                  duration: Motion.of(context, Motion.quick),
                  child: _content(context),
                )),
          ),
        ),
      ),
    );
  }

  Widget _content(BuildContext context) {
    final pending = controller.totalPending.value;
    final total = controller.totalFees.value;
    final paid = controller.totalPaid.value;
    final fees = controller.mainFees;
    final cleared = pending <= 0;
    final progress = total > 0 ? (paid / total).clamp(0.0, 1.0) : (cleared ? 1.0 : 0.0);
    final overdue = fees.any((f) => f.isOverdue);
    final next = _nextDue(fees);

    final (pillLabel, pillTone, pillIcon) = cleared
        ? ('All clear', PillTone.success, Icons.check_rounded)
        : overdue
            ? ('Overdue', PillTone.danger, Icons.schedule_rounded)
            : ('Due', PillTone.warning, Icons.schedule_rounded);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        cleared ? 'Fees this year' : 'Total due',
                        style: AppTextStyles.bodySmall,
                      ),
                      const SizedBox(width: 8),
                      StatusPill(pillLabel, tone: pillTone, icon: pillIcon),
                    ],
                  ),
                  const SizedBox(height: 8),
                  AmountText(
                    cleared ? total : pending,
                    style: AppTextStyles.monoLarge.copyWith(fontSize: 30),
                  ),
                  const SizedBox(height: 6),
                  _nextDueLine(next, cleared),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _FeeRing(progress: progress, cleared: cleared),
          ],
        ),
        const SizedBox(height: 18),
        if (cleared)
          _PillButton(
            label: 'View receipts',
            icon: Icons.receipt_long_rounded,
            filled: false,
            onTap: () => Get.toNamed(AppRoutes.receiptDetails),
          )
        else
          Row(
            children: [
              Expanded(
                flex: 3,
                child: _PillButton(
                  label: 'Pay now',
                  icon: Icons.bolt_rounded,
                  filled: true,
                  onTap: () => Get.toNamed(AppRoutes.pendingFees),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: _PillButton(
                  label: 'Details',
                  icon: Icons.segment_rounded,
                  filled: false,
                  onTap: () => Get.toNamed(AppRoutes.feeSummary),
                ),
              ),
            ],
          ),
      ],
    );
  }

  static FeeModel? _nextDue(List<FeeModel> fees) {
    final unpaid = fees.where((f) => !f.isPaid && f.remainingAmount > 0).toList();
    if (unpaid.isEmpty) return null;
    final far = DateTime(9999);
    unpaid.sort((a, b) =>
        (DateTime.tryParse(a.dueDate) ?? far).compareTo(DateTime.tryParse(b.dueDate) ?? far));
    return unpaid.first;
  }

  static String _feeLabel(FeeModel f) {
    if (f.termName.isNotEmpty) return f.termName;
    return switch (f.feeType) {
      'EDUCATION' => 'Tuition',
      'TRANSPORT' => 'Transport',
      'TERM' => 'Term fee',
      _ => 'Fee',
    };
  }

  Widget _nextDueLine(FeeModel? next, bool cleared) {
    if (cleared || next == null) {
      return Text('Every fee is paid — thank you!', style: AppTextStyles.bodySmall);
    }
    final hasDate = next.dueDate.isNotEmpty;
    final when = hasDate ? Formatters.dateShort(next.dueDate) : null;
    final text = next.isOverdue
        ? '${_feeLabel(next)} was due $when'
        : when != null
            ? 'Next: ${_feeLabel(next)} · due $when'
            : 'Next: ${_feeLabel(next)}';
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: AppTextStyles.bodySmall.copyWith(
        color: next.isOverdue ? AppColors.red : AppColors.inkLight,
        fontWeight: next.isOverdue ? FontWeight.w600 : FontWeight.w400,
      ),
    );
  }
}

class _FeeRing extends StatelessWidget {
  final double progress;
  final bool cleared;
  const _FeeRing({required this.progress, required this.cleared});

  @override
  Widget build(BuildContext context) {
    final reduce = Motion.reduced(context);
    return SizedBox(
      width: 88,
      height: 88,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: reduce ? progress : 0, end: progress),
        duration: reduce ? Duration.zero : const Duration(milliseconds: 1100),
        curve: Motion.emphasized,
        builder: (context, v, _) => CustomPaint(
          painter: _RingPainter(value: v, track: AppColors.surfaceMuted, cleared: cleared),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${(v * 100).round()}%',
                  style: AppTextStyles.mono.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                Text('paid', style: AppTextStyles.labelSmall.copyWith(fontSize: 9.5, height: 1.1)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final Color track;
  final bool cleared;

  const _RingPainter({required this.value, required this.track, required this.cleared});

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 8.0;
    final rect = (Offset.zero & size).deflate(stroke / 2);
    canvas.drawArc(
      rect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = track,
    );
    final sweep = math.pi * 2 * value.clamp(0.0, 1.0);
    if (sweep <= 0) return;
    canvas.drawArc(
      rect,
      -math.pi / 2,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = SweepGradient(
          colors: cleared
              ? [AppColors.teal, AppColors.teal]
              : const [Brand.highlight, Brand.accent, Brand.accentDeep],
          transform: const GradientRotation(-math.pi / 2),
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value || old.track != track || old.cleared != cleared;
}

class _PillButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool filled;
  final VoidCallback onTap;

  const _PillButton({
    required this.label,
    required this.icon,
    required this.filled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = filled ? Colors.white : AppColors.ink;
    Widget button = Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: filled ? Brand.accent : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(10),
        boxShadow: filled
            ? [
                BoxShadow(
                  color: Brand.accent.withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.button.copyWith(color: fg, fontSize: 14),
            ),
          ),
        ],
      ),
    );

    // A slow shine across "Pay now" draws the eye without nagging.
    if (filled && !Motion.reduced(context)) {
      button = button
          .animate(onPlay: (c) => c.repeat())
          .shimmer(
            delay: 2600.ms,
            duration: 1400.ms,
            color: Colors.white.withValues(alpha: 0.35),
          );
    }

    return Pressable(onTap: onTap, child: button);
  }
}
