import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../data/models/student_model.dart';
import '../../profile/views/profile_view.dart';
import '../controllers/dashboard_controller.dart';
import 'section_eyebrow.dart';

/// Everything about the child: an identity card (which morphs into the
/// student profile) and academic shortcuts. Parents with more than one
/// child get a small row of name chips here — fees and details are stored
/// per child, so this is the only place a sibling can be picked.
class StudentSection extends StatelessWidget {
  final DashboardController controller;
  const StudentSection({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final s = controller.student.value;
      if (s == null) return const SizedBox.shrink();
      final firstName = s.name.trim().split(RegExp(r'\s+')).first;

      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: Space.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionEyebrow('STUDENT'),
            const SizedBox(height: 6),
            SectionHeader(title: "$firstName's school corner"),
            const SizedBox(height: 14),
            AnimatedSwitcher(
              duration: Motion.of(context, Motion.screen),
              switchInCurve: Motion.emphasized,
              switchOutCurve: Motion.exit,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: SlideTransition(
                  position: Tween(begin: const Offset(0.05, 0), end: Offset.zero).animate(anim),
                  child: child,
                ),
              ),
              child: _IdentityCard(key: ValueKey(s.id), student: s),
            ),

          ],
        ),
      );
    });
  }
}


class _IdentityCard extends StatelessWidget {
  final StudentModel student;
  const _IdentityCard({super.key, required this.student});

  @override
  Widget build(BuildContext context) {
    final s = student;
    return OpenContainer(
      tappable: false,
      transitionType: ContainerTransitionType.fadeThrough,
      transitionDuration: Motion.of(context, const Duration(milliseconds: 480)),
      closedElevation: 0,
      openElevation: 0,
      closedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.lg)),
      closedColor: AppColors.white,
      openColor: AppColors.bg,
      middleColor: AppColors.bg,
      openBuilder: (context, _) => const ProfileView(),
      closedBuilder: (context, open) => Pressable(
        onTap: open,
        pressedScale: 0.985,
        child: Container(
          padding: const EdgeInsets.all(Space.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(Radii.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              _StudentAvatar(student: s),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.h2,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Class ${s.standard}${s.division.isNotEmpty ? '-${s.division}' : ''} · ${s.medium} medium',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.bodySmall,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (s.studentCode.isNotEmpty)
                          StatusPill('ID ${s.studentCode}', icon: Icons.badge_outlined),
                        if (s.isRTE)
                          const StatusPill('RTE', tone: PillTone.brand, icon: Icons.verified_rounded),
                        if (s.hasTransport)
                          StatusPill(s.transportType, icon: Icons.directions_bus_rounded),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentAvatar extends StatelessWidget {
  final StudentModel student;
  const _StudentAvatar({required this.student});

  @override
  Widget build(BuildContext context) {
    final initials = Center(
      child: Text(
        student.initials,
        style: AppTextStyles.h2.copyWith(color: Colors.white),
      ),
    );
    return Container(
      width: 60,
      height: 60,
      padding: const EdgeInsets.all(2.5),
      decoration: BoxDecoration(shape: BoxShape.circle, gradient: AppColors.accentGradient),
      child: ClipOval(
        child: Container(
          color: Brand.deep,
          child: StudentImageWidget(
            photoUrl: student.photoUrl,
            width: 60,
            height: 60,
            fit: BoxFit.cover,
            fallback: initials,
          ),
        ),
      ),
    );
  }
}
