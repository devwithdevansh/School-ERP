import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/sound_service.dart';
import '../design/motion.dart';

/// The app's single tap primitive: presses in on touch, springs slightly
/// past rest on release, and fires a light haptic (plus an optional sound).
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double pressedScale;
  final bool haptic;
  final AppSound? sound;
  final Duration? pressDuration;

  const Pressable({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.pressedScale = 0.96,
    this.haptic = true,
    this.sound,
    this.pressDuration,
  });

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.pressDuration ?? Motion.press,
    reverseDuration: const Duration(milliseconds: 320),
  );

  late final Animation<double> _scale = Tween<double>(
    begin: 1.0,
    end: widget.pressedScale,
  ).animate(CurvedAnimation(
    parent: _controller,
    curve: Motion.standard,
    reverseCurve: Motion.springBack,
  ));

  bool get _enabled => widget.onTap != null || widget.onLongPress != null;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _down(TapDownDetails _) {
    if (!_enabled || Motion.reduced(context)) return;
    _controller.forward();
  }

  void _up(TapUpDetails _) {
    if (!_enabled) return;
    if (!Motion.reduced(context)) {
      // Make sure even a very quick tap reaches full depth before springing back.
      _controller.forward().whenCompleteOrCancel(() {
        if (mounted) _controller.reverse();
      });
    }
    if (widget.haptic) HapticFeedback.selectionClick();
    if (widget.sound != null) SoundService.instance.play(widget.sound!);
    widget.onTap?.call();
  }

  void _cancel() {
    if (_enabled) _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: widget.onTap != null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: _down,
        onTapUp: _up,
        onTapCancel: _cancel,
        onLongPress: widget.onLongPress,
        child: ScaleTransition(scale: _scale, child: widget.child),
      ),
    );
  }
}
