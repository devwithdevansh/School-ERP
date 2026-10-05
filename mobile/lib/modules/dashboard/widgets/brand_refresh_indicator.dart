import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show CircularProgressIndicator;
import 'package:flutter/services.dart';
import '../../../../core/theme/app_colors.dart';

/// Pull-to-refresh: a small ring fills as you pull, a haptic ticks when you
/// pass the threshold, and it spins while data reloads.
class BrandRefreshIndicator extends StatefulWidget {
  final RefreshIndicatorMode mode;
  final double pulledExtent;
  final double triggerDistance;

  const BrandRefreshIndicator({
    super.key,
    required this.mode,
    required this.pulledExtent,
    required this.triggerDistance,
  });

  @override
  State<BrandRefreshIndicator> createState() => _BrandRefreshIndicatorState();
}

class _BrandRefreshIndicatorState extends State<BrandRefreshIndicator> {
  bool get _busy =>
      widget.mode == RefreshIndicatorMode.armed ||
      widget.mode == RefreshIndicatorMode.refresh;

  @override
  void didUpdateWidget(covariant BrandRefreshIndicator old) {
    super.didUpdateWidget(old);
    if (old.mode != RefreshIndicatorMode.armed && widget.mode == RefreshIndicatorMode.armed) {
      HapticFeedback.mediumImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    final pull = (widget.pulledExtent / widget.triggerDistance).clamp(0.0, 1.0);
    return Center(
      child: Opacity(
        opacity: (0.25 + pull).clamp(0.0, 1.0),
        child: Container(
          width: 36,
          height: 36,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.white,
            border: Border.all(color: AppColors.border),
          ),
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            value: _busy ? null : (0.1 + 0.9 * pull),
            color: AppColors.accent,
            backgroundColor: AppColors.surfaceMuted,
          ),
        ),
      ),
    );
  }
}
