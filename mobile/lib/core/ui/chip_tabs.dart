import 'package:flutter/material.dart';
import '../design/motion.dart';
import '../design/spacing.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'pressable.dart';

/// Horizontally scrolling filter chips with an optional count per chip.
class ChipTabs extends StatelessWidget {
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;
  final List<int?>? counts;
  final EdgeInsetsGeometry padding;

  const ChipTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
    this.counts,
    this.padding = const EdgeInsets.fromLTRB(Space.md, Space.sm, Space.md, Space.xs),
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: padding,
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            _Chip(
              label: labels[i],
              count: counts != null && i < counts!.length ? counts![i] : null,
              selected: i == selected,
              onTap: () => onChanged(i),
            ),
            if (i != labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final int? count;
  final bool selected;
  final VoidCallback onTap;
  const _Chip({required this.label, required this.count, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final fg = selected ? AppColors.onPrimary : AppColors.inkMid;
    return Pressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: Motion.of(context, Motion.quick),
        curve: Motion.standard,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? AppColors.primary : AppColors.fieldBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: AppTextStyles.labelLarge.copyWith(fontSize: 12.5, color: fg)),
            if (count != null) ...[
              const SizedBox(width: 7),
              Container(
                constraints: const BoxConstraints(minWidth: 18),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.onPrimary.withValues(alpha: 0.18)
                      : AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.labelSmall.copyWith(color: fg, letterSpacing: 0),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Equal-width segmented switch for two or three views of the same screen.
class SegmentedTabs extends StatelessWidget {
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;

  const SegmentedTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              child: Pressable(
                onTap: () => onChanged(i),
                pressedScale: 0.98,
                child: AnimatedContainer(
                  duration: Motion.of(context, Motion.quick),
                  curve: Motion.standard,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: i == selected ? AppColors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: i == selected ? Elevation.of(SurfaceLevel.raised) : null,
                  ),
                  child: Text(
                    labels[i],
                    style: AppTextStyles.labelLarge.copyWith(
                      fontSize: 13,
                      color: i == selected ? AppColors.ink : AppColors.inkLight,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
