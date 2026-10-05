import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../design/motion.dart';
import '../theme/app_colors.dart';

/// A circular progress ring that draws itself in on first appearance.
/// Shared by the dashboard fee card, Pending Fees, Attendance and Results.
class ProgressRing extends StatelessWidget {
  final double progress;
  final double size;
  final double strokeWidth;
  final Color? trackColor;
  final Gradient? gradient;
  final Color? color;
  final Widget? center;
  final bool animate;

  const ProgressRing({
    super.key,
    required this.progress,
    this.size = 88,
    this.strokeWidth = 8,
    this.trackColor,
    this.gradient,
    this.color,
    this.center,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final reduce = Motion.reduced(context) || !animate;
    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: reduce ? progress : 0, end: progress),
        duration: reduce ? Duration.zero : const Duration(milliseconds: 1100),
        curve: Motion.emphasized,
        builder: (context, v, _) => CustomPaint(
          painter: _RingPainter(
            value: v,
            strokeWidth: strokeWidth,
            track: trackColor ?? AppColors.surfaceMuted,
            gradient: gradient,
            color: color ?? AppColors.primary,
          ),
          child: center == null ? null : Center(child: center),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final double strokeWidth;
  final Color track;
  final Gradient? gradient;
  final Color color;

  const _RingPainter({
    required this.value,
    required this.strokeWidth,
    required this.track,
    required this.gradient,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(strokeWidth / 2);
    canvas.drawArc(
      rect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..color = track,
    );
    final sweep = math.pi * 2 * value.clamp(0.0, 1.0);
    if (sweep <= 0) return;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    if (gradient != null) {
      paint.shader = gradient!.createShader(rect);
    } else {
      paint.color = color;
    }
    canvas.drawArc(rect, -math.pi / 2, sweep, false, paint);
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value || old.track != track || old.color != color || old.gradient != gradient;
}
