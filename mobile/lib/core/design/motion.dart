import 'package:flutter/animation.dart';
import 'package:flutter/widgets.dart';

/// The app's motion vocabulary. Every animation should pick its duration and
/// curve from here so the whole app moves with one rhythm.
class Motion {
  Motion._();

  static const Duration press = Duration(milliseconds: 120);
  static const Duration quick = Duration(milliseconds: 220);
  static const Duration screen = Duration(milliseconds: 360);
  static const Duration signature = Duration(milliseconds: 600);

  static const Curve standard = Curves.easeOutCubic;
  static const Curve emphasized = Cubic(0.2, 0.0, 0.0, 1.0);
  static const Curve exit = Curves.easeInCubic;
  static const Curve pop = Curves.easeOutBack;

  /// Used as a `reverseCurve`: dips below zero near the end, so a pressed
  /// element springs slightly past its resting size on release.
  static const Curve springBack = Curves.easeInBack;

  /// True when the OS "remove animations" accessibility setting is on.
  static bool reduced(BuildContext context) =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;

  static Duration of(BuildContext context, Duration d) =>
      reduced(context) ? Duration.zero : d;

  static Duration stagger(int index, {int stepMs = 60, int baseMs = 0}) =>
      Duration(milliseconds: baseMs + index * stepMs);
}
