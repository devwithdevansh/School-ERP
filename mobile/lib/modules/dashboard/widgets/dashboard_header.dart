import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../../core/config/school_brand.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../controllers/dashboard_controller.dart';

/// Pinned, collapsing indigo header. Expanded it greets the parent over a slow
/// aurora of drifting colour with the brand mark; scrolled, it shrinks into a
/// compact bar while the mark and aurora drift down and fade a beat behind the
/// text, giving a gentle sense of depth.
class DashboardHeaderDelegate extends SliverPersistentHeaderDelegate {
  final DashboardController controller;
  final double topPadding;

  DashboardHeaderDelegate({required this.controller, required this.topPadding});

  static const double _expandedHeight = 184;
  static const double _collapsedHeight = 64;

  @override
  double get maxExtent => topPadding + _expandedHeight;

  @override
  double get minExtent => topPadding + _collapsedHeight;

  @override
  bool shouldRebuild(covariant DashboardHeaderDelegate old) =>
      old.topPadding != topPadding || old.controller != controller;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final collapse = (shrinkOffset / (maxExtent - minExtent)).clamp(0.0, 1.0);
    return _DashboardHeader(controller: controller, collapse: collapse, topPadding: topPadding);
  }
}

class _DashboardHeader extends StatelessWidget {
  final DashboardController controller;
  final double collapse;
  final double topPadding;

  const _DashboardHeader({
    required this.controller,
    required this.collapse,
    required this.topPadding,
  });

  static String get _greeting {
    final h = DateTime.now().hour;
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final t = collapse;
    final radius = Radius.circular(28 * (1 - t));
    final expandedOpacity = (1 - t * 1.8).clamp(0.0, 1.0);
    final compactOpacity = ((t - 0.55) / 0.45).clamp(0.0, 1.0);

    return ClipRRect(
      borderRadius: BorderRadius.only(bottomLeft: radius, bottomRight: radius),
      child: DecoratedBox(
        decoration: BoxDecoration(gradient: AppColors.primaryGradient),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // slow aurora behind everything
            Positioned(right: -50, top: -40 + 30 * t, child: _Orb(size: 210, color: Brand.accent, drift: const Offset(-18, 14), seconds: 7)),
            Positioned(left: -60, bottom: -70, child: _Orb(size: 190, color: Brand.accentDeep, drift: const Offset(20, -12), seconds: 9)),
            Positioned(
              left: 20,
              right: 150,
              top: topPadding + 62 - 24 * t,
              child: Opacity(
                opacity: expandedOpacity,
                child: _Greeting(controller: controller, greeting: _greeting),
              ),
            ),
            Positioned(
              left: 20,
              right: 16,
              top: topPadding,
              height: 64,
              child: Row(
                children: [
                  Expanded(
                    child: Opacity(
                      opacity: compactOpacity,
                      child: Obx(() => Text(
                            _displayName(controller) ?? SchoolBrand.schoolName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.h3.copyWith(color: Colors.white),
                          )),
                    ),
                  ),
                  _BellButton(controller: controller),
                  const SizedBox(width: 10),
                  _AvatarButton(controller: controller),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Who the header greets: the teacher while in the teacher view (a
/// teacher-only account has no students, so there's no parent name to fall
/// back on), otherwise the parent.
String? _displayName(DashboardController c) {
  if (c.activeProfile.value == 'teacher') {
    final teacher = c.teacherName.value.trim();
    if (teacher.isNotEmpty) return teacher;
  }
  final name = c.student.value?.parentName.trim() ?? '';
  return name.isEmpty ? null : name;
}

class _Greeting extends StatelessWidget {
  final DashboardController controller;
  final String greeting;

  const _Greeting({required this.controller, required this.greeting});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          greeting.toUpperCase(),
          style: AppTextStyles.labelSmall.copyWith(
            color: Colors.white.withValues(alpha: 0.6),
            letterSpacing: 1.6,
          ),
        ),
        const SizedBox(height: 6),
        Obx(() => Text(
              _displayName(controller) ?? 'Welcome back',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.displayMedium.copyWith(color: Colors.white, fontSize: 26),
            )),
        const SizedBox(height: 6),
        Text(
          DateFormat('EEEE, d MMMM').format(DateTime.now()),
          style: AppTextStyles.bodySmall.copyWith(color: Colors.white.withValues(alpha: 0.55)),
        ),
      ],
    );
  }
}

class _GlassCircle extends StatelessWidget {
  final Widget child;
  const _GlassCircle({required this.child});

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
          ),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _BellButton extends StatelessWidget {
  final DashboardController controller;
  const _BellButton({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: () async {
        await Get.toNamed(AppRoutes.notifications);
        controller.refreshNotifications();
      },
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          const _GlassCircle(
            child: Icon(Icons.notifications_none_rounded, color: Colors.white, size: 21),
          ),
          Positioned(
            top: -3,
            right: -3,
            child: Obx(() {
              final count = controller.unreadNotificationCount.value;
              return AnimatedSwitcher(
                duration: Motion.of(context, Motion.quick),
                transitionBuilder: (child, anim) => ScaleTransition(
                  scale: CurvedAnimation(parent: anim, curve: Motion.pop),
                  child: child,
                ),
                child: count > 0
                    ? Container(
                        key: ValueKey(count),
                        constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: Brand.accent,
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(color: Brand.deep, width: 1.5),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          count > 9 ? '9+' : '$count',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            height: 1,
                          ),
                        ),
                      )
                    : const SizedBox.shrink(key: ValueKey(0)),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _AvatarButton extends StatelessWidget {
  final DashboardController controller;
  const _AvatarButton({required this.controller});

  static String _initials(String? name) {
    if (name == null) return '?';
    final parts = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: () => Get.toNamed(AppRoutes.profile),
      child: Container(
        width: 42,
        height: 42,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.accentGradient,
        ),
        child: ClipOval(
          child: Container(
            color: Brand.deep,
            alignment: Alignment.center,
            child: Obx(() {
              final isTeacher = controller.activeProfile.value == 'teacher';
              final s = controller.student.value;
              final initialsText = Text(
                _initials(_displayName(controller)),
                style: AppTextStyles.labelLarge.copyWith(color: Colors.white, fontSize: 13),
              );

              if (!isTeacher && s != null) {
                return StudentImageWidget(
                  photoUrl: s.photoUrl,
                  width: 42,
                  height: 42,
                  fit: BoxFit.cover,
                  fallback: Center(child: initialsText),
                );
              }
              return Center(child: initialsText);
            }),
          ),
        ),
      ),
    );
  }
}

/// A soft radial blob that drifts back and forth forever (static when the OS
/// asks for reduced motion).
class _Orb extends StatelessWidget {
  final double size;
  final Color color;
  final Offset drift;
  final int seconds;

  const _Orb({required this.size, required this.color, required this.drift, required this.seconds});

  @override
  Widget build(BuildContext context) {
    final orb = IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color.withValues(alpha: 0.5), color.withValues(alpha: 0)]),
        ),
      ),
    );
    if (Motion.reduced(context)) return orb;
    return orb
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .move(begin: Offset.zero, end: drift, duration: Duration(seconds: seconds), curve: Curves.easeInOut)
        .scaleXY(begin: 1, end: 1.14, duration: Duration(seconds: seconds), curve: Curves.easeInOut);
  }
}
