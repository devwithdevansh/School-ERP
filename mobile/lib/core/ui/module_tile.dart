import 'package:flutter/material.dart';
import '../design/motion.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'pressable.dart';

/// A module shortcut: icon + label, with an optional count badge or dot
/// that pops when it changes, and a quiet "SOON" tag for modules whose
/// backend isn't live yet.
class ModuleTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int badgeCount;
  final bool dot;
  final bool comingSoon;

  /// The user's role/assignment doesn't allow this module: dimmed with a lock.
  final bool locked;

  const ModuleTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.badgeCount = 0,
    this.dot = false,
    this.comingSoon = false,
    this.locked = false,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      pressedScale: 0.92,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  size: 24,
                  color: (comingSoon || locked)
                      ? AppColors.primary.withValues(alpha: 0.4)
                      : AppColors.primary,
                ),
              ),
              Positioned(
                top: -5,
                right: -6,
                child: AnimatedSwitcher(
                  duration: Motion.of(context, Motion.quick),
                  transitionBuilder: (child, anim) => ScaleTransition(
                    scale: CurvedAnimation(parent: anim, curve: Motion.pop),
                    child: child,
                  ),
                  child: _buildTag(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Scale a long label down to fit rather than letting it wrap
          // mid-word ("Attendanc / e") when five tiles share one row.
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              softWrap: false,
              style: AppTextStyles.labelLarge.copyWith(
                fontSize: 11.5,
                height: 1.2,
                color: (comingSoon || locked) ? AppColors.inkLight : AppColors.inkMid,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTag() {
    if (badgeCount > 0) {
      return Container(
        key: ValueKey('badge-$badgeCount'),
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
        constraints: const BoxConstraints(minWidth: 18),
        decoration: BoxDecoration(
          color: AppColors.accentDeep,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.white, width: 1.5),
        ),
        child: Text(
          badgeCount > 99 ? '99+' : '$badgeCount',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
        ),
      );
    }
    if (dot) {
      return Container(
        key: const ValueKey('dot'),
        width: 11,
        height: 11,
        decoration: BoxDecoration(
          color: AppColors.accentDeep,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.white, width: 2),
        ),
      );
    }
    if (locked) {
      return Container(
        key: const ValueKey('locked'),
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: AppColors.white,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(Icons.lock_rounded, size: 10, color: AppColors.inkLight),
      );
    }
    if (comingSoon) {
      return Container(
        key: const ValueKey('soon'),
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(
          'SOON',
          style: AppTextStyles.labelSmall.copyWith(
            fontSize: 7.5,
            fontWeight: FontWeight.w800,
            color: AppColors.accentDeep,
            letterSpacing: 0.6,
            height: 1.2,
          ),
        ),
      );
    }
    return const SizedBox.shrink(key: ValueKey('none'));
  }
}
