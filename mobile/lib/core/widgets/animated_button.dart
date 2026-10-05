import 'package:flutter/material.dart';
import '../ui/pressable.dart';

/// Legacy name kept so existing screens compile; delegates to [Pressable].
class AnimatedTapButton extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  final double scaleDownTo;
  final Duration duration;

  const AnimatedTapButton({
    super.key,
    required this.child,
    required this.onTap,
    this.scaleDownTo = 0.96,
    this.duration = const Duration(milliseconds: 150),
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      pressedScale: scaleDownTo,
      pressDuration: duration,
      child: child,
    );
  }
}
